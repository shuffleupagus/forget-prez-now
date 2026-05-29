/* AIN'T NEVER GONNA FORGET PRESIDENTS NOW — app logic
   Quiz progresses in groups of 3. Get 3 focus-group questions right IN A ROW
   to master that group and unlock the next three. Mastered groups are
   de-emphasized but resurface occasionally as "mastery checks". */
(function () {
  "use strict";
  var P = window.PRESIDENTS;
  var PA = window.PixelArt;
  var KEY = "anfgpn.v1";
  var GROUP_SIZE = 3;
  var REVIEW_CHANCE = 0.22;   // fraction of questions pulled from mastered groups
  var TO_MASTER = 3;          // correct-in-a-row needed to master the focus group

  /* ---------- groups ---------- */
  var GROUPS = [];
  for (var gi = 0; gi < P.length; gi += GROUP_SIZE) GROUPS.push(P.slice(gi, gi + GROUP_SIZE).map(function (p) { return p.n; }));
  function groupOf(n) { return Math.floor((n - 1) / GROUP_SIZE); }
  function groupLabel(idx) { var a = GROUPS[idx]; return "#" + a[0] + (a.length > 1 ? "–#" + a[a.length - 1] : ""); }

  /* ---------- state ---------- */
  var state = load();
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY));
      if (s && typeof s.masteredGroups === "number") return s;
    } catch (e) {}
    return { masteredGroups: 0, focusStreak: 0, xp: 0, streak: 0, best: 0 };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  function isMastered(n) { return groupOf(n) < state.masteredGroups; }
  function isFocus(n) { return groupOf(n) === state.masteredGroups && state.masteredGroups < GROUPS.length; }
  function masteredCount() { return P.filter(function (p) { return isMastered(p.n); }).length; }

  /* ---------- helpers ---------- */
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0; var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pick(a) { return a[(Math.random() * a.length) | 0]; }
  function termText(p) { return p.start + (p.start === p.end ? "" : "–" + p.end); }
  function byNum(n) { for (var i = 0; i < P.length; i++) if (P[i].n === n) return P[i]; return null; }

  function portraitCanvas(p, px) {
    var c = el("canvas"); c.width = px; c.height = px; c.className = "portrait";
    PA.render(c, PA.buildPortrait(p.recipe), {});
    return c;
  }
  function propCanvas(p, px) {
    var c = el("canvas"); c.width = px; c.height = px; c.className = "prop";
    var g = PA.propGrid(p.prop); if (g) PA.render(c, g, {});
    return c;
  }

  /* ---------- routing ---------- */
  var screens = {};
  function show(name, arg) {
    Object.keys(screens).forEach(function (k) { screens[k].classList.remove("active"); });
    screens[name].classList.add("active");
    if (name === "home") renderHome();
    if (name === "dex") renderDex();
    if (name === "detail") renderDetail(arg);
    if (name === "quiz") startQuiz();
    if (name === "timeline") renderTimeline();
    $("#topbar").classList.toggle("hide-back", name === "home");
    window.scrollTo(0, 0);
  }

  /* ---------- HOME ---------- */
  function renderHome() {
    var m = masteredCount();
    $("#home-progress").textContent = m + " / " + P.length + " presidents committed to memory";
    $("#home-bar-fill").style.width = Math.round((m / P.length) * 100) + "%";
    $("#home-xp").textContent = "Groups mastered " + state.masteredGroups + "/" + GROUPS.length + "   •   XP " + state.xp + "   •   Best streak " + state.best;
  }

  /* ---------- PREZ-DEX ---------- */
  function renderDex() {
    var grid = $("#dex-grid"); grid.innerHTML = "";
    P.forEach(function (p) {
      var card = el("button", "dex-card" + (isFocus(p.n) ? " focus" : ""));
      card.appendChild(el("span", "dex-num", "#" + p.n));
      card.appendChild(portraitCanvas(p, 96));
      card.appendChild(el("span", "dex-name", p.short));
      card.appendChild(el("span", "dex-year", termText(p)));
      if (isMastered(p.n)) card.appendChild(el("span", "dex-check", "★"));
      card.addEventListener("click", function () { show("detail", p.n); });
      grid.appendChild(card);
    });
  }

  /* ---------- DETAIL ---------- */
  function renderDetail(n) {
    var p = byNum(n) || P[0];
    var box = $("#detail-body"); box.innerHTML = "";
    var head = el("div", "detail-head"); head.appendChild(portraitCanvas(p, 200)); box.appendChild(head);
    box.appendChild(el("div", "detail-num", "PRESIDENT #" + p.n));
    box.appendChild(el("h2", "detail-name", p.name));
    var meta = el("div", "detail-meta");
    meta.appendChild(el("span", "chip", "Term  " + termText(p)));
    meta.appendChild(el("span", "chip", p.party));
    box.appendChild(meta);
    var fact = el("div", "fact-card");
    fact.appendChild(propCanvas(p, 88));
    var ftxt = el("div", "fact-text");
    ftxt.appendChild(el("div", "fact-label", "FUN FACT"));
    ftxt.appendChild(el("div", "fact-body", p.fact));
    fact.appendChild(ftxt); box.appendChild(fact);
    if (isMastered(p.n)) box.appendChild(el("div", "learned-badge", "★  COMMITTED TO MEMORY"));
    else if (isFocus(p.n)) box.appendChild(el("div", "learning-badge", "● IN THE SPOTLIGHT NOW"));
    var nav = el("div", "detail-nav");
    var prev = el("button", "mc-btn small", "◀ PREV"); var next = el("button", "mc-btn small", "NEXT ▶");
    prev.disabled = p.n <= 1; next.disabled = p.n >= P.length;
    prev.addEventListener("click", function () { show("detail", p.n - 1); });
    next.addEventListener("click", function () { show("detail", p.n + 1); });
    nav.appendChild(prev); nav.appendChild(next); box.appendChild(nav);
  }

  /* ---------- QUIZ ---------- */
  var quizCur = null;

  function distractorsFor(ans, poolNums) {
    function ok(x) { return x.n !== ans.n && x.short !== ans.short && x.start !== ans.start; }
    var inPool = shuffle(P.filter(function (x) { return poolNums.indexOf(x.n) !== -1 && ok(x); }));
    var rest = shuffle(P.filter(function (x) { return poolNums.indexOf(x.n) === -1 && ok(x); }));
    var out = inPool.slice(0, 3);
    if (out.length < 3) out = out.concat(rest.slice(0, 3 - out.length));
    return out;
  }

  function makeQuestion() {
    var k = state.masteredGroups, total = GROUPS.length;
    var focusAvailable = k < total;
    var review, groupIdx;
    if (focusAvailable && (k === 0 || Math.random() >= REVIEW_CHANCE)) { groupIdx = k; review = false; }
    else if (k > 0) { groupIdx = (Math.random() * k) | 0; review = true; }
    else { groupIdx = k; review = false; }

    var ans = byNum(pick(GROUPS[groupIdx]));
    var poolNums = [];
    for (var i = 0; i <= Math.min(k, total - 1); i++) poolNums = poolNums.concat(GROUPS[i]);
    var distract = distractorsFor(ans, poolNums);

    var type = pick(["numToName", "nameToNum", "nameToYears", "yearsToName", "factToName", "propToName"]);
    var prompt, render = null, optLabel;
    if (type === "numToName") { prompt = "Who was President #" + ans.n + "?"; optLabel = function (x) { return x.short; }; }
    else if (type === "nameToNum") { prompt = "What number president was " + ans.name + "?"; optLabel = function (x) { return "#" + x.n; }; }
    else if (type === "nameToYears") { prompt = "When did " + ans.name + " serve?"; optLabel = function (x) { return termText(x); }; }
    else if (type === "yearsToName") { prompt = "Who served " + termText(ans) + "?"; optLabel = function (x) { return x.short; }; }
    else if (type === "factToName") { prompt = "Whose fun fact is this?\n“" + ans.fact + "”"; optLabel = function (x) { return x.short; }; }
    else { prompt = "This clue belongs to which president?"; render = ans; optLabel = function (x) { return x.short; }; }

    return { ans: ans, choices: shuffle(distract.concat([ans])), optLabel: optLabel, prompt: prompt, render: render, isReview: review, groupIdx: groupIdx };
  }

  function renderQuizHeader() {
    var k = state.masteredGroups, total = GROUPS.length;
    var label = $("#quiz-group"), pips = $("#quiz-pips");
    pips.innerHTML = "";
    if (k >= total) {
      label.textContent = "★ ENCORE — ALL 47 LEARNED · REVIEW ★";
    } else {
      label.textContent = "NOW LEARNING  " + groupLabel(k);
      for (var i = 0; i < TO_MASTER; i++) pips.appendChild(el("span", "pip" + (i < state.focusStreak ? " on" : "")));
    }
    $("#quiz-score").textContent = "Streak " + state.streak;
  }

  function startQuiz() { renderQuizHeader(); nextQuestion(); }

  function nextQuestion() {
    quizCur = makeQuestion();
    var q = quizCur;
    var tag = $("#quiz-tag");
    if (q.isReview) { tag.textContent = "★ MASTERY CHECK · " + groupLabel(q.groupIdx); tag.className = "quiz-tag review"; }
    else { tag.textContent = "NEW MATERIAL"; tag.className = "quiz-tag new"; }
    $("#quiz-prompt").textContent = q.prompt;
    var iconWrap = $("#quiz-icon"); iconWrap.innerHTML = "";
    if (q.render) iconWrap.appendChild(propCanvas(q.render, 110));
    var opts = $("#quiz-options"); opts.innerHTML = ""; opts.classList.remove("answered");
    q.choices.forEach(function (x) {
      var b = el("button", "mc-btn option", q.optLabel(x));
      b.dataset.n = x.n;
      b.addEventListener("click", function () { answer(b, x); });
      opts.appendChild(b);
    });
    var fb = $("#quiz-feedback"); fb.textContent = ""; fb.className = "quiz-feedback";
    $("#quiz-next").style.display = "none";
  }

  function answer(btn, chosen) {
    var opts = $("#quiz-options");
    if (opts.classList.contains("answered")) return;
    opts.classList.add("answered");
    Array.prototype.forEach.call(opts.children, function (b) { b.disabled = true; });
    var q = quizCur, correct = chosen.n === q.ans.n, fb = $("#quiz-feedback");

    if (correct) {
      btn.classList.add("correct");
      state.xp += 10; state.streak += 1; if (state.streak > state.best) state.best = state.streak;
      if (!q.isReview) {
        state.focusStreak += 1;
        if (state.focusStreak >= TO_MASTER && state.masteredGroups < GROUPS.length) {
          var idx = state.masteredGroups;
          state.masteredGroups += 1; state.focusStreak = 0;
          masterToast(idx);
          fb.textContent = "★ GROUP MASTERED!  +10 XP";
        } else {
          fb.textContent = "✔ Correct!  +10 XP   (" + state.focusStreak + "/" + TO_MASTER + " in a row)";
        }
      } else {
        fb.textContent = "✔ Still got it!  +10 XP";
      }
      fb.className = "quiz-feedback good";
    } else {
      btn.classList.add("wrong");
      state.streak = 0;
      if (!q.isReview) state.focusStreak = 0;
      Array.prototype.forEach.call(opts.children, function (b) {
        if (Number(b.dataset.n) === q.ans.n) b.classList.add("correct");
      });
      fb.textContent = "✘ It was " + q.ans.short + " (#" + q.ans.n + ", " + termText(q.ans) + ")";
      fb.className = "quiz-feedback bad";
    }
    save();
    renderQuizHeader();
    $("#quiz-next").style.display = "block";
  }

  /* ---------- playbill toast ---------- */
  function masterToast(idx) {
    var t = $("#toast"); t.innerHTML = "";
    var nums = GROUPS[idx];
    var col = el("div", "toast-portraits");
    nums.forEach(function (n) { col.appendChild(portraitCanvas(byNum(n), 36)); });
    t.appendChild(col);
    var txt = el("div", "toast-txt");
    txt.appendChild(el("div", "toast-title", "★ ENCORE! ★"));
    txt.appendChild(el("div", "toast-sub", "Mastered " + groupLabel(idx) + " — three more take the stage!"));
    t.appendChild(txt);
    t.classList.add("show"); clearTimeout(t._tmr);
    t._tmr = setTimeout(function () { t.classList.remove("show"); }, 3000);
  }

  /* ---------- TIMELINE ---------- */
  function renderTimeline() {
    var rail = $("#timeline-rail"); rail.innerHTML = "";
    $("#timeline-count").textContent = masteredCount() + " / " + P.length + " on the stage";
    P.forEach(function (p) {
      var cls = isMastered(p.n) ? " on" : (isFocus(p.n) ? " now" : " off");
      var node = el("div", "tl-node" + cls);
      node.appendChild(el("div", "tl-year", p.start));
      var dot = el("div", "tl-dot");
      if (isMastered(p.n) || isFocus(p.n)) dot.appendChild(portraitCanvas(p, 64));
      else dot.appendChild(el("span", "tl-lock", "?"));
      node.appendChild(dot);
      node.appendChild(el("div", "tl-num", "#" + p.n));
      node.appendChild(el("div", "tl-name", (isMastered(p.n) || isFocus(p.n)) ? p.short : "???"));
      if (isMastered(p.n) || isFocus(p.n)) node.addEventListener("click", function () { show("detail", p.n); });
      rail.appendChild(node);
    });
  }

  /* ---------- wire up ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    screens = {
      home: $("#screen-home"), dex: $("#screen-dex"), detail: $("#screen-detail"),
      quiz: $("#screen-quiz"), timeline: $("#screen-timeline")
    };
    $("#btn-play").addEventListener("click", function () { show("quiz"); });
    $("#btn-dex").addEventListener("click", function () { show("dex"); });
    $("#btn-timeline").addEventListener("click", function () { show("timeline"); });
    $("#btn-back").addEventListener("click", function () { show("home"); });
    $("#quiz-next").addEventListener("click", nextQuestion);
    var reset = $("#btn-reset");
    if (reset) reset.addEventListener("click", function () {
      if (confirm("Reset all progress and start from the top of the show?")) {
        state = { masteredGroups: 0, focusStreak: 0, xp: 0, streak: 0, best: 0 }; save(); renderHome();
      }
    });
    show("home");
    if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    }
  });
})();
