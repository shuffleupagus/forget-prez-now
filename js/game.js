/* MONUMENT ROW — game logic
   Core loop: a president card is dealt (no dates shown). Tap the gap in the
   growing row where he belongs. Correct -> his monument is built on the Mall.
   Two misses -> auto-placed (bronze) with a proper introduction, and he's
   re-dealt at the end of the round until earned.
   Tiers: gold = first try unaided, silver = retry or hint, bronze = shown.
*/
(function () {
  "use strict";
  var P = window.PRESIDENTS, ERAS = window.ERAS, ROUNDS = window.ROUNDS, PA = window.PixelArt;
  var KEY = "monrow.v1";

  function byNum(n) { for (var i = 0; i < P.length; i++) if (P[i].n === n) return P[i]; return null; }
  function eraOf(n) { for (var i = 0; i < ERAS.length; i++) if (n >= ERAS[i].from && n <= ERAS[i].to) return ERAS[i]; return ERAS[0]; }
  function eraIdx(n) { for (var i = 0; i < ERAS.length; i++) if (n >= ERAS[i].from && n <= ERAS[i].to) return i; return 0; }
  function termText(p) { return p.start + (p.start === p.end ? "" : "–" + p.end); }

  /* ---------- state ---------- */
  function freshState() {
    return {
      placed: [1], quality: { 1: "gold" },
      roundIdx: 0, queue: null, dealt: null, tries: 0, hint: false, shaky: [],
      xp: 0, streak: 0, best: 0, sound: true, complete: false,
      gapBest: 0, swapBest: 0
    };
  }
  var state = load();
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.placed && s.quality) return s;
    } catch (e) {}
    return freshState();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  /* ---------- helpers ---------- */
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0; var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pick(a) { return a[(Math.random() * a.length) | 0]; }

  function canvasOf(g, px, cls) {
    var c = el("canvas", cls || "");
    c.width = px; c.height = Math.round(px * g.length / g[0].length);
    PA.render(c, g);
    return c;
  }
  function portraitCanvas(p, px) { return canvasOf(PA.buildPortrait(p.recipe), px, "portrait"); }

  /* monument cell: building canvas + portrait overlaid on the plaque */
  function monumentCell(p, tier, scalePx) {
    var wrap = el("div", "monu");
    var mc = el("canvas", "monu-c");
    mc.width = scalePx * 18; mc.height = scalePx * 22;
    PA.render(mc, PA.buildMonument(eraOf(p.n).style, tier));
    wrap.appendChild(mc);
    var pc = portraitCanvas(p, scalePx * 6);
    pc.className = "monu-face";
    pc.style.left = (scalePx * 6) + "px";
    pc.style.top = (scalePx * 10) + "px";
    wrap.appendChild(pc);
    return wrap;
  }

  function rankTitle(count) {
    if (count >= 47) return "Master Builder";
    if (count >= 40) return "Architect";
    if (count >= 32) return "Foreman";
    if (count >= 24) return "Sculptor";
    if (count >= 16) return "Mason";
    if (count >= 8) return "Stonecutter";
    return "Apprentice";
  }

  /* ---------- sound ---------- */
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
    g.gain.exponentialRampToValueAtTime(vol || 0.11, ctx.currentTime + when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(ctx.currentTime + when); o.stop(ctx.currentTime + when + dur + 0.05);
  }
  function sndPlace() { tone(587, 0, 0.08, 0.1); tone(880, 0.08, 0.12, 0.1); }
  function sndWrong() { tone(180, 0, 0.18, 0.09, "sawtooth"); }
  function sndFanfare() { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.11, 0.16, 0.12); }); tone(1319, 0.46, 0.3, 0.1); }
  function sndTick() { tone(740, 0, 0.05, 0.07); }

  /* ---------- confetti ---------- */
  function confetti(n) {
    var box = $("#confetti");
    for (var i = 0; i < (n || 26); i++) {
      var s = el("span", "cf", "★");
      s.style.left = (Math.random() * 100) + "vw";
      s.style.animationDelay = (Math.random() * 0.5) + "s";
      s.style.animationDuration = (1.4 + Math.random() * 1.2) + "s";
      s.style.fontSize = (12 + Math.random() * 16) + "px";
      s.style.color = pick(["#d4af4f", "#b03a48", "#3a6ea5", "#f2efe6"]);
      box.appendChild(s);
    }
    setTimeout(function () { box.innerHTML = ""; }, 3200);
  }

  /* ---------- routing ---------- */
  var screens = {}, dealTimer = null;
  function show(name) {
    clearTimeout(dealTimer);
    Object.keys(screens).forEach(function (k) { screens[k].classList.remove("active"); });
    screens[name].classList.add("active");
    closeModal(); closeBanner();
    if (name === "home") renderHome();
    if (name === "game") enterGame();
    if (name === "mall") renderMall();
    if (name === "gap") startGap();
    if (name === "swap") startSwap();
    $("#topbar").classList.toggle("hide-back", name === "home");
    window.scrollTo(0, 0);
  }

  /* ---------- HOME ---------- */
  function renderHome() {
    var count = state.placed.length;
    $("#home-count").textContent = count + " / 47 monuments built";
    $("#home-bar-fill").style.width = Math.round((count / 47) * 100) + "%";
    $("#home-rank").textContent = "🏛 " + rankTitle(count);
    $("#home-xp").textContent = "XP " + state.xp + " • Best gold streak " + state.best;
    $("#btn-play").textContent = state.complete ? "⭯ REBUILD (NEW GAME)" : (count > 1 ? "▶ CONTINUE BUILDING" : "▶ START BUILDING");
    var locked = !state.complete;
    $("#btn-gap").disabled = locked; $("#btn-swap").disabled = locked;
    $("#challenge-note").textContent = locked ? "Finish the Row to unlock challenges" :
      "Gap Master best: " + state.gapBest + "/10 · Swap Patrol best: " + state.swapBest + "/8";
  }

  /* ---------- GAME ---------- */
  function enterGame() {
    if (state.complete) {
      if (confirm("The Row is complete! Start a brand-new build?")) { state = freshState(); save(); }
      else { show("home"); return; }
    }
    if (!state.queue && state.dealt == null) startRound();
    else renderGame();
  }

  function startRound() {
    if (state.roundIdx >= ROUNDS.length) { finishGame(); return; }
    var r = ROUNDS[state.roundIdx];
    var remaining = r.nums.filter(function (n) { return state.placed.indexOf(n) === -1; });
    state.queue = shuffle(remaining);
    save();
    banner("WING " + (state.roundIdx + 1) + " OF " + ROUNDS.length, r.title,
      state.queue.length + " presidents to place", "LET'S BUILD ▶", function () {
        deal();
      });
    renderGame();
  }

  function deal() {
    clearTimeout(dealTimer);
    if (state.dealt == null) {
      if (state.queue && state.queue.length) {
        state.dealt = state.queue.shift();
      } else if (state.shaky.length) {
        banner("POLISH ROUND", ROUNDS[state.roundIdx].title,
          state.shaky.length + " shaky placements to re-earn", "GO ▶", null);
        state.queue = shuffle(state.shaky); state.shaky = [];
        state.dealt = state.queue.shift();
      } else {
        roundComplete(); return;
      }
      state.tries = 0; state.hint = false;
    }
    save();
    renderGame();
  }

  function roundComplete() {
    state.queue = null; state.dealt = null; save();
    var isLast = state.roundIdx + 1 >= ROUNDS.length;
    sndFanfare(); confetti();
    if (isLast) { finishGame(); return; }
    var r = ROUNDS[state.roundIdx];
    state.roundIdx += 1; save();
    banner("WING COMPLETE ★", r.title + " — done!",
      state.placed.length + " / 47 monuments stand on the Row", "NEXT WING ▶", function () {
        startRound();
      });
  }

  function finishGame() {
    state.complete = true; state.queue = null; state.dealt = null; save();
    confetti(60); sndFanfare();
    banner("★ MONUMENT ROW COMPLETE ★", "All 47 presidents stand in order.",
      "Rank earned: Master Builder — challenges unlocked!", "VISIT THE MALL ▶", function () {
        show("mall");
      });
    renderGame();
  }

  function renderGame() {
    var count = state.placed.length;
    $("#game-progress").textContent = count + " / 47";
    $("#game-round").textContent = state.roundIdx < ROUNDS.length ? ("WING " + (state.roundIdx + 1) + ": " + ROUNDS[state.roundIdx].title) : "COMPLETE";
    $("#game-streak").textContent = "⚡" + state.streak;

    // dealt card
    var cardBox = $("#deal-card"); cardBox.innerHTML = "";
    var fb = $("#game-feedback");
    if (state.dealt != null) {
      var p = byNum(state.dealt);
      var card = el("div", "pcard");
      card.dataset.n = p.n;
      card.appendChild(portraitCanvas(p, 92));
      var info = el("div", "pcard-info");
      info.appendChild(el("div", "pcard-name", p.name));
      info.appendChild(el("div", "pcard-nick", "“" + p.nick + "”"));
      if (p.second) info.appendChild(el("div", "pcard-second", "⚠ HIS 2nd, SEPARATE TERM"));
      var hintRow = el("div", "pcard-hintrow");
      var hintBtn = el("button", "mr-btn tiny", "💡 ERA HINT");
      var hintOut = el("span", "pcard-hint");
      if (state.hint) { hintOut.textContent = eraOf(p.n).name + " · " + eraOf(p.n).span; hintBtn.disabled = true; }
      hintBtn.addEventListener("click", function () {
        state.hint = true; save(); sndTick();
        hintOut.textContent = eraOf(p.n).name + " · " + eraOf(p.n).span;
        hintBtn.disabled = true;
      });
      hintRow.appendChild(hintBtn); hintRow.appendChild(hintOut);
      info.appendChild(hintRow);
      card.appendChild(info);
      cardBox.appendChild(card);
      $("#game-ask").textContent = "Where does he go? Tap a slot below.";
    } else {
      $("#game-ask").textContent = state.complete ? "The Row is complete!" : "";
    }
    fb.textContent = ""; fb.className = "game-feedback";

    renderRow();
  }

  function renderRow() {
    var row = $("#row-strip"); row.innerHTML = "";
    var placing = state.dealt != null;
    function gapBtn(idx) {
      var b = el("button", "gap", "▲");
      b.dataset.gap = idx;
      if (!placing) b.disabled = true;
      b.addEventListener("click", function () { onGap(idx, b); });
      return b;
    }
    row.appendChild(gapBtn(0));
    state.placed.forEach(function (n, i) {
      var p = byNum(n);
      var chip = el("div", "chip era" + eraIdx(n) + " q-" + (state.quality[n] || "gold"));
      chip.dataset.n = n;
      chip.appendChild(portraitCanvas(p, 34));
      chip.appendChild(el("span", "chip-year", String(p.start)));
      chip.addEventListener("click", function () { factModal(p, "ON THE ROW — #" + p.n); });
      row.appendChild(chip);
      row.appendChild(gapBtn(i + 1));
    });
  }

  function onGap(g, btn) {
    if (state.dealt == null) return;
    var d = state.dealt;
    var idx = state.placed.filter(function (n) { return n < d; }).length;
    var fb = $("#game-feedback");
    if (g === idx) {
      var tier = state.tries > 0 || state.hint ? "silver" : "gold";
      placeDealt(tier);
    } else {
      state.tries += 1; sndWrong();
      btn.classList.add("dead"); btn.disabled = true;
      var dir = g < idx ? "LATER →" : "← EARLIER";
      fb.textContent = "✘ Not there — he comes " + dir;
      fb.className = "game-feedback bad";
      if (state.tries >= 2) {
        // reveal: auto-place as bronze, teach, re-deal later
        var p = byNum(d);
        state.placed.splice(idx, 0, d);
        state.quality[d] = "bronze";
        if (state.shaky.indexOf(d) === -1) state.shaky.push(d);
        state.streak = 0;
        state.dealt = null; save();
        renderGame();
        flashChip(d);
        factModal(p, "MEET HIM PROPERLY — #" + p.n, function () { deal(); });
      } else {
        save();
      }
    }
  }

  function placeDealt(tier) {
    var d = state.dealt, p = byNum(d);
    var idx = state.placed.filter(function (n) { return n < d; }).length;
    state.placed.splice(idx, 0, d);
    // re-earned shaky cards upgrade to silver at best
    var prev = state.quality[d];
    state.quality[d] = prev === "bronze" ? "silver" : tier;
    state.xp += tier === "gold" ? 20 : 10;
    if (tier === "gold") { state.streak += 1; if (state.streak > state.best) state.best = state.streak; }
    else state.streak = 0;
    state.dealt = null;
    save();
    sndPlace();
    renderGame();
    flashChip(d);
    var fb = $("#game-feedback");
    fb.textContent = (tier === "gold" ? "★ GOLD! " : "✔ ") + "#" + p.n + " · " + termText(p) + " — monument built!";
    fb.className = "game-feedback good";
    dealTimer = setTimeout(deal, 950);
  }

  function flashChip(n) {
    var chip = $('#row-strip .chip[data-n="' + n + '"]');
    if (!chip) return;
    chip.classList.add("flash");
    chip.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    setTimeout(function () { chip.classList.remove("flash"); }, 1200);
  }

  /* ---------- MALL ---------- */
  function renderMall() {
    var count = state.placed.length;
    $("#mall-count").textContent = count + " / 47 monuments · " + rankTitle(count);
    var rail = $("#mall-rail"); rail.innerHTML = "";
    ERAS.forEach(function (era, ei) {
      var sec = el("div", "mall-era");
      var head = el("div", "mall-era-head");
      head.appendChild(el("span", "mall-era-name", era.name));
      head.appendChild(el("span", "mall-era-span", era.span));
      sec.appendChild(head);
      var strip = el("div", "mall-strip");
      for (var n = era.from; n <= era.to; n++) {
        (function (p) {
          var placedIdx = state.placed.indexOf(p.n);
          var cell = el("div", "mall-cell");
          if (placedIdx !== -1) {
            cell.appendChild(monumentCell(p, state.quality[p.n] || "gold", 4));
            cell.appendChild(el("div", "mall-num", "#" + p.n));
            cell.appendChild(el("div", "mall-name", p.short));
            cell.appendChild(el("div", "mall-year", termText(p)));
            cell.addEventListener("click", function () { factModal(p, "MONUMENT #" + p.n); });
          } else {
            var lc = el("div", "monu");
            lc.appendChild(canvasOf(PA.buildLocked(), 72, "monu-c"));
            cell.appendChild(lc);
            cell.appendChild(el("div", "mall-num", "#" + p.n));
            cell.appendChild(el("div", "mall-name locked", "— ? —"));
            cell.classList.add("locked");
          }
          strip.appendChild(cell);
        })(byNum(n));
      }
      sec.appendChild(strip);
      rail.appendChild(sec);
    });
  }

  /* ---------- GAP MASTER (challenge) ---------- */
  var gap = null;
  function startGap() {
    gap = { round: 0, score: 0, target: null };
    nextGap();
  }
  function nextGap() {
    if (gap.round >= 10) {
      if (gap.score > state.gapBest) state.gapBest = gap.score;
      save();
      banner("GAP MASTER", "Score: " + gap.score + " / 10",
        gap.score >= 8 ? "Sharp eye, Master Builder!" : "The Row remembers — try again!",
        "DONE ▶", function () { show("home"); });
      return;
    }
    gap.round += 1;
    gap.target = pick(state.placed.filter(function (n) { return n !== 1; }));
    var t = byNum(gap.target);
    $("#gap-round").textContent = "ROUND " + gap.round + " / 10 · SCORE " + gap.score;
    // strip with the target hidden
    var row = $("#gap-strip"); row.innerHTML = "";
    state.placed.forEach(function (n) {
      var p = byNum(n);
      var chip;
      if (n === gap.target) {
        chip = el("div", "chip mystery"); chip.dataset.n = n;
        chip.appendChild(el("span", "chip-q", "?"));
        chip.appendChild(el("span", "chip-year", String(p.start)));
      } else {
        chip = el("div", "chip era" + eraIdx(n));
        chip.appendChild(portraitCanvas(p, 34));
        chip.appendChild(el("span", "chip-year", String(p.start)));
      }
      row.appendChild(chip);
    });
    var mystery = $("#gap-strip .mystery");
    if (mystery) setTimeout(function () { mystery.scrollIntoView({ block: "nearest", inline: "center" }); }, 50);
    // options: target + 3 nearby
    var nears = state.placed.filter(function (n) { return n !== gap.target && Math.abs(n - gap.target) <= 6; });
    var opts = shuffle([gap.target].concat(shuffle(nears).slice(0, 3)));
    var box = $("#gap-options"); box.innerHTML = "";
    opts.forEach(function (n) {
      var p = byNum(n);
      var b = el("button", "mr-btn option", p.short + (p.second ? " (2nd term)" : ""));
      b.dataset.n = n;
      b.addEventListener("click", function () {
        if (n === gap.target) { gap.score += 1; sndPlace(); }
        else { sndWrong(); }
        var m = $("#gap-strip .mystery");
        if (m) { m.innerHTML = ""; m.appendChild(portraitCanvas(byNum(gap.target), 34)); m.appendChild(el("span", "chip-year", String(byNum(gap.target).start))); m.classList.add(n === gap.target ? "flash" : "was-wrong"); }
        setTimeout(nextGap, 800);
      });
      box.appendChild(b);
    });
  }

  /* ---------- SWAP PATROL (challenge) ---------- */
  var swap = null;
  function startSwap() {
    swap = { round: 0, score: 0 };
    nextSwap();
  }
  function nextSwap() {
    if (swap.round >= 8) {
      if (swap.score > state.swapBest) state.swapBest = swap.score;
      save();
      banner("SWAP PATROL", "Score: " + swap.score + " / 8",
        swap.score >= 6 ? "Nothing gets past you!" : "Keep patrolling the Row!",
        "DONE ▶", function () { show("home"); });
      return;
    }
    swap.round += 1;
    // pick a 7-wide window and swap one adjacent pair inside it
    var start = (Math.random() * (state.placed.length - 7)) | 0;
    var win = state.placed.slice(start, start + 7);
    var si = 1 + ((Math.random() * 5) | 0); // swap positions si-1, si within window (avoid edges)
    var disp = win.slice();
    var tmp = disp[si - 1]; disp[si - 1] = disp[si]; disp[si] = tmp;
    swap.pair = [disp[si - 1], disp[si]]; // the two wrong ones (president numbers)
    swap.selected = [];
    $("#swap-round").textContent = "ROUND " + swap.round + " / 8 · SCORE " + swap.score;
    $("#swap-ask").textContent = "Two neighbors got SWAPPED — tap both!";
    var row = $("#swap-strip"); row.innerHTML = "";
    disp.forEach(function (n) {
      var p = byNum(n);
      var chip = el("div", "chip big era" + eraIdx(n));
      chip.dataset.n = n;
      chip.appendChild(portraitCanvas(p, 44));
      chip.appendChild(el("span", "chip-name", p.short));
      chip.addEventListener("click", function () {
        if (swap.selected.indexOf(n) !== -1) return;
        swap.selected.push(n); chip.classList.add("sel"); sndTick();
        if (swap.selected.length === 2) {
          var ok = swap.selected.indexOf(swap.pair[0]) !== -1 && swap.selected.indexOf(swap.pair[1]) !== -1;
          if (ok) { swap.score += 1; sndPlace(); } else { sndWrong(); }
          // reveal correct order
          [].forEach.call(row.children, function (c) {
            if (swap.pair.indexOf(Number(c.dataset.n)) !== -1) c.classList.add(ok ? "flash" : "was-wrong");
          });
          setTimeout(nextSwap, 900);
        }
      });
      row.appendChild(chip);
    });
  }

  /* ---------- shared modal + banner ---------- */
  var modalCb = null;
  function factModal(p, title, cb) {
    modalCb = cb || null;
    $("#modal-title").textContent = title || ("#" + p.n);
    var body = $("#modal-body"); body.innerHTML = "";
    var top = el("div", "modal-top");
    top.appendChild(portraitCanvas(p, 92));
    var info = el("div", "modal-info");
    info.appendChild(el("div", "modal-num", "#" + p.n + " · " + termText(p) + " · " + p.party));
    info.appendChild(el("div", "modal-name", p.name));
    info.appendChild(el("div", "modal-nick", "“" + p.nick + "”"));
    top.appendChild(info);
    body.appendChild(top);
    var fact = el("div", "modal-fact");
    var pg = PA.propGrid(p.prop);
    if (pg) fact.appendChild(canvasOf(pg, 56, "prop"));
    fact.appendChild(el("div", "modal-fact-text", p.fact));
    body.appendChild(fact);
    $("#modal").classList.remove("hidden");
  }
  function closeModal() {
    $("#modal").classList.add("hidden");
    var cb = modalCb; modalCb = null;
    if (cb) cb();
  }

  var bannerCb = null;
  function banner(kicker, title, sub, btnText, cb) {
    bannerCb = cb || null;
    $("#banner-kicker").textContent = kicker;
    $("#banner-title").textContent = title;
    $("#banner-sub").textContent = sub;
    $("#banner-go").textContent = btnText || "GO ▶";
    $("#banner").classList.remove("hidden");
  }
  function closeBanner() { $("#banner").classList.add("hidden"); bannerCb = null; }

  /* ---------- wire up ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    screens = {
      home: $("#screen-home"), game: $("#screen-game"), mall: $("#screen-mall"),
      gap: $("#screen-gap"), swap: $("#screen-swap")
    };
    $("#btn-play").addEventListener("click", function () { ac(); show("game"); });
    $("#btn-mall").addEventListener("click", function () { show("mall"); });
    $("#btn-gap").addEventListener("click", function () { ac(); show("gap"); });
    $("#btn-swap").addEventListener("click", function () { ac(); show("swap"); });
    $("#btn-back").addEventListener("click", function () { show("home"); });
    $("#modal-close").addEventListener("click", closeModal);
    $("#banner-go").addEventListener("click", function () {
      var cb = bannerCb;
      closeBanner();
      if (cb) cb();
      else if (screens.game.classList.contains("active")) deal();
    });
    var snd = $("#btn-sound");
    function paintSound() { snd.textContent = state.sound ? "♪ ON" : "♪ OFF"; }
    snd.addEventListener("click", function () { state.sound = !state.sound; save(); paintSound(); });
    paintSound();
    $("#btn-reset").addEventListener("click", function () {
      if (confirm("Tear down the whole Row and start over?")) { state = freshState(); save(); renderHome(); }
    });
    show("home");
    if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0 &&
        location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    }
  });
})();
