/* AIN'T NEVER GONNA FORGET PRESIDENTS NOW — app logic (v2)

   Learning loop:
   - Presidents unlock in trios. New trio => "Now Taking the Stage" study
     cards BEFORE any questions.
   - 3 correct in a row about the focus trio masters it (confetti + fanfare)
     and brings on the next three.
   - Mastered trios resurface as weighted "Mastery Checks": trios you've
     missed recently, or haven't seen in a while, come up more often.
     Review questions never break your focus streak.
*/
(function () {
  "use strict";
  var P = window.PRESIDENTS, ERAS = window.ERAS, PA = window.PixelArt;
  var KEY = "anfgpn.v2", OLD_KEY = "anfgpn.v1";
  var GROUP_SIZE = 3, TO_MASTER = 3, REVIEW_CHANCE = 0.25;

  /* ---------- groups ---------- */
  var GROUPS = [];
  for (var gi = 0; gi < P.length; gi += GROUP_SIZE) {
    GROUPS.push(P.slice(gi, gi + GROUP_SIZE).map(function (p) { return p.n; }));
  }
  function groupOf(n) { return Math.floor((n - 1) / GROUP_SIZE); }
  function groupLabel(idx) {
    var a = GROUPS[idx];
    return "#" + a[0] + (a.length > 1 ? "–#" + a[a.length - 1] : "");
  }

  /* names that appear twice (Cleveland, Trump) — never ask by-name questions about them */
  var DUAL = {};
  (function () {
    var seen = {};
    P.forEach(function (p) { if (seen[p.short]) DUAL[p.short] = true; seen[p.short] = true; });
  })();

  /* ---------- state ---------- */
  function freshState() {
    return {
      masteredGroups: 0, focusStreak: 0, xp: 0, streak: 0, best: 0,
      qCount: 0, sound: true,
      introSeen: GROUPS.map(function () { return false; }),
      stats: GROUPS.map(function () { return { miss: 0, last: 0 }; })
    };
  }
  var state = load();
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.introSeen && s.stats) return s;
    } catch (e) {}
    // migrate from v1 (keep progress, show intro for the current trio)
    try {
      var o = JSON.parse(localStorage.getItem(OLD_KEY));
      if (o && typeof o.masteredGroups === "number") {
        var s2 = freshState();
        s2.masteredGroups = Math.min(o.masteredGroups, GROUPS.length);
        s2.xp = o.xp || 0; s2.best = o.best || 0;
        for (var i = 0; i < s2.masteredGroups; i++) s2.introSeen[i] = true;
        return s2;
      }
    } catch (e) {}
    return freshState();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  function isMastered(n) { return groupOf(n) < state.masteredGroups; }
  function isFocus(n) { return groupOf(n) === state.masteredGroups && state.masteredGroups < GROUPS.length; }
  function isKnown(n) { return isMastered(n) || isFocus(n); }
  function masteredCount() {
    var c = 0;
    for (var i = 0; i < state.masteredGroups; i++) c += GROUPS[i].length;
    return c;
  }
  function levelTitle(m) {
    if (m >= 16) return "Living Legend";
    if (m >= 13) return "Headliner";
    if (m >= 10) return "Star of the Show";
    if (m >= 7) return "Rising Star";
    if (m >= 4) return "Featured Player";
    if (m >= 1) return "Ensemble";
    return "Understudy";
  }

  /* ---------- helpers ---------- */
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0; var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pick(a) { return a[(Math.random() * a.length) | 0]; }
  function termText(p) { return p.start + (p.start === p.end ? "" : "–" + p.end); }
  function byNum(n) { for (var i = 0; i < P.length; i++) if (P[i].n === n) return P[i]; return null; }
  function eraOf(n) { for (var i = 0; i < ERAS.length; i++) if (n >= ERAS[i].from && n <= ERAS[i].to) return ERAS[i]; return null; }

  function portraitCanvas(p, px) {
    var c = el("canvas"); c.width = px; c.height = px; c.className = "portrait";
    PA.render(c, PA.buildPortrait(p.recipe));
    return c;
  }
  function propCanvas(p, px) {
    var c = el("canvas"); c.width = px; c.height = px; c.className = "prop";
    var g = PA.propGrid(p.prop); if (g) PA.render(c, g);
    return c;
  }

  /* ---------- sound (WebAudio, original blips) ---------- */
  var AC = null;
  function ac() {
    if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
    if (AC && AC.state === "suspended") AC.resume();
    return AC;
  }
  function tone(freq, when, dur, vol, type) {
    var ctx = ac(); if (!ctx || !state.sound) return;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || "square"; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ctx.currentTime + when);
    g.gain.exponentialRampToValueAtTime(vol || 0.12, ctx.currentTime + when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(ctx.currentTime + when); o.stop(ctx.currentTime + when + dur + 0.05);
  }
  function sndCorrect() { tone(660, 0, 0.09, 0.1); tone(880, 0.09, 0.14, 0.1); }
  function sndWrong() { tone(196, 0, 0.2, 0.09, "sawtooth"); }
  function sndFanfare() { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.11, 0.16, 0.12); }); tone(1319, 0.46, 0.3, 0.1); }

  /* ---------- confetti ---------- */
  function confetti() {
    var box = $("#confetti");
    for (var i = 0; i < 26; i++) {
      var s = el("span", "cf", "★");
      s.style.left = (Math.random() * 100) + "vw";
      s.style.animationDelay = (Math.random() * 0.5) + "s";
      s.style.animationDuration = (1.4 + Math.random() * 1.2) + "s";
      s.style.fontSize = (12 + Math.random() * 16) + "px";
      s.style.color = pick(["#d4af4f", "#ecd28a", "#a07c2c", "#f3ecda"]);
      box.appendChild(s);
    }
    setTimeout(function () { box.innerHTML = ""; }, 3200);
  }

  /* ---------- routing ---------- */
  var screens = {}, autoTimer = null;
  function show(name, arg) {
    clearTimeout(autoTimer);
    Object.keys(screens).forEach(function (k) { screens[k].classList.remove("active"); });
    screens[name].classList.add("active");
    hideIntro();
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
    $("#home-progress").textContent = m + " / " + P.length + " committed to memory";
    $("#home-bar-fill").style.width = Math.round((m / P.length) * 100) + "%";
    $("#home-level").textContent = "☆ " + levelTitle(state.masteredGroups) + " ☆";
    $("#home-xp").textContent = "XP " + state.xp + "   •   Best streak " + state.best;
    var strip = $("#stage-strip"); strip.innerHTML = "";
    var k = state.masteredGroups;
    if (k >= GROUPS.length) {
      strip.appendChild(el("div", "stage-label", "★ ALL 47 MASTERED — ENCORE MODE ★"));
    } else {
      strip.appendChild(el("div", "stage-label", "NOW ON STAGE"));
      var row = el("div", "stage-row");
      GROUPS[k].forEach(function (n) {
        var p = byNum(n);
        var cell = el("div", "stage-cell");
        cell.appendChild(portraitCanvas(p, 72));
        cell.appendChild(el("div", "stage-name", "#" + p.n + " " + p.short));
        row.appendChild(cell);
      });
      strip.appendChild(row);
    }
  }

  /* ---------- PREZ-DEX ---------- */
  function renderDex() {
    var grid = $("#dex-grid"); grid.innerHTML = "";
    P.forEach(function (p) {
      var cls = "dex-card" + (isFocus(p.n) ? " focus" : "") + (isMastered(p.n) ? " done" : "");
      var card = el("button", cls);
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
    box.appendChild(el("div", "detail-nick", "“" + p.nick + "”"));
    var meta = el("div", "detail-meta");
    meta.appendChild(el("span", "chip", "Term  " + termText(p)));
    meta.appendChild(el("span", "chip", p.party));
    var era = eraOf(p.n);
    if (era) meta.appendChild(el("span", "chip era", era.name));
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

  /* ---------- INTRO OVERLAY ("Now Taking the Stage") ---------- */
  function showIntro(groupIdx) {
    var ov = $("#intro-overlay");
    $("#intro-cards").innerHTML = "";
    $("#intro-title").textContent = "NOW TAKING THE STAGE";
    $("#intro-sub").textContent = "Presidents " + groupLabel(groupIdx) + " — study up, then prove it!";
    GROUPS[groupIdx].forEach(function (n) {
      var p = byNum(n);
      var card = el("div", "intro-card");
      var top = el("div", "intro-top");
      top.appendChild(portraitCanvas(p, 96));
      var info = el("div", "intro-info");
      info.appendChild(el("div", "intro-num", "#" + p.n + " · " + termText(p)));
      info.appendChild(el("div", "intro-name", p.name));
      info.appendChild(el("div", "intro-nick", "“" + p.nick + "”"));
      top.appendChild(info);
      card.appendChild(top);
      card.appendChild(el("div", "intro-fact", p.fact));
      $("#intro-cards").appendChild(card);
    });
    ov.classList.remove("hidden");
    ov._group = groupIdx;
  }
  function hideIntro() { $("#intro-overlay").classList.add("hidden"); }

  /* ---------- QUIZ ---------- */
  var quizCur = null;

  function pool() { // all unlocked president numbers (mastered + focus)
    var out = [], lim = Math.min(state.masteredGroups, GROUPS.length - 1);
    for (var i = 0; i <= lim; i++) out = out.concat(GROUPS[i]);
    return out;
  }

  function pickDistinct(cands, usedLabels, labelFn, count) {
    var out = [];
    for (var i = 0; i < cands.length && out.length < count; i++) {
      var lb = labelFn(cands[i]);
      if (!usedLabels[lb]) { usedLabels[lb] = true; out.push(cands[i]); }
    }
    return out;
  }

  function distractorsFor(ans, poolNums, labelFn, count) {
    function ok(x) { return x.n !== ans.n; }
    var used = {}; used[labelFn(ans)] = true;
    var inPool = shuffle(P.filter(function (x) { return poolNums.indexOf(x.n) !== -1 && ok(x); }));
    var rest = shuffle(P.filter(function (x) { return poolNums.indexOf(x.n) === -1 && ok(x); }));
    var out = pickDistinct(inPool, used, labelFn, count);
    if (out.length < count) out = out.concat(pickDistinct(rest, used, labelFn, count - out.length));
    return out;
  }

  function pickReviewGroup() { // weighted by misses + staleness
    var weights = [], total = 0;
    for (var i = 0; i < state.masteredGroups; i++) {
      var st = state.stats[i];
      var stale = Math.min(state.qCount - (st.last || 0), 24);
      var w = (1 + 2 * st.miss) * (1 + stale / 8);
      weights.push(w); total += w;
    }
    var r = Math.random() * total;
    for (var j = 0; j < weights.length; j++) { r -= weights[j]; if (r <= 0) return j; }
    return state.masteredGroups - 1;
  }

  function makeQuestion() {
    var k = state.masteredGroups, total = GROUPS.length;
    var review, groupIdx;
    if (k >= total) { groupIdx = pickReviewGroup(); review = true; }                       // encore
    else if (k > 0 && Math.random() < REVIEW_CHANCE) { groupIdx = pickReviewGroup(); review = true; }
    else { groupIdx = k; review = false; }

    var ans = byNum(pick(GROUPS[groupIdx]));
    var poolNums = pool();
    state.qCount += 1;
    state.stats[groupIdx].last = state.qCount;

    var types = ["numToName", "portraitToName", "factToName", "propToName", "yearsToName", "nameToNum", "nameToYears"];
    if (!DUAL[ans.short]) { /* by-name questions stay in the list */ } else {
      types = ["numToName", "factToName", "propToName", "yearsToName", "portraitToName"];
    }
    var prev = byNum(ans.n - 1);
    if (prev && poolNums.indexOf(prev.n) !== -1 && !DUAL[prev.short]) types.push("afterWho");
    if (poolNums.length >= 3) types.push("whichFirst");
    var type = pick(types);

    var prompt, render = null, optLabel, choices;
    var nameL = function (x) { return x.short; };

    if (type === "whichFirst") {
      var cs = shuffle(poolNums.slice());
      var used = {}, picked = [];
      // bias: start from the answer group so the focus trio stays in play
      var seed = byNum(pick(GROUPS[groupIdx]));
      used[seed.short] = true; picked.push(seed);
      for (var i = 0; i < cs.length && picked.length < 3; i++) {
        var c = byNum(cs[i]);
        if (!used[c.short]) { used[c.short] = true; picked.push(c); }
      }
      ans = picked.reduce(function (a, b) { return a.n < b.n ? a : b; });
      prompt = "Which of these presidents served FIRST?";
      choices = shuffle(picked); optLabel = nameL;
    } else if (type === "afterWho") {
      prompt = "Who came right AFTER " + prev.name + " (#" + prev.n + ")?";
      choices = shuffle(distractorsFor(ans, poolNums, nameL, 3).concat([ans])); optLabel = nameL;
    } else if (type === "numToName") {
      prompt = "Who was President #" + ans.n + "?";
      choices = shuffle(distractorsFor(ans, poolNums, nameL, 3).concat([ans])); optLabel = nameL;
    } else if (type === "portraitToName") {
      prompt = "Take a look — who's on stage?";
      render = { kind: "portrait", p: ans };
      choices = shuffle(distractorsFor(ans, poolNums, nameL, 3).concat([ans])); optLabel = nameL;
    } else if (type === "nameToNum") {
      prompt = "What number president was " + ans.name + "?";
      optLabel = function (x) { return "#" + x.n; };
      choices = shuffle(distractorsFor(ans, poolNums, optLabel, 3).concat([ans]));
    } else if (type === "nameToYears") {
      prompt = "When did " + ans.name + " serve?";
      optLabel = function (x) { return termText(x); };
      choices = shuffle(distractorsFor(ans, poolNums, optLabel, 3).concat([ans]));
    } else if (type === "yearsToName") {
      prompt = "Who served " + termText(ans) + "?";
      choices = shuffle(distractorsFor(ans, poolNums, nameL, 3).concat([ans])); optLabel = nameL;
    } else if (type === "factToName") {
      prompt = "Whose fun fact is this?\n“" + ans.fact + "”";
      choices = shuffle(distractorsFor(ans, poolNums, nameL, 3).concat([ans])); optLabel = nameL;
    } else { // propToName
      prompt = "This clue belongs to which president?";
      render = { kind: "prop", p: ans };
      choices = shuffle(distractorsFor(ans, poolNums, nameL, 3).concat([ans])); optLabel = nameL;
    }
    return { ans: ans, choices: choices, optLabel: optLabel, prompt: prompt, render: render, isReview: review, groupIdx: groupIdx };
  }

  function renderQuizHeader() {
    var k = state.masteredGroups, total = GROUPS.length;
    var label = $("#quiz-group"), pips = $("#quiz-pips");
    pips.innerHTML = "";
    if (k >= total) {
      label.textContent = "★ ENCORE — ALL 47 · REVIEW ★";
    } else {
      label.textContent = "NOW LEARNING  " + groupLabel(k);
      for (var i = 0; i < TO_MASTER; i++) pips.appendChild(el("span", "pip" + (i < state.focusStreak ? " on" : "")));
    }
    $("#quiz-score").textContent = "Streak " + state.streak;
  }

  function startQuiz() {
    renderQuizHeader();
    var k = state.masteredGroups;
    if (k < GROUPS.length && !state.introSeen[k]) { showIntro(k); return; }
    nextQuestion();
  }

  function nextQuestion() {
    clearTimeout(autoTimer);
    var k = state.masteredGroups;
    if (k < GROUPS.length && !state.introSeen[k]) { showIntro(k); return; }
    quizCur = makeQuestion();
    save();
    var q = quizCur;
    var tag = $("#quiz-tag");
    if (q.isReview) { tag.textContent = "★ MASTERY CHECK · " + groupLabel(q.groupIdx); tag.className = "quiz-tag review"; }
    else { tag.textContent = "NEW MATERIAL"; tag.className = "quiz-tag new"; }
    $("#quiz-prompt").textContent = q.prompt;
    var iconWrap = $("#quiz-icon"); iconWrap.innerHTML = "";
    if (q.render) {
      iconWrap.appendChild(q.render.kind === "portrait" ? portraitCanvas(q.render.p, 110) : propCanvas(q.render.p, 110));
    }
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
    var mastered = false;

    if (correct) {
      btn.classList.add("correct");
      state.streak += 1; if (state.streak > state.best) state.best = state.streak;
      if (!q.isReview) {
        state.xp += 10;
        state.focusStreak += 1;
        if (state.focusStreak >= TO_MASTER && state.masteredGroups < GROUPS.length) {
          var idx = state.masteredGroups;
          state.masteredGroups += 1; state.focusStreak = 0;
          mastered = true;
          fb.textContent = "★ TRIO MASTERED! " + groupLabel(idx) + " joins the timeline!";
          sndFanfare(); confetti(); masterToast(idx);
        } else {
          fb.textContent = "✔ Correct!  +10 XP   (" + state.focusStreak + "/" + TO_MASTER + " in a row)";
          sndCorrect();
        }
      } else {
        state.xp += 5;
        state.stats[q.groupIdx].miss = Math.max(0, state.stats[q.groupIdx].miss - 1);
        fb.textContent = "✔ Still got it!  +5 XP";
        sndCorrect();
      }
      fb.className = "quiz-feedback good";
    } else {
      btn.classList.add("wrong");
      state.streak = 0;
      if (!q.isReview) state.focusStreak = 0;
      else state.stats[q.groupIdx].miss += 1;
      Array.prototype.forEach.call(opts.children, function (b) {
        if (Number(b.dataset.n) === q.ans.n) b.classList.add("correct");
      });
      fb.textContent = "✘ It was " + q.ans.short + " — #" + q.ans.n + ", " + termText(q.ans) + " (“" + q.ans.nick + "”)";
      fb.className = "quiz-feedback bad";
      sndWrong();
    }
    save();
    renderQuizHeader();
    $("#quiz-next").style.display = "block";
    if (correct) autoTimer = setTimeout(nextQuestion, mastered ? 2100 : 1150);
  }

  /* ---------- playbill toast ---------- */
  function masterToast(idx) {
    var t = $("#toast"); t.innerHTML = "";
    var col = el("div", "toast-portraits");
    GROUPS[idx].forEach(function (n) { col.appendChild(portraitCanvas(byNum(n), 36)); });
    t.appendChild(col);
    var txt = el("div", "toast-txt");
    txt.appendChild(el("div", "toast-title", "★ ENCORE! ★"));
    txt.appendChild(el("div", "toast-sub", "Mastered " + groupLabel(idx) + " — three more take the stage!"));
    t.appendChild(txt);
    t.classList.add("show"); clearTimeout(t._tmr);
    t._tmr = setTimeout(function () { t.classList.remove("show"); }, 3000);
  }

  /* ---------- TIMELINE (vertical, era-grouped) ---------- */
  function renderTimeline() {
    var rail = $("#timeline-rail"); rail.innerHTML = "";
    $("#timeline-count").textContent = masteredCount() + " / " + P.length + " on the stage";
    ERAS.forEach(function (era) {
      var head = el("div", "era-head");
      head.appendChild(el("span", "era-name", era.name));
      head.appendChild(el("span", "era-span", era.span));
      rail.appendChild(head);
      for (var n = era.from; n <= era.to; n++) {
        (function (p) {
          var st = isMastered(p.n) ? "on" : (isFocus(p.n) ? "now" : "off");
          var row = el("div", "tlv-row " + st);
          row.appendChild(el("div", "tlv-year", String(p.start)));
          var dot = el("div", "tlv-dot");
          if (st !== "off") dot.appendChild(portraitCanvas(p, 56));
          else dot.appendChild(el("span", "tlv-lock", "?"));
          row.appendChild(dot);
          var info = el("div", "tlv-info");
          info.appendChild(el("div", "tlv-num", "#" + p.n));
          info.appendChild(el("div", "tlv-name", st !== "off" ? p.short : "— ? —"));
          row.appendChild(info);
          if (st !== "off") row.addEventListener("click", function () { show("detail", p.n); });
          rail.appendChild(row);
        })(byNum(n));
      }
    });
  }

  /* ---------- wire up ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    screens = {
      home: $("#screen-home"), dex: $("#screen-dex"), detail: $("#screen-detail"),
      quiz: $("#screen-quiz"), timeline: $("#screen-timeline")
    };
    $("#btn-play").addEventListener("click", function () { ac(); show("quiz"); });
    $("#btn-dex").addEventListener("click", function () { show("dex"); });
    $("#btn-timeline").addEventListener("click", function () { show("timeline"); });
    $("#btn-back").addEventListener("click", function () { show("home"); });
    $("#quiz-next").addEventListener("click", nextQuestion);
    $("#intro-go").addEventListener("click", function () {
      var idx = $("#intro-overlay")._group;
      if (typeof idx === "number") state.introSeen[idx] = true;
      save(); hideIntro(); nextQuestion();
    });
    $("#btn-study").addEventListener("click", function () {
      var k = state.masteredGroups;
      if (k < GROUPS.length) showIntro(k);
    });
    var snd = $("#btn-sound");
    function paintSound() { snd.textContent = state.sound ? "♪ ON" : "♪ OFF"; }
    snd.addEventListener("click", function () { state.sound = !state.sound; save(); paintSound(); });
    paintSound();
    var reset = $("#btn-reset");
    if (reset) reset.addEventListener("click", function () {
      if (confirm("Reset all progress and start from the top of the show?")) {
        state = freshState(); save(); renderHome();
      }
    });
    show("home");
    // service worker: only when hosted (skip file:// and the local dev server)
    if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0 &&
        location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    }
  });
})();
