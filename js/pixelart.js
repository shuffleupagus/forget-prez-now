/* WES KNOW PREZ — pixel art engine
   Builds 16x16 blocky "Minecraft-style" president portraits from a recipe,
   and renders hand-drawn 8x8 prop icons that illustrate each fun fact.
   Everything is original pixel art (no copyrighted assets). */
(function (global) {
  "use strict";

  var SIZE = 16;

  var SKIN = {
    light:  { base: "#f0c8a0", shade: "#d8a87c", ear: "#caa074" },
    tan:    { base: "#dca878", shade: "#c08a58", ear: "#b07c4c" },
    medium: { base: "#c8965e", shade: "#a87844", ear: "#9a6c3c" },
    dark:   { base: "#8a5a36", shade: "#6e4426", ear: "#603a20" }
  };
  var EYE_W = "#ffffff", PUPIL = "#3a2a20", MOUTH = "#9a4a40";
  var FRAME = "#1c1c20";

  function blank() {
    var g = [];
    for (var y = 0; y < SIZE; y++) {
      var row = [];
      for (var x = 0; x < SIZE; x++) row.push(null);
      g.push(row);
    }
    return g;
  }
  function set(g, x, y, c) {
    if (x >= 0 && x < SIZE && y >= 0 && y < SIZE && c) g[y][x] = c;
  }
  function rowFill(g, y, x0, x1, c) { for (var x = x0; x <= x1; x++) set(g, x, y, c); }

  /* ---------- face base ---------- */
  function drawFace(g, sk) {
    for (var y = 4; y <= 12; y++)
      for (var x = 4; x <= 11; x++) set(g, x, y, sk.base);
    // right-side shading for depth
    for (var yy = 5; yy <= 11; yy++) set(g, 11, yy, sk.shade);
    set(g, 4, 12, sk.shade); set(g, 11, 12, sk.shade);
    // ears
    set(g, 3, 8, sk.ear); set(g, 3, 9, sk.ear);
    set(g, 12, 8, sk.ear); set(g, 12, 9, sk.ear);
    // eyes (pupils point slightly inward)
    set(g, 5, 7, EYE_W); set(g, 6, 7, PUPIL);
    set(g, 9, 7, PUPIL); set(g, 10, 7, EYE_W);
    // nose
    set(g, 7, 9, sk.shade); set(g, 8, 9, sk.shade);
    // smile
    set(g, 6, 11, MOUTH); rowFill(g, 11, 7, 8, MOUTH); set(g, 9, 11, MOUTH);
  }

  /* ---------- collars ---------- */
  var COLLARS = {
    suit: function (g) {
      rowFill(g, 13, 6, 9, "#e8d9c0");          // neck
      rowFill(g, 14, 3, 12, "#23262e");          // coat
      rowFill(g, 15, 3, 12, "#1a1c22");
      set(g, 6, 14, "#ffffff"); set(g, 9, 14, "#ffffff"); // collar points
      set(g, 7, 14, "#7a1f24"); set(g, 8, 14, "#7a1f24"); // tie
      set(g, 7, 15, "#7a1f24"); set(g, 8, 15, "#7a1f24");
    },
    cravat: function (g) {
      rowFill(g, 13, 6, 9, "#e8d9c0");
      rowFill(g, 14, 3, 12, "#3a2a1c");          // colonial coat (brown)
      rowFill(g, 15, 3, 12, "#2c2014");
      rowFill(g, 13, 6, 9, "#f5f0e6");           // white ruffle
      set(g, 7, 14, "#f5f0e6"); set(g, 8, 14, "#f5f0e6");
    }
  };

  /* ---------- hair styles ---------- */
  var HAIR = {
    short: function (g, c) {
      rowFill(g, 2, 5, 10, c); rowFill(g, 3, 4, 11, c); rowFill(g, 4, 4, 11, c);
      set(g, 4, 5, c); set(g, 11, 5, c);
    },
    side: function (g, c) {
      rowFill(g, 2, 5, 10, c); rowFill(g, 3, 4, 11, c); rowFill(g, 4, 4, 10, c);
      set(g, 4, 5, c); set(g, 11, 5, c); set(g, 11, 4, c);
    },
    comb: function (g, c) { // swept-over
      rowFill(g, 1, 4, 11, c); rowFill(g, 2, 4, 11, c); rowFill(g, 3, 4, 11, c);
      rowFill(g, 4, 4, 11, c); set(g, 11, 1, c); set(g, 11, 5, c);
    },
    wave: function (g, c) {
      rowFill(g, 1, 6, 9, c); rowFill(g, 2, 5, 10, c); rowFill(g, 3, 4, 11, c);
      rowFill(g, 4, 4, 11, c); set(g, 4, 5, c); set(g, 11, 5, c);
    },
    quiff: function (g, c) { // pompadour
      rowFill(g, 0, 6, 9, c); rowFill(g, 1, 5, 10, c); rowFill(g, 2, 4, 11, c);
      rowFill(g, 3, 4, 11, c); rowFill(g, 4, 4, 11, c); set(g, 11, 5, c);
    },
    long: function (g, c) { // tall swept-up (Jackson)
      rowFill(g, 0, 5, 10, c); rowFill(g, 1, 4, 11, c); rowFill(g, 2, 4, 11, c);
      rowFill(g, 3, 4, 11, c); rowFill(g, 4, 4, 11, c);
      set(g, 4, 5, c); set(g, 11, 5, c); set(g, 4, 6, c); set(g, 11, 6, c);
    },
    wig: function (g, c) { // colonial wig with side rolls
      rowFill(g, 2, 4, 11, c); rowFill(g, 3, 4, 11, c);
      set(g, 4, 4, c); set(g, 11, 4, c);
      // puffy side curls
      for (var y = 5; y <= 9; y++) { set(g, 3, y, c); set(g, 12, y, c); }
      set(g, 2, 6, c); set(g, 2, 7, c); set(g, 13, 6, c); set(g, 13, 7, c);
    },
    bald: function (g, c) { // fringe only
      set(g, 4, 5, c); set(g, 11, 5, c); set(g, 3, 6, c); set(g, 12, 6, c);
    },
    balding: function (g, c) { // sides + back, bare top
      rowFill(g, 4, 4, 5, c); rowFill(g, 4, 10, 11, c);
      set(g, 4, 5, c); set(g, 11, 5, c); set(g, 3, 6, c); set(g, 12, 6, c);
      set(g, 4, 6, c); set(g, 11, 6, c);
    }
  };

  /* ---------- facial hair ---------- */
  var FACIAL = {
    none: function () {},
    mustache: function (g, c) { rowFill(g, 10, 5, 10, c); },
    handlebar: function (g, c) {
      rowFill(g, 10, 5, 10, c); set(g, 4, 10, c); set(g, 11, 10, c);
      set(g, 4, 9, c); set(g, 11, 9, c);
    },
    chinbeard: function (g, c) { // Lincoln: jaw + chin, clean upper lip
      for (var y = 8; y <= 11; y++) { set(g, 4, y, c); set(g, 11, y, c); }
      rowFill(g, 12, 4, 11, c); rowFill(g, 13, 5, 10, c); rowFill(g, 14, 6, 9, c);
    },
    beard: function (g, c) { // full
      rowFill(g, 10, 5, 10, c);
      for (var y = 8; y <= 12; y++) { set(g, 4, y, c); set(g, 11, y, c); }
      rowFill(g, 12, 4, 11, c); rowFill(g, 13, 5, 10, c); rowFill(g, 14, 6, 9, c);
    },
    mutton: function (g, c) { // big sideburns + mustache (Arthur/Van Buren)
      for (var y = 6; y <= 12; y++) { set(g, 3, y, c); set(g, 4, y, c); set(g, 11, y, c); set(g, 12, y, c); }
      rowFill(g, 10, 5, 10, c);
    },
    shadow: function (g) { // 5 o'clock shadow (Nixon)
      var s = "#9a8068";
      for (var y = 11; y <= 12; y++) for (var x = 4; x <= 11; x++) if (g[y][x] && g[y][x] !== MOUTH) set(g, x, y, s);
      rowFill(g, 10, 5, 10, s);
    }
  };

  /* ---------- glasses ---------- */
  var GLASSES = {
    none: function () {},
    round: function (g) {
      set(g, 4, 7, FRAME); set(g, 4, 6, FRAME); set(g, 4, 8, FRAME);
      set(g, 7, 7, FRAME); set(g, 7, 6, FRAME); set(g, 7, 8, FRAME);
      set(g, 8, 7, FRAME); set(g, 8, 6, FRAME); set(g, 8, 8, FRAME);
      set(g, 11, 7, FRAME); set(g, 11, 6, FRAME); set(g, 11, 8, FRAME);
    },
    square: function (g) {
      set(g, 4, 6, FRAME); set(g, 7, 6, FRAME); set(g, 8, 6, FRAME); set(g, 11, 6, FRAME);
      set(g, 4, 8, FRAME); set(g, 7, 8, FRAME); set(g, 8, 8, FRAME); set(g, 11, 8, FRAME);
    }
  };

  /* ---------- hats ---------- */
  var HATS = {
    tophat: function (g) {
      var blk = "#101014", band = "#3a3a44";
      for (var y = 0; y <= 2; y++) rowFill(g, y, 5, 10, blk);
      rowFill(g, 2, 5, 10, band);
      rowFill(g, 3, 3, 12, blk); // brim
    }
  };

  function buildPortrait(recipe) {
    var g = blank();
    var sk = SKIN[recipe.skin] || SKIN.light;
    (COLLARS[recipe.collar] || COLLARS.suit)(g);
    drawFace(g, sk);
    (HAIR[recipe.hair] || HAIR.short)(g, recipe.hairColor || "#5a3a22");
    (FACIAL[recipe.facial] || FACIAL.none)(g, recipe.hairColor || "#3a2a1c");
    (GLASSES[recipe.glasses] || GLASSES.none)(g);
    if (recipe.hat && HATS[recipe.hat]) HATS[recipe.hat](g);
    return g;
  }

  /* ================= PROP ICONS (8x8) =================
     Hand-drawn pixel icons. '.' = transparent, other chars map via palette. */
  function I(palette, rows) { return { p: palette, r: rows }; }
  var PROPS = {
    teeth: I({ "#": "#ffffff", "_": "#d4b24a" }, [
      "........","........",".######.",".#_#_#_#",".######.",".#_#_#_#",".######.","........"]),
    house: I({ "#": "#f2efe6", "r": "#b04030", "d": "#5a3a20", "w": "#6ec6ff" }, [
      "...r....","..rrr...",".rrrrr..","#######.","#w##w##.","#w##d##.","##dd##.","#######."]),
    scroll: I({ "#": "#e8dcc0", "_": "#b89a60", "q": "#3a2a20" }, [
      "..####..",".#____#.",".#_##_#.",".#____#.",".#_##_#.",".#____#.","..####.q","......qq"]),
    ruler: I({ "#": "#d8b35a", "_": "#5a3a20" }, [
      "...##...","...##...","...##...","..####..","..#__#..","..####..","...##...","...##..."]),
    globe: I({ "#": "#6ec6ff", "g": "#3c9a4a", "_": "#7a5230" }, [
      "..####..",".#gg#g#.","#g#gg##g","#gg#g#g#","#g##gg#g",".#gg#g#.","...__...","..____.."]),
    water: I({ "#": "#3aa0ff", "_": "#bfe6ff" }, [
      "........","..#__#..",".#####_.","#_####_#","#######_","_#####_#",".#####_.","..####.."]),
    parrot: I({ "g": "#2ecc40", "r": "#ff4136", "y": "#ffdc00", "k": "#222" }, [
      "...gg...","..gggg..",".gggggr.","ygggg.r.","yggg....",".ggg....","..g.k...","..k.k..."]),
    ok: I({ "#": "#ffdc00", "_": "#3a2a20" }, [
      "........","#__.#__#","#_#.#.#.","#_#.##..","#_#.#.#.","#__.#.#.","........","........"]),
    snow: I({ "#": "#bfe6ff", "_": "#ffffff" }, [
      "...#....",".#.#.#..","..###...","#######.","..###...",".#.#.#..","...#....","........"]),
    family: I({ "#": "#5a3a22", "s": "#f0c8a0", "b": "#3a6ea5" }, [
      ".s.s.s..","#######.","sbsbsbs.","#######.","#.#.#.#.","........","........","........"]),
    list: I({ "#": "#f2efe6", "x": "#2e8b2e", "_": "#888" }, [
      ".#####..","x#__###.",".#####..","x#__###.",".#####..","x#__###.",".#####..","........"]),
    horse: I({ "#": "#8a5a2a", "k": "#222", "_": "#5a3a20" }, [
      "......##",".....###","#####.##","########","#######.","#.##.#..","#.##.#..","........"]),
    book: I({ "#": "#b04030", "_": "#f2efe6" }, [
      "........","#######.","#_____#.","#_###_#.","#_____#.","#_###_#.","#######.","........"]),
    speech: I({ "#": "#ffffff", "_": "#3a6ea5" }, [
      ".#####..","#_____#.","#_###_#.","#_____#.","#_###_#.","#####_#.","...#....","..#....."]),
    noring: I({ "#": "#d4b24a", "x": "#ff4136" }, [
      "..###...",".#x.x#..","#.x.x.#.","#x...x#.","#.x.x.#.",".#x.x#..","..###...","........"]),
    tophat: I({ "#": "#101014", "_": "#3a3a44" }, [
      "..####..","..#..#..","..#..#..","..####..","..____..","#######.","#######.","........"]),
    needle: I({ "#": "#c0c0c0", "_": "#ff4136" }, [
      ".......#","......#.",".....#..","....#...","..._#...","..#.#...","_#......","........"]),
    ticket: I({ "#": "#ffdc00", "_": "#3a2a20", "x": "#ff4136" }, [
      "........","########","#_x_x_x#","#______#","#_xxxx_#","#______#","########","........"]),
    phone: I({ "#": "#222", "_": "#ffdc00" }, [
      ".##..##.","#__####.","#______#","..####..","...##...","...##...","..####..","........"]),
    pencils: I({ "y": "#ffdc00", "_": "#3a2a20", "p": "#ffb6c1" }, [
      "p......p",".y....y.","..y..y..","..y..y..","..y..y..","..y..y..",".._.._..","........"]),
    pants: I({ "#": "#3a6ea5", "_": "#22364a" }, [
      "#######.","#######.","#######.","#_###_#.","#_# #_#.","#_# #_#.","#_# #_#.","##. .##."]),
    rings: I({ "#": "#d4b24a", "_": "#fff" }, [
      "..#..#..",".#_##_#.","#_#..#_#","#_#..#_#",".#_##_#.","..#..#..","........","........"]),
    bulb: I({ "#": "#ffdc00", "_": "#888", "x": "#fff" }, [
      "..####..",".#xxxx#.","#xxxxxx#","#xxxxxx#",".#xxxx#.","..####..","..#__#..","..####.."]),
    twoterm: I({ "#": "#ffdc00", "_": "#3a2a20" }, [
      "........","##..####","#.#....#",".#..####","#...#...","###.####","........","........"]),
    flower: I({ "r": "#ff4136", "g": "#2ecc40", "y": "#ffdc00" }, [
      "..r.r...",".rrrrr..","r.ryr.r.",".rrrrr..","..rgr...","...g....","..ggg...","...g...."]),
    teddy: I({ "#": "#8a5a2a", "k": "#222", "_": "#b07c4c" }, [
      "##....##","########","#kk##kk#","##_##_##","#######.",".#####..","#.#..#.#",".#....#."]),
    bathtub: I({ "#": "#ffffff", "w": "#6ec6ff", "_": "#bbb" }, [
      "........","#......#","#wwwwww#","#wwwwww#","#wwwwww#","########",".#.__.#.","........"]),
    sheep: I({ "#": "#f2efe6", "k": "#222", "_": "#888" }, [
      "........",".#####..","########","#k####k.","########",".#.__.#.","#.#..#.#",".......,"]),
    cards: I({ "#": "#ffffff", "r": "#ff4136", "_": "#222" }, [
      ".##.##..","#__#__#.","#r_#_r#.","#__#__#.","#_r#r_#.","#__#__#.",".##.##..","........"]),
    raccoon: I({ "#": "#888", "k": "#222", "w": "#fff" }, [
      "#......#","##....##",".######.",".kwkwwk.",".######.","..k##k..","#.#..#.#","kkkkkkkk"]),
    gator: I({ "#": "#3c9a4a", "k": "#222", "w": "#fff" }, [
      "........","#w#.....","####....","#########","#########","#k#k#k#k#","........","........"]),
    x4: I({ "#": "#ff4136", "_": "#ffdc00" }, [
      "........","#_#..#_#",".#_..#.#","..#..#_#",".#_..#_#","#_#..#_#","........","........"]),
    buck: I({ "#": "#5a3a20", "_": "#f2efe6", "x": "#222" }, [
      "........","########","#______#","#x_xx_x#","#______#","########","...##...","..####.."]),
    golf: I({ "#": "#2ecc40", "_": "#fff", "p": "#888", "r": "#ff4136" }, [
      "...rrr..","...r#...","...p....","...p....","...p....","...p....","#_#_#_#_","########"]),
    coconut: I({ "#": "#6b4a2a", "k": "#222" }, [
      "..####..",".######.","########","#k####k#","########","#kk##kk#",".######.","..####.."]),
    car: I({ "#": "#ff4136", "w": "#6ec6ff", "k": "#222", "_": "#3aa0ff" }, [
      "...####.","..#www#.","#######.","#######.",".k###k#.","_________","_________","_________"]),
    bowling: I({ "#": "#fff", "r": "#ff4136", "k": "#222" }, [
      "...##...","..####..","..#rr#..","..####..","..####..",".######.",".######.","..####.."]),
    football: I({ "#": "#8a4b2a", "_": "#fff" }, [
      "........","..####..",".######.","#_#__#_#","#__##__#","#_#__#_#",".######.","..####.."]),
    peanut: I({ "#": "#c8a05a", "_": "#a87c3c" }, [
      "..####..",".#_##_#.","..####..","...##...","..####..",".#_##_#.","..####..","........"]),
    jellybeans: I({ "j": "#888", "r": "#ff4136", "g": "#2ecc40", "y": "#ffdc00", "b": "#3a6ea5" }, [
      ".jjjjjj.","jrgybrgj","jbrgyrbj","jygbrygj","jrbygrbj","jgyrbygj","jbygrbyj",".jjjjjj."]),
    broccoli: I({ "g": "#2ecc40", "_": "#7cb342", "x": "#ff4136" }, [
      "x.gg.gg.","x.gggggg","x_gggggx","x._gg_.x","x.._.._x","x..__..x","..x.....","........"]),
    sax: I({ "#": "#d4b24a", "k": "#222" }, [
      ".###....","#..#....","...#....","...#....","...#k...","...#k...","..##k...",".####..."]),
    baseball: I({ "#": "#ffffff", "r": "#ff4136" }, [
      "..####..",".#rrrr#.","#r####r#","#######.","#r####r#","#r####r#",".#rrrr#.","..####.."]),
    comic: I({ "#": "#ff4136", "b": "#3a6ea5", "w": "#fff" }, [
      "########","#bwbwbwb","#wwwwww#","#wbwwbw#","#wwwwww#","#wwwwww#","#bwbwbwb","########"]),
    clapper: I({ "#": "#222", "_": "#fff" }, [
      "#_#_#_#_","_#_#_#_#","########","#......#","#......#","#......#","#......#","########"]),
    icecream: I({ "p": "#ffb6c1", "c": "#c8a05a", "r": "#ff4136" }, [
      "..ppp...",".ppppp..","ppprpppp","pppppppp",".ccccc..","..ccc...","...c....","........"]),
    star: I({ "#": "#e9cd84", "_": "#c9a24b" }, [
      "...##...","...##...","########",".######.","..####..",".##__##.","##....##","........"])
  };

  function propGrid(name) {
    var ic = PROPS[name];
    if (!ic) return null;
    var g = [];
    for (var y = 0; y < ic.r.length; y++) {
      var row = [], line = ic.r[y];
      for (var x = 0; x < line.length; x++) {
        var ch = line[x];
        row.push(ch === "." ? null : (ic.p[ch] || null));
      }
      g.push(row);
    }
    return g;
  }

  /* ---------- render any color-grid to a canvas ---------- */
  function render(canvas, grid, opts) {
    opts = opts || {};
    var rows = grid.length, cols = grid[0].length;
    var ctx = canvas.getContext("2d");
    var cw = canvas.width, ch = canvas.height;
    var scale = Math.floor(Math.min(cw / cols, ch / rows));
    if (scale < 1) scale = 1;
    var ox = Math.floor((cw - scale * cols) / 2);
    var oy = Math.floor((ch - scale * rows) / 2);
    ctx.clearRect(0, 0, cw, ch);
    ctx.imageSmoothingEnabled = false;
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var c = grid[y][x];
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
      }
    }
  }

  global.PixelArt = {
    buildPortrait: buildPortrait,
    propGrid: propGrid,
    render: render,
    PROPS: PROPS
  };
})(window);
