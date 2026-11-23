/* 圓形小學 — a tiny fictional campus for a parent and a Primary 4 child.
   No real school, no fighting. Patrols are for sneaking past, never combat. */
(function () {
  "use strict";

  const WORLD = { w: 2000, h: 1500 };
  const INK = "#3d2c22";
  const FONT = '"QingWan", "PingFang HK", "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", "WenQuanYi Micro Hei", sans-serif';
  const PLAYER_R = 12;
  const WALK = 176;
  const SPRINT = 292;
  const SAVE_KEY = "qingwan-primary-v1";
  const VIS_R = 78;
  const CONE_R = 158;
  const CONE_A = 0.62;

  const CLASS = { x: 1040, y: 56, w: 800, h: 420 };
  const LIB = { x: 430, y: 72, w: 470, h: 360 };
  const HALL = { x: 450, y: 620, w: 500, h: 340 };
  const CANTEEN = { x: 1120, y: 620, w: 640, h: 300 };
  const GARDEN = { x: 48, y: 640, w: 300, h: 280 };
  const GROVE = { x: 48, y: 48, w: 280, h: 280 };
  const NOOK = { x: 48, y: 1120, w: 230, h: 250 };
  const BOARD = { x: 1448, y: 1144, w: 136, h: 78 };
  const STAIRS = { x: 1084, y: 348, w: 108, h: 88 };
  const CLASS_GOAL = { x: 1330, y: 250 };
  const BOOK = { x: 180, y: 755 };
  const VIEWPOINT = { x: 1668, y: 248 };
  const START = { x: 1516, y: 1268 };

  const params = new URLSearchParams(location.search);
  const debug = params.has("debug");
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = (id) => document.getElementById(id);
  const canvas = $("view");
  const ctx = canvas.getContext("2d");
  const mini = $("mini");
  const miniCtx = mini.getContext("2d");

  const art = { ready: false, xiaole: null, npcs: null, props: null, pat: {}, keep: [] };

  /* Sprite rects are tight opaque bounds: [x, y, w, h]. 小逸 rows are down, left, right, up. */
  const XIAOLE = [
    [[83, 28, 87, 201], [332, 30, 106, 198], [588, 30, 109, 198], [845, 31, 106, 197]],
    [[84, 278, 87, 203], [328, 281, 104, 199], [584, 280, 104, 200], [841, 281, 102, 199]],
    [[80, 534, 87, 199], [328, 534, 102, 198], [589, 535, 105, 197], [845, 535, 103, 197]],
    [[84, 784, 84, 201], [338, 785, 84, 200], [582, 787, 101, 199], [852, 787, 84, 198]],
  ];
  const NPC_FRAMES = {
    chen: [[98, 20, 84, 195], [295, 20, 95, 195], [487, 20, 94, 195], [687, 20, 82, 195]],
    huang: [[93, 238, 93, 181], [295, 238, 84, 181], [479, 238, 83, 181], [686, 238, 85, 181]],
    lin: [[81, 445, 97, 168], [274, 445, 98, 168], [488, 445, 98, 168], [677, 445, 91, 168]],
    kit: [[98, 637, 79, 161], [292, 637, 79, 161], [488, 637, 79, 161], [689, 637, 77, 161]],
    min: [[94, 817, 87, 159], [290, 817, 86, 159], [487, 817, 84, 159], [685, 817, 82, 159]],
    cat: [[92, 1000, 105, 120], [276, 1000, 114, 120], [477, 1000, 106, 120], [691, 1000, 73, 120]],
  };
  const PROP_SRC = {
    board: [53, 93, 215, 157],
    treeA: [331, 43, 179, 211],
    treeB: [570, 47, 176, 207],
    bush: [808, 111, 160, 140],
    table: [50, 355, 203, 118],
    shelf: [331, 319, 165, 162],
    desk: [573, 352, 170, 121],
    partition: [815, 332, 161, 158],
    stage: [48, 560, 198, 128],
    chair: [328, 574, 63, 113],
    counter: [558, 563, 193, 130],
    slide: [800, 548, 170, 154],
    swing: [46, 772, 197, 161],
    climb: [333, 771, 102, 156],
    fountain: [551, 785, 73, 143],
    gate: [698, 784, 304, 149],
  };

  const groundSolids = [];
  const roofSolids = [];
  let groundGrid = null;
  let roofGrid = null;
  let issues = [];

  const compounds = [
    { id: "library", name: "圖書館", ...LIB, wall: "#7950f2", floor: "#f3e8ff", ink: "#3b2770", t: 24, floorLabel: "圖書館",
      doors: { e: [{ offset: 140, length: 110 }] } },
    { id: "class", name: "課室大樓", ...CLASS, wall: "#f76707", floor: "#fff4e0", ink: "#d9480f", t: 24, floorLabel: "課室大樓",
      doors: { s: [{ offset: 200, length: 180 }] } },
    { id: "hall", name: "禮堂", ...HALL, wall: "#e03131", floor: "#ffe3e8", ink: "#a61e4d", t: 24, floorLabel: "禮堂",
      doors: { n: [{ offset: 180, length: 120 }], s: [{ offset: 200, length: 120 }] } },
    { id: "canteen", name: "飯堂", ...CANTEEN, wall: "#0ca678", floor: "#e6fcf5", ink: "#087f5b", t: 24, floorLabel: "飯堂",
      doors: { s: [{ offset: 260, length: 120 }] } },
    { id: "garden", name: "小花園", ...GARDEN, wall: "#2b8a3e", floor: "#d8f5a2", ink: "#2b8a3e", t: 26, floorLabel: "小花園", hedge: true,
      doors: { e: [{ offset: 150, length: 100 }] } },
    { id: "grove", name: "秘密小樹林", ...GROVE, wall: "#1b6b34", floor: "#b2f2bb", ink: "#1b6b34", t: 26, floorLabel: "小樹林", hedge: true,
      doors: { s: [{ offset: 150, length: 100 }] } },
    { id: "nook", name: "隱藏角落", ...NOOK, wall: "#2f9e44", floor: "#d3f9d8", ink: "#2b8a3e", t: 26, floorLabel: "小角落", hedge: true,
      doors: { e: [{ offset: 70, length: 100 }] } },
  ];

  const props = [
    { type: "shelf", x: 470, y: 118, w: 210, h: 22, solid: true },
    { type: "shelf", x: 470, y: 158, w: 210, h: 22, solid: true },
    { type: "shelf", x: 470, y: 198, w: 150, h: 22, solid: true },
    { type: "desk", x: 1188, y: 112, w: 230, h: 36, solid: true },
    { type: "desk", x: 1568, y: 150, w: 180, h: 34, solid: true },
    { type: "partition", x: 1490, y: 80, w: 20, h: 168, solid: true },
    { type: "partition", x: 1490, y: 336, w: 20, h: 116, solid: true },
    { type: "stage", x: 490, y: 690, w: 100, h: 64, solid: true },
    { type: "chair", x: 500, y: 830, w: 64, h: 36, solid: true },
    { type: "chair", x: 860, y: 830, w: 64, h: 36, solid: true },
    { type: "counter", x: 1200, y: 666, w: 460, h: 26, solid: true },
    { type: "table", x: 1188, y: 748, w: 96, h: 40, solid: true },
    { type: "table", x: 1188, y: 824, w: 96, h: 40, solid: true },
    { type: "table", x: 1568, y: 748, w: 96, h: 40, solid: true },
    { type: "table", x: 1568, y: 824, w: 96, h: 40, solid: true },
    { type: "slide", x: 470, y: 1164, w: 92, h: 132, solid: true },
    { type: "swing", x: 650, y: 1196, w: 156, h: 72, solid: true },
    { type: "climb", x: 860, y: 1236, w: 72, h: 72, solid: true },
    { type: "fountain", x: 808, y: 1336, w: 40, h: 40, solid: true },
    { type: "board", ...BOARD, solid: true },
  ];

  const trees = [
    { x: 130, y: 150, r: 34, c: "#2f9e44" },
    { x: 236, y: 168, r: 28, c: "#2b8a3e" },
    { x: 156, y: 236, r: 24, c: "#37b24d" },
    { x: 118, y: 530, r: 30, c: "#2f9e44" },
    { x: 248, y: 470, r: 26, c: "#2b8a3e" },
    { x: 1924, y: 300, r: 30, c: "#2f9e44" },
    { x: 1928, y: 820, r: 28, c: "#2b8a3e" },
    { x: 1916, y: 1280, r: 26, c: "#37b24d" },
    { x: 560, y: 1424, r: 24, c: "#2f9e44" },
    { x: 980, y: 1422, r: 28, c: "#2b8a3e" },
    { x: 520, y: 1016, r: 26, c: "#2f9e44" },
  ];

  const signs = [
    { x: 960, y: 250, text: "圖書館", floor: 0 },
    { x: 1472, y: 512, text: "課室大樓", floor: 0 },
    { x: 1230, y: 196, text: "四年級甲班", floor: 0 },
    { x: 1660, y: 220, text: "四年級乙班", floor: 0 },
    { x: 1165, y: 312, text: "上天台", floor: 0 },
    { x: 710, y: 1004, text: "禮堂", floor: 0 },
    { x: 1440, y: 972, text: "飯堂", floor: 0 },
    { x: 392, y: 848, text: "小花園", floor: 0 },
    { x: 248, y: 372, text: "秘密小樹林", floor: 0 },
    { x: 330, y: 1248, text: "隱藏角落", floor: 0 },
    { x: 620, y: 1108, text: "操場", floor: 0 },
    { x: 1860, y: 1240, text: "校門", floor: 0 },
    { x: 1400, y: 150, text: "天台", floor: 1 },
    { x: 1165, y: 312, text: "落樓", floor: 1 },
    { x: 1668, y: 196, text: "觀景位", floor: 1 },
  ];

  const paths = [
    { x: 48, y: 488, w: 1904, h: 132 },
    { x: 960, y: 620, w: 160, h: 820 },
    { x: 1768, y: 500, w: 170, h: 940 },
    { x: 900, y: 160, w: 150, h: 360 },
    { x: 48, y: 980, w: 1904, h: 110 },
  ];

  const surfaces = [
    { x: 400, y: 1060, w: 720, h: 370, color: "#f5c94a" },
    { x: 1180, y: 1088, w: 720, h: 340, color: "#f8e7c4" },
  ];

  const zones = [
    { id: "stairs", name: "樓梯", floor: 0, ...STAIRS },
    { id: "4a", name: "四年級甲班", floor: 0, x: 1040, y: 56, w: 450, h: 420 },
    { id: "4b", name: "四年級乙班", floor: 0, x: 1490, y: 56, w: 350, h: 420 },
    { id: "library", name: "圖書館", floor: 0, ...LIB },
    { id: "hall", name: "禮堂", floor: 0, ...HALL },
    { id: "canteen", name: "飯堂", floor: 0, ...CANTEEN },
    { id: "garden", name: "小花園", floor: 0, ...GARDEN },
    { id: "grove", name: "秘密小樹林", floor: 0, ...GROVE },
    { id: "nook", name: "隱藏角落", floor: 0, ...NOOK },
    { id: "playground", name: "操場", floor: 0, x: 400, y: 1060, w: 720, h: 370 },
    { id: "gate", name: "校門", floor: 0, x: 1180, y: 1088, w: 760, h: 380 },
  ];

  const MISSIONS = [
    {
      id: "ontime",
      title: "準時返班",
      blurb: "限時返到課室",
      intro: "陳老師話：小息就快完喇！\n請你喺 70 秒內返到四年級甲班。\n跟著白色路點同行路箭嘴就搵到路。",
      objective: "去四年級甲班",
      time: 70,
      winTitle: "準時到達！",
      win: "你趕及返到課室。陳老師笑住話：好好，坐低準備上堂。",
      failTitle: "遲咗少少",
      fail: "上課鈴響咗。陳老師話：唔緊要，我哋再試一次。今次跟著白點行快啲。",
    },
    {
      id: "homework",
      title: "交功課簿",
      blurb: "幫老師送功課簿",
      intro: "黃老師話：有本功課簿留咗喺小花園。\n請你攞返嚟，交到圖書館。\n行近功課簿就會自動攞起。",
      objective: "去小花園攞功課簿",
      winTitle: "交到喇！",
      win: "黃老師接過功課簿：多謝你，小逸！同學可以攞返功課喇。",
    },
    {
      id: "stealth",
      title: "靜靜上天台",
      blurb: "避開老師上到天台",
      intro: "天台可以望到成個校園。\n陳老師喺通道巡邏。黃色圈同扇形係佢望到嘅地方。\n等佢行開，入課室，再上樓梯去觀景位。\n被見到都唔緊要，可以再試。",
      objective: "避開老師，去天台觀景位",
      winTitle: "登上天台！",
      win: "你行到觀景位，見到成個圓形小學。風輕輕吹過，好好玩。",
      failTitle: "老師見到你",
      fail: "陳老師友善地揮揮手：小息未完，返去操場玩啦。等佢行開，我哋再試過。",
    },
  ];

  const player = {
    kind: "player",
    x: START.x,
    y: START.y,
    r: PLAYER_R,
    floor: 0,
    vx: 0,
    vy: 0,
    facing: -Math.PI / 2,
    phase: 0,
    moving: false,
    safeX: START.x,
    safeY: START.y,
    style: { shirt: "#ffd43b", pants: "#4dabf7", hair: "#2b2118", scale: 1.28, backpack: true },
  };

  const npcs = [
    { id: "teacher", kind: "teacher", name: "陳老師", x: 1120, y: 548, r: 16, floor: 0, facing: 0, phase: 0, moving: false,
      style: { shirt: "#74c0fc", pants: "#364fc7", hair: "#3a2a22", scale: 1.2, bun: true } },
    { id: "librarian", kind: "librarian", name: "黃老師", x: 730, y: 318, r: 14, floor: 0, facing: Math.PI, phase: 1,
      style: { shirt: "#e599f7", pants: "#6741d9", hair: "#5c3a21", scale: 1.12, glasses: true } },
    { id: "kit", kind: "kid", name: "阿哲", x: 610, y: 1360, r: 12, floor: 0, facing: 0.4, phase: 0.4,
      style: { shirt: "#8ce99a", pants: "#1971c2", hair: "#2b2118", scale: 0.96, cap: true },
      home: { x: 460, y: 1160, w: 420, h: 200 }, tx: 0, ty: 0 },
    { id: "min", kind: "kid", name: "小敏", x: 720, y: 1300, r: 12, floor: 0, facing: -1, phase: 1.2,
      style: { shirt: "#ffa8a8", pants: "#f08c00", hair: "#2b2118", scale: 0.94 },
      home: { x: 500, y: 1180, w: 380, h: 190 }, tx: 0, ty: 0 },
    { id: "janitor", kind: "janitor", name: "林校工", x: 1688, y: 778, r: 14, floor: 0, facing: -Math.PI / 2, phase: 0,
      style: { shirt: "#ffd8a8", pants: "#495057", hair: "#868e96", scale: 1.16, vest: true, broom: true } },
    { id: "cat", kind: "cat", name: "糯米", x: 150, y: 176, r: 8, floor: 0 },
  ];

  const teacher = npcs[0];
  teacher.i = 1;
  teacher.dir = 1;
  teacher.pause = 0.4;
  const TEACHER_PATH = [{ x: 1120, y: 548 }, { x: 1760, y: 548 }];

  let blobs = [];
  let flowers = [];
  let birds = [
    { x: 220, y: 260, v: 34, p: 0 },
    { x: 900, y: 150, v: 26, p: 2 },
    { x: 1500, y: 340, v: 30, p: 4.2 },
  ];
  let clouds = [
    { x: 180, y: 180, s: 1 },
    { x: 640, y: 90, s: 1.25 },
    { x: 1100, y: 240, s: 0.9 },
    { x: 1680, y: 70, s: 1.15 },
  ];
  let confetti = [];
  let dust = [];

  const save0 = loadSave();
  const state = {
    dialog: null,
    mission: null,
    carrying: false,
    timeLeft: 0,
    done: save0.done,
    mute: save0.mute,
    everStarted: false,
    grace: 0,
    catching: 0,
    resolving: false,
    stairArmed: true,
    seenZones: new Set(),
    toast: "",
    toastUntil: 0,
    banner: "",
    bannerUntil: 0,
    path: null,
    pathTimer: 0,
    objectiveText: "",
    zoom: 1,
    cssW: 800,
    cssH: 600,
    viewW: 800,
    viewH: 600,
    dpr: 1,
    snapCam: true,
    camReady: false,
    zoneId: "",
    lastZoneAnnounce: "",
  };

  let camX = 0;
  let camY = 0;
  let ambient = 0;
  let lastTs = 0;
  let actx = null;
  let joy = { active: false, id: null, x: 0, y: 0, max: 0 };
  let tap = null;
  let sprintHeld = false;
  let keys = new Set();
  const joyEl = $("joy");
  const knob = $("joy-knob");

  function loadSave() {
    try {
      const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
      const done = new Set(Array.isArray(raw.done) ? raw.done.filter((id) => MISSIONS.some((m) => m.id === id)) : []);
      return { done, mute: !!raw.mute };
    } catch (err) {
      return { done: new Set(), mute: false };
    }
  }

  function persist() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ done: [...state.done], mute: state.mute }));
    } catch (err) { /* private mode */ }
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
  function inRect(x, y, r) { return x >= r.x && y >= r.y && x <= r.x + r.w && y <= r.y + r.h; }

  function roundRect(c, x, y, w, h, r) {
    const rr = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath();
    c.moveTo(x + rr, y);
    c.arcTo(x + w, y, x + w, y + h, rr);
    c.arcTo(x + w, y + h, x, y + h, rr);
    c.arcTo(x, y + h, x, y, rr);
    c.arcTo(x, y, x + w, y, rr);
    c.closePath();
  }

  function splitSpan(length, gaps) {
    const cuts = (gaps || [])
      .map((g) => ({ a: g.offset, b: g.offset + g.length }))
      .filter((g) => g.b > 0 && g.a < length)
      .sort((a, b) => a.a - b.a);
    const out = [];
    let cursor = 0;
    for (const g of cuts) {
      const a = Math.max(0, g.a);
      const b = Math.min(length, g.b);
      if (a > cursor + 0.5) out.push({ from: cursor, to: a });
      cursor = Math.max(cursor, b);
    }
    if (cursor < length - 0.5) out.push({ from: cursor, to: length });
    return out;
  }

  function addWalls(b, solids) {
    const t = b.t || 24;
    const sides = [
      ["n", b.x, b.y, b.w, t, true],
      ["s", b.x, b.y + b.h - t, b.w, t, true],
      ["w", b.x, b.y, t, b.h, false],
      ["e", b.x + b.w - t, b.y, t, b.h, false],
    ];
    for (const [side, x, y, w, h, horiz] of sides) {
      for (const seg of splitSpan(horiz ? w : h, (b.doors || {})[side])) {
        if (horiz) solids.push({ x: x + seg.from, y, w: seg.to - seg.from, h });
        else solids.push({ x, y: y + seg.from, w, h: seg.to - seg.from });
      }
    }
  }

  function buildWorld() {
    groundSolids.push(
      { x: 0, y: 0, w: WORLD.w, h: 34 },
      { x: 0, y: WORLD.h - 34, w: WORLD.w, h: 34 },
      { x: 0, y: 0, w: 34, h: WORLD.h },
      { x: WORLD.w - 34, y: 0, w: 34, h: WORLD.h }
    );
    for (const b of compounds) addWalls(b, groundSolids);
    for (const p of props) if (p.solid) groundSolids.push({ x: p.x, y: p.y, w: p.w, h: p.h });
    for (const tree of trees) groundSolids.push({ x: tree.x, y: tree.y, r: 9 });

    const innerL = 1064;
    const innerT = 80;
    const innerR = 1816;
    const innerB = 452;
    roofSolids.push(
      { x: 0, y: 0, w: WORLD.w, h: innerT },
      { x: 0, y: 0, w: innerL, h: WORLD.h },
      { x: innerR, y: 0, w: WORLD.w - innerR, h: WORLD.h },
      { x: 0, y: innerB, w: WORLD.w, h: WORLD.h - innerB },
      { x: innerL, y: innerT, w: innerR - innerL, h: 28 },
      { x: innerL, y: innerT, w: 28, h: innerB - innerT },
      { x: innerR - 30, y: innerT, w: 30, h: innerB - innerT },
      { x: innerL, y: 422, w: Math.max(10, STAIRS.x - innerL), h: 30 },
      { x: STAIRS.x + STAIRS.w, y: 422, w: innerR - (STAIRS.x + STAIRS.w), h: 30 },
      { x: 1500, y: 122, w: 62, h: 46 },
      { x: 1584, y: 122, w: 62, h: 46 }
    );

    groundGrid = buildGrid(groundSolids);
    roofGrid = buildGrid(roofSolids);

    const rand = mulberry32(20261123);
    blobs = [];
    for (let i = 0; i < 100; i++) {
      blobs.push({
        x: rand() * WORLD.w,
        y: rand() * WORLD.h,
        rx: 28 + rand() * 80,
        ry: 16 + rand() * 40,
        c: rand() > 0.5 ? "#62b84e" : "#86d96a",
      });
    }
    const petal = ["#ff6b8a", "#ffd43b", "#fff", "#da77f2", "#ff922b"];
    flowers = [];
    for (let i = 0; i < 90; i++) {
      flowers.push({ x: rand() * WORLD.w, y: rand() * WORLD.h, c: petal[(rand() * petal.length) | 0] });
    }
    for (let i = 0; i < 14; i++) {
      flowers.push({ x: 80 + rand() * 180, y: 680 + rand() * 180, c: petal[(rand() * petal.length) | 0] });
    }
  }

  function buildGrid(solids) {
    const G = 28;
    const cols = Math.ceil(WORLD.w / G);
    const rows = Math.ceil(WORLD.h / G);
    const blocked = new Uint8Array(cols * rows);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * G + G / 2;
        const y = r * G + G / 2;
        if (circleHits(x, y, PLAYER_R + 8, solids)) blocked[r * cols + c] = 1;
      }
    }
    return { G, cols, rows, blocked };
  }

  function circleHits(x, y, r, solids) {
    const r2 = r * r;
    for (let i = 0; i < solids.length; i++) {
      const s = solids[i];
      if (s.r) {
        if (dist(x, y, s.x, s.y) < r + s.r) return true;
      } else {
        const cx = clamp(x, s.x, s.x + s.w);
        const cy = clamp(y, s.y, s.y + s.h);
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy < r2) return true;
      }
    }
    return false;
  }

  function pointInSolid(x, y, solids) {
    for (let i = 0; i < solids.length; i++) {
      const s = solids[i];
      if (s.r) {
        if (dist(x, y, s.x, s.y) < s.r) return true;
      } else if (x >= s.x && y >= s.y && x <= s.x + s.w && y <= s.y + s.h) return true;
    }
    return false;
  }

  function lineBlocked(x1, y1, x2, y2, solids) {
    const d = dist(x1, y1, x2, y2);
    const steps = Math.max(1, Math.ceil(d / 10));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (pointInSolid(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, solids)) return true;
    }
    return false;
  }

  function nearestFree(grid, c, r, rad) {
    const { cols, rows, blocked } = grid;
    for (let d = 0; d <= rad; d++) {
      for (let dy = -d; dy <= d; dy++) {
        for (let dx = -d; dx <= d; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
          const nc = c + dx;
          const nr = r + dy;
          if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
          if (!blocked[nr * cols + nc]) return { c: nc, r: nr };
        }
      }
    }
    return null;
  }

  function findPath(grid, sx, sy, tx, ty) {
    const { G, cols, rows, blocked } = grid;
    const index = (c, r) => r * cols + c;
    const inside = (c, r) => c >= 0 && r >= 0 && c < cols && r < rows;
    let sc = Math.floor(sx / G);
    let sr = Math.floor(sy / G);
    let gc = Math.floor(tx / G);
    let gr = Math.floor(ty / G);
    if (!inside(sc, sr) || !inside(gc, gr)) return null;
    if (blocked[index(sc, sr)]) {
      const found = nearestFree(grid, sc, sr, 8);
      if (!found) return null;
      sc = found.c;
      sr = found.r;
    }
    if (blocked[index(gc, gr)]) {
      const found = nearestFree(grid, gc, gr, 8);
      if (!found) return null;
      gc = found.c;
      gr = found.r;
    }
    const start = index(sc, sr);
    const goal = index(gc, gr);
    if (start === goal) return [{ x: tx, y: ty }];
    const open = [start];
    const gScore = new Float32Array(cols * rows);
    gScore.fill(Infinity);
    gScore[start] = 0;
    const parent = new Int32Array(cols * rows);
    parent.fill(-1);
    const inOpen = new Uint8Array(cols * rows);
    inOpen[start] = 1;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    let guard = 0;
    while (open.length && guard++ < 9000) {
      let best = 0;
      let bestF = Infinity;
      for (let i = 0; i < open.length; i++) {
        const id = open[i];
        const c = id % cols;
        const r = (id / cols) | 0;
        const f = gScore[id] + Math.hypot(c - gc, r - gr);
        if (f < bestF) { bestF = f; best = i; }
      }
      const cur = open.splice(best, 1)[0];
      inOpen[cur] = 0;
      if (cur === goal) {
        const path = [];
        let p = cur;
        while (p !== -1) {
          const c = p % cols;
          const r = (p / cols) | 0;
          path.push({ x: c * G + G / 2, y: r * G + G / 2 });
          p = parent[p];
        }
        path.reverse();
        path[path.length - 1] = { x: tx, y: ty };
        return path;
      }
      const cc = cur % cols;
      const rr = (cur / cols) | 0;
      for (let i = 0; i < dirs.length; i++) {
        const dc = dirs[i][0];
        const dr = dirs[i][1];
        const nc = cc + dc;
        const nr = rr + dr;
        if (!inside(nc, nr)) continue;
        const nid = index(nc, nr);
        if (blocked[nid]) continue;
        if (dc !== 0 && dr !== 0 && (blocked[index(cc + dc, rr)] || blocked[index(cc, rr + dr)])) continue;
        const ng = gScore[cur] + (dc !== 0 && dr !== 0 ? 1.414 : 1);
        if (ng < gScore[nid]) {
          gScore[nid] = ng;
          parent[nid] = cur;
          if (!inOpen[nid]) { open.push(nid); inOpen[nid] = 1; }
        }
      }
    }
    return null;
  }

  function selfCheck() {
    const found = [];
    const check = (name, x, y, floor) => {
      const solids = floor ? roofSolids : groundSolids;
      if (circleHits(x, y, PLAYER_R, solids)) found.push(name + " 被擋住");
    };
    check("起點", START.x, START.y, 0);
    check("陳老師", 1120, 548, 0);
    check("黃老師", 730, 318, 0);
    check("功課簿", BOOK.x, BOOK.y, 0);
    check("課室", CLASS_GOAL.x, CLASS_GOAL.y, 0);
    check("樓梯", STAIRS.x + STAIRS.w / 2, STAIRS.y + STAIRS.h / 2, 0);
    check("觀景位", VIEWPOINT.x, VIEWPOINT.y, 1);
    check("糯米", 150, 176, 0);
    check("林校工", 1688, 778, 0);
    for (const n of npcs) check(n.name, n.x, n.y, n.floor);
    check("樓梯上", STAIRS.x + STAIRS.w / 2, STAIRS.y + STAIRS.h / 2, 1);
    const routes = [
      ["去課室", 0, START.x, START.y, CLASS_GOAL.x, CLASS_GOAL.y],
      ["去功課簿", 0, START.x, START.y, BOOK.x, BOOK.y],
      ["交簿", 0, BOOK.x, BOOK.y, 730, 318],
      ["去樓梯", 0, START.x, START.y, STAIRS.x + 40, STAIRS.y + 40],
      ["天台", 1, STAIRS.x + 50, STAIRS.y + 40, VIEWPOINT.x, VIEWPOINT.y],
      ["小樹林", 0, START.x, START.y, 160, 170],
      ["隱藏角落", 0, START.x, START.y, 140, 1240],
    ];
    for (const route of routes) {
      const grid = route[1] ? roofGrid : groundGrid;
      if (!findPath(grid, route[2], route[3], route[4], route[5])) found.push("行唔到：" + route[0]);
    }
    issues = found;
    if (found.length) console.warn("圓形小學地圖檢查", found);
    return found;
  }

  function solidsFor(floor) { return floor === 1 ? roofSolids : groundSolids; }
  function gridFor(floor) { return floor === 1 ? roofGrid : groundGrid; }

  function currentZone() {
    if (player.floor === 1) {
      if (dist(player.x, player.y, VIEWPOINT.x, VIEWPOINT.y) < 70) return { id: "view", name: "觀景位" };
      if (inRect(player.x, player.y, STAIRS)) return { id: "stairs-up", name: "樓梯" };
      return { id: "roof", name: "天台" };
    }
    for (const z of zones) {
      if (z.floor === 0 && inRect(player.x, player.y, z)) return z;
    }
    return { id: "path", name: "校園通道" };
  }

  function guidePoint() {
    const m = state.mission;
    if (!m) return null;
    if (m.id === "ontime") return { x: CLASS_GOAL.x, y: CLASS_GOAL.y, floor: 0 };
    if (m.id === "homework") {
      if (!state.carrying) return { x: BOOK.x, y: BOOK.y, floor: 0 };
      return { x: 730, y: 318, floor: 0 };
    }
    if (player.floor === 0) return { x: STAIRS.x + STAIRS.w / 2, y: STAIRS.y + STAIRS.h / 2, floor: 0 };
    return { x: VIEWPOINT.x, y: VIEWPOINT.y, floor: 1 };
  }

  function objectiveLine() {
    const m = state.mission;
    if (!m) return "";
    if (m.id === "homework") return state.carrying ? "交俾圖書館黃老師" : "去小花園攞功課簿";
    if (m.id === "stealth") return player.floor === 0 ? "避開老師，入課室上樓梯" : "去天台觀景位";
    return m.objective;
  }

  function interactables(maxRange) {
    const list = [];
    const consider = (item) => {
      if (item.floor !== player.floor) return;
      const d = dist(player.x, player.y, item.x, item.y);
      if (d <= maxRange) list.push({ ...item, d });
    };
    consider({ kind: "board", x: BOARD.x + BOARD.w / 2, y: BOARD.y + BOARD.h / 2, range: 108, floor: 0 });
    for (const n of npcs) consider({ kind: n.kind, npc: n, name: n.name, x: n.x, y: n.y, range: 62, floor: n.floor });
    consider({ kind: "gate", x: 1520, y: 1408, range: 70, floor: 0 });
    consider({ kind: "fountain", x: 828, y: 1356, range: 58, floor: 0 });
    list.sort((a, b) => a.d - b.d);
    return list;
  }

  function nearestInteract() {
    return interactables(140).find((item) => item.d <= item.range) || null;
  }

  function unlockAudio() {
    if (state.mute) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!actx) actx = new AC();
      if (actx.state === "suspended") actx.resume();
    } catch (err) { /* ignore */ }
  }

  function beep(freq, dur, gain, delay) {
    if (state.mute || !actx) return;
    const t0 = actx.currentTime + (delay || 0);
    const osc = actx.createOscillator();
    const g = actx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain || 0.05, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(actx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function chimeOk() { beep(523, 0.12, 0.05, 0); beep(659, 0.12, 0.05, 0.08); beep(784, 0.18, 0.05, 0.16); }
  function chimeWin() { [523, 659, 784, 1046].forEach((f, i) => beep(f, 0.2, 0.055, i * 0.09)); }
  function chimeSoft() { beep(440, 0.1, 0.04, 0); beep(554, 0.14, 0.04, 0.08); }
  function chimeFail() { beep(392, 0.16, 0.04, 0); beep(330, 0.18, 0.035, 0.12); beep(262, 0.22, 0.03, 0.24); }

  function announce(text) {
    const live = $("live");
    live.textContent = live.textContent === text ? text + "。" : text;
  }

  function toast(text) {
    state.toast = text;
    state.toastUntil = ambient + 2.7;
    announce(text);
  }

  function banner(text) {
    state.banner = text;
    state.bannerUntil = ambient + 1.7;
    announce(text);
  }

  function burst(x, y) {
    if (reduceMotion) return;
    const colors = ["#ffd43b", "#ff6b6b", "#4dabf7", "#69db7c", "#f06595", "#fff"];
    for (let i = 0; i < 32; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 70 + Math.random() * 160;
      confetti.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 50,
        life: 1, color: colors[i % colors.length], size: 4 + Math.random() * 4,
      });
    }
  }

  function openDialog(opts) {
    state.dialog = opts;
    player.vx = 0;
    player.vy = 0;
    endJoy();
    $("sheet-title").textContent = opts.title;
    $("sheet-body").textContent = opts.body;
    const actions = $("sheet-actions");
    actions.replaceChildren();
    for (const button of opts.buttons) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "btn" + (button.primary ? " primary" : "") + (button.warn ? " warn" : "");
      const label = document.createElement("span");
      label.textContent = button.label;
      el.appendChild(label);
      if (button.detail) {
        const small = document.createElement("small");
        small.textContent = button.detail;
        el.appendChild(small);
      }
      el.addEventListener("click", () => button.onClick());
      actions.appendChild(el);
    }
    $("overlay").classList.remove("hidden");
    const focus = actions.querySelector(".primary") || actions.querySelector("button");
    focus?.focus();
  }

  function closeDialog() {
    state.dialog = null;
    $("overlay").classList.add("hidden");
    state.grace = Math.max(state.grace, 0.45);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }

  function openHelp() {
    openDialog({
      title: "點樣玩",
      body: "行：撳住畫面左邊。電腦用 WASD 或者方向鍵。\n衝：按住右邊「衝」，或者 Shift。\n互動：行近之後撳「互動」，或者 E。\n小地圖：黃點係你，紅點係目標。\n任務板喺校門。三個任務都可以重玩。",
      buttons: [{ label: "知道喇", primary: true, onClick: closeDialog }],
    });
  }

  function openWelcome() {
    openDialog({
      title: "圓形小學",
      body: "你好，我係小逸！呢度係我哋嘅小學。\n\n行：撳住左下角搖桿。\n電腦可以用 WASD 或者方向鍵。\n衝：按住「衝」或者 Shift。\n互動：行近之後撳「互動」或者 E。\n\n先四周圍走吓，再去校門任務板揀任務。",
      buttons: [{ label: "開始逛校園", primary: true, onClick: () => { closeDialog(); joyEl.classList.add("hint"); } }],
    });
  }

  function missionById(id) { return MISSIONS.find((m) => m.id === id); }

  function openBoard() {
    if (state.mission) {
      openDialog({
        title: "任務進行中",
        body: "你而家做緊「" + state.mission.title + "」。\n" + objectiveLine(),
        buttons: [
          { label: "繼續做", primary: true, onClick: closeDialog },
          { label: "放棄任務", warn: true, onClick: confirmAbandon },
        ],
      });
      return;
    }
    const allDone = MISSIONS.every((m) => state.done.has(m.id));
    openDialog({
      title: "任務板",
      body: allDone
        ? "三個任務都完成喇！可以再玩，或者繼續逛校園。"
        : "揀一個任務。跟著白色路點行就得。",
      buttons: [
        ...MISSIONS.map((m) => ({
          label: (state.done.has(m.id) ? "★ " : "") + m.title,
          detail: m.blurb,
          onClick: () => openBrief(m.id),
        })),
        { label: "返回校園", onClick: closeDialog },
      ],
    });
  }

  function openBrief(id) {
    const m = missionById(id);
    openDialog({
      title: m.title,
      body: m.intro,
      buttons: [
        { label: "開始任務", primary: true, onClick: () => startMission(id) },
        { label: "返回", onClick: openBoard },
      ],
    });
  }

  function startMission(id) {
    const m = missionById(id);
    state.mission = m;
    state.carrying = false;
    state.timeLeft = m.time || 0;
    state.everStarted = true;
    state.grace = 1.25;
    state.catching = 0;
    state.resolving = false;
    state.pathTimer = 0;
    joyEl.classList.remove("hint");
    closeDialog();
    toast("開始：" + m.title);
    announce("開始任務，" + m.title + "。" + objectiveLine());
  }

  function confirmAbandon() {
    openDialog({
      title: "放棄任務？",
      body: "可以隨時返任務板再開始。",
      buttons: [
        { label: "繼續任務", primary: true, onClick: closeDialog },
        { label: "放棄", warn: true, onClick: () => {
          state.mission = null;
          state.carrying = false;
          state.catching = 0;
          state.resolving = false;
          closeDialog();
          announce("已放棄任務");
        } },
      ],
    });
  }

  function retryMission() {
    const m = state.mission;
    if (!m) return;
    player.x = START.x;
    player.y = START.y;
    player.floor = 0;
    player.vx = 0;
    player.vy = 0;
    player.safeX = START.x;
    player.safeY = START.y;
    state.carrying = false;
    state.timeLeft = m.time || 0;
    state.catching = 0;
    state.resolving = false;
    state.grace = 1.3;
    state.stairArmed = true;
    state.snapCam = true;
    state.pathTimer = 0;
    closeDialog();
  }

  function completeMission() {
    const m = state.mission;
    if (!m || state.resolving) return;
    state.resolving = true;
    state.done.add(m.id);
    persist();
    burst(player.x, player.y - 10);
    chimeWin();
    state.mission = null;
    state.carrying = false;
    updateStars();
    openDialog({
      title: m.winTitle,
      body: m.win,
      buttons: [{ label: "繼續逛校園", primary: true, onClick: () => { state.resolving = false; closeDialog(); } }],
    });
  }

  function failMission(reason) {
    const m = state.mission;
    if (!m || state.resolving) return;
    state.resolving = true;
    state.catching = 0;
    player.vx = 0;
    player.vy = 0;
    chimeFail();
    const seen = reason === "seen";
    openDialog({
      title: seen ? m.failTitle : m.failTitle,
      body: seen ? m.fail : m.fail,
      buttons: [
        { label: "再試一次", primary: true, onClick: retryMission },
        { label: "返回校園", onClick: () => {
          state.mission = null;
          state.carrying = false;
          state.resolving = false;
          closeDialog();
        } },
      ],
    });
  }

  function doInteract(forced) {
    if (state.dialog || state.catching > 0) return;
    const target = forced || nearestInteract();
    if (!target) return;
    unlockAudio();
    chimeSoft();
    if (target.kind === "board") return openBoard();
    if (target.kind === "librarian") {
      if (state.mission?.id === "homework" && state.carrying) return completeMission();
      if (state.mission?.id === "homework") {
        return openDialog({
          title: "黃老師",
          body: "功課簿應該喺小花園，行到光圈度就會攞起。",
          buttons: [{ label: "好呀", primary: true, onClick: closeDialog }],
        });
      }
      return openDialog({
        title: "黃老師",
        body: "歡迎嚟圖書館。睇書要輕聲啲呀。",
        buttons: [{ label: "知道喇", primary: true, onClick: closeDialog }],
      });
    }
    if (target.kind === "teacher") {
      const body = state.mission?.id === "stealth"
        ? "佢望緊通道。黃色範圍入面會被見到，等佢行開先。"
        : "小逸，記得準時返班。想挑戰吓，可以去校門任務板睇吓。";
      return openDialog({
        title: "陳老師",
        body,
        buttons: [{ label: "好呀", primary: true, onClick: closeDialog }],
      });
    }
    if (target.kind === "kid") {
      const line = target.npc?.id === "kit"
        ? "滑梯好好玩！校門個任務板可以接任務呀。"
        : "我哋喺操場玩緊。一齊玩就唔好推人。";
      return openDialog({
        title: target.name,
        body: line,
        buttons: [{ label: "一齊玩得開心", primary: true, onClick: closeDialog }],
      });
    }
    if (target.kind === "janitor") {
      return openDialog({
        title: "林校工",
        body: "校園乾淨，全靠大家。今日飯堂有蒸蛋同菜芯。",
        buttons: [{ label: "謝謝林校工", primary: true, onClick: closeDialog }],
      });
    }
    if (target.kind === "cat") {
      return openDialog({
        title: "糯米",
        body: "校園貓糯米瞇住眼。你輕輕摸一摸，佢發出呼嚕聲。",
        buttons: [{ label: "拜拜糯米", primary: true, onClick: closeDialog }],
      });
    }
    if (target.kind === "gate") {
      return openDialog({
        title: "校門",
        body: "而家係上課時間，我哋留喺校園入面玩啦。",
        buttons: [{ label: "好呀", primary: true, onClick: closeDialog }],
      });
    }
    if (target.kind === "fountain") {
      return openDialog({
        title: "飲水機",
        body: "記得飲水，慢慢喝。",
        buttons: [{ label: "喝咗兩口", primary: true, onClick: closeDialog }],
      });
    }
  }

  function updateStars() {
    $("stars").textContent = MISSIONS.map((m) => (state.done.has(m.id) ? "★" : "☆")).join("");
    $("stars").setAttribute("aria-label", "完成咗 " + state.done.size + " 個任務");
  }

  function teacherSees() {
    if (player.floor !== 0) return false;
    const dx = player.x - teacher.x;
    const dy = player.y - teacher.y;
    const d = Math.hypot(dx, dy);
    if (lineBlocked(teacher.x, teacher.y, player.x, player.y, groundSolids)) return false;
    if (d < VIS_R) return true;
    let diff = Math.atan2(dy, dx) - teacher.facing;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return Math.abs(diff) < CONE_A && d < CONE_R;
  }

  function updateTeacher(dt) {
    if (teacher.pause > 0) {
      teacher.pause -= dt;
      teacher.moving = false;
      teacher.phase += dt * 2;
      return;
    }
    const dest = TEACHER_PATH[teacher.i];
    const dx = dest.x - teacher.x;
    const dy = dest.y - teacher.y;
    const d = Math.hypot(dx, dy) || 0.0001;
    if (d < 3) {
      teacher.pause = 3;
      if (teacher.dir > 0) {
        if (teacher.i >= TEACHER_PATH.length - 1) { teacher.dir = -1; teacher.i = TEACHER_PATH.length - 2; }
        else teacher.i += 1;
      } else if (teacher.i <= 0) { teacher.dir = 1; teacher.i = 1; }
      else teacher.i -= 1;
      teacher.i = clamp(teacher.i, 0, TEACHER_PATH.length - 1);
      return;
    }
    const spd = 50;
    teacher.x += (dx / d) * spd * dt;
    teacher.y += (dy / d) * spd * dt;
    teacher.facing = Math.atan2(dy, dx);
    teacher.moving = true;
    teacher.phase += dt * 8;
  }

  function updateKids(dt) {
    for (const kid of npcs) {
      if (kid.kind !== "kid") continue;
      if (!kid.tx || dist(kid.x, kid.y, kid.tx, kid.ty) < 8) {
        kid.tx = kid.home.x + Math.random() * kid.home.w;
        kid.ty = kid.home.y + Math.random() * kid.home.h;
      }
      const dx = kid.tx - kid.x;
      const dy = kid.ty - kid.y;
      const d = Math.hypot(dx, dy) || 1;
      const nx = kid.x + (dx / d) * 28 * dt;
      const ny = kid.y + (dy / d) * 28 * dt;
      if (!circleHits(nx, ny, kid.r, groundSolids)) {
        kid.x = nx;
        kid.y = ny;
        kid.facing = Math.atan2(dy, dx);
        kid.moving = true;
        kid.phase += dt * 8;
      } else {
        kid.tx = 0;
        kid.moving = false;
      }
    }
  }

  function stairCore() {
    const inset = 16;
    return {
      x: STAIRS.x + inset,
      y: STAIRS.y + inset,
      w: STAIRS.w - inset * 2,
      h: STAIRS.h - inset * 2,
    };
  }

  function updateStairs() {
    const onStairs = inRect(player.x, player.y, stairCore());
    if (onStairs && !circleHits(player.x, player.y, PLAYER_R - 1, solidsFor(player.floor))) {
      if (state.stairArmed) {
        player.floor = player.floor === 0 ? 1 : 0;
        state.stairArmed = false;
        state.snapCam = true;
        state.pathTimer = 0;
        player.safeX = player.x;
        player.safeY = player.y;
        banner(player.floor === 1 ? "上到天台" : "落返地下");
        chimeSoft();
      }
    } else if (!onStairs) state.stairArmed = true;
  }

  function updateMission(dt) {
    const m = state.mission;
    if (!m || state.resolving) return;
    if (m.id === "ontime") {
      state.timeLeft -= dt;
      if (state.timeLeft <= 0) { state.timeLeft = 0; failMission("time"); return; }
      if (player.floor === 0 && dist(player.x, player.y, CLASS_GOAL.x, CLASS_GOAL.y) < 56) completeMission();
    } else if (m.id === "homework") {
      if (!state.carrying && dist(player.x, player.y, BOOK.x, BOOK.y) < 40) {
        state.carrying = true;
        state.pathTimer = 0;
        toast("攞到功課簿！交去圖書館黃老師。");
        chimeOk();
      }
      if (state.carrying && dist(player.x, player.y, 730, 318) < 50) completeMission();
    } else if (m.id === "stealth") {
      if (state.grace > 0) state.grace -= dt;
      else if (state.catching > 0) {
        state.catching -= dt;
        player.vx = 0;
        player.vy = 0;
        if (state.catching <= 0) failMission("seen");
      } else if (teacherSees()) {
        state.catching = 0.45;
        chimeFail();
      }
      if (!state.resolving && player.floor === 1 && dist(player.x, player.y, VIEWPOINT.x, VIEWPOINT.y) < 54) {
        completeMission();
      }
    }
  }

  function updatePath(dt) {
    if (!state.mission) { state.path = null; return; }
    state.pathTimer -= dt;
    if (state.pathTimer > 0) return;
    state.pathTimer = 0.35;
    const goal = guidePoint();
    if (!goal) { state.path = null; return; }
    state.path = findPath(gridFor(player.floor), player.x, player.y, goal.x, goal.y);
  }

  function inputVector() {
    let x = 0;
    let y = 0;
    if (keys.has("a") || keys.has("arrowleft")) x -= 1;
    if (keys.has("d") || keys.has("arrowright")) x += 1;
    if (keys.has("w") || keys.has("arrowup")) y -= 1;
    if (keys.has("s") || keys.has("arrowdown")) y += 1;
    if (joy.active) { x += joy.x; y += joy.y; }
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    return { x, y, mag: Math.min(1, m) };
  }

  function updatePlayer(dt) {
    if (state.catching > 0) return;
    const wish = inputVector();
    const sprint = sprintHeld || keys.has("shift");
    const maxSpeed = (sprint ? SPRINT : WALK) * (wish.mag > 0 ? 1 : 0);
    const rate = 1 - Math.exp(-14 * dt);
    player.vx += (wish.x * (sprint ? SPRINT : WALK) - player.vx) * rate;
    player.vy += (wish.y * (sprint ? SPRINT : WALK) - player.vy) * rate;
    if (wish.mag < 0.08) {
      player.vx += (0 - player.vx) * rate;
      player.vy += (0 - player.vy) * rate;
      if (Math.hypot(player.vx, player.vy) < 6) { player.vx = 0; player.vy = 0; }
    }
    void maxSpeed;
    const moving = Math.hypot(player.vx, player.vy) > 8;
    if (moving) {
      player.facing = Math.atan2(player.vy, player.vx);
      player.phase += dt * (sprint && wish.mag > 0.4 ? 14 : 9);
      joyEl.classList.remove("hint");
      state.everMoved = true;
    } else player.phase += dt * 2;
    player.moving = moving;
    const solids = solidsFor(player.floor);
    const travel = Math.hypot(player.vx, player.vy) * dt;
    const steps = Math.max(1, Math.ceil(travel / 5));
    const sdx = (player.vx * dt) / steps;
    const sdy = (player.vy * dt) / steps;
    for (let i = 0; i < steps; i++) {
      const ox = player.x;
      player.x += sdx;
      if (circleHits(player.x, player.y, PLAYER_R, solids) || hitsNpc(player.x, player.y)) player.x = ox;
      const oy = player.y;
      player.y += sdy;
      if (circleHits(player.x, player.y, PLAYER_R, solids) || hitsNpc(player.x, player.y)) player.y = oy;
    }
    separateFromNpcs();
    if (circleHits(player.x, player.y, PLAYER_R, solids)) {
      player.x = player.safeX;
      player.y = player.safeY;
    } else {
      player.safeX = player.x;
      player.safeY = player.y;
    }
    if (moving && sprint && !reduceMotion && Math.random() < 0.45) {
      dust.push({ x: player.x - Math.cos(player.facing) * 8, y: player.y + 8, life: 0.32, r: 3 + Math.random() * 3 });
    }
  }

  function hitsNpc(x, y) {
    for (const n of npcs) {
      if (n.floor !== player.floor) continue;
      if (dist(x, y, n.x, n.y) < PLAYER_R + n.r - 0.5) return true;
    }
    return false;
  }

  function separateFromNpcs() {
    for (const n of npcs) {
      if (n.floor !== player.floor) continue;
      const dx = player.x - n.x;
      const dy = player.y - n.y;
      const d = Math.hypot(dx, dy) || 0.001;
      const min = PLAYER_R + n.r;
      if (d < min) {
        player.x = n.x + (dx / d) * min;
        player.y = n.y + (dy / d) * min;
      }
    }
  }

  function update(dt) {
    updatePlayer(dt);
    updateTeacher(dt);
    updateKids(dt);
    npcs.forEach((n) => { if (n.kind === "janitor") n.phase += dt * 3; });
    updateStairs();
    updateMission(dt);
    updatePath(dt);
    const zone = currentZone();
    if (zone.id !== state.zoneId) {
      state.zoneId = zone.id;
      if ((zone.id === "grove" || zone.id === "nook") && !state.seenZones.has(zone.id)) {
        state.seenZones.add(zone.id);
        toast(zone.id === "grove" ? "你發現秘密小樹林！糯米喺度。" : "你發現隱藏角落！有架紙飛機。");
        chimeOk();
      }
    }
  }

  function updateAmbient(dt) {
    for (const c of confetti) {
      c.life -= dt;
      c.vy += 280 * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
    }
    confetti = confetti.filter((c) => c.life > 0);
    for (const d of dust) d.life -= dt;
    dust = dust.filter((d) => d.life > 0);
    for (const b of birds) {
      b.x += b.v * dt;
      if (b.x > WORLD.w + 30) b.x = -30;
    }
  }

  function updateCamera(dt) {
    const cssW = canvas.clientWidth || window.innerWidth;
    const cssH = canvas.clientHeight || window.innerHeight;
    const zoom = cssW < 720 ? 0.92 : cssW < 1100 ? 1.05 : 1.18;
    const viewW = cssW / zoom;
    const viewH = cssH / zoom;
    const anchor = cssH > cssW ? 0.6 : 0.48;
    let desX = player.x - viewW / 2;
    let desY = player.y - viewH * anchor;
    if (viewW >= WORLD.w) desX = (WORLD.w - viewW) / 2;
    else desX = clamp(desX, 0, WORLD.w - viewW);
    if (viewH >= WORLD.h) desY = (WORLD.h - viewH) / 2;
    else desY = clamp(desY, 0, WORLD.h - viewH);
    if (!state.camReady || state.snapCam) {
      camX = desX;
      camY = desY;
      state.camReady = true;
      state.snapCam = false;
    } else {
      const k = 1 - Math.exp(-8 * dt);
      camX += (desX - camX) * k;
      camY += (desY - camY) * k;
    }
    state.zoom = zoom;
    state.cssW = cssW;
    state.cssH = cssH;
    state.viewW = viewW;
    state.viewH = viewH;
  }

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    state.dpr = dpr;
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(src));
      img.src = src;
    });
  }

  function prepTile(img, sx, sy, sw, sh, band, size) {
    const S = size || 180;
    const cnv = document.createElement("canvas");
    cnv.width = S;
    cnv.height = S;
    const g = cnv.getContext("2d", { willReadFrequently: true });
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = "high";
    g.drawImage(img, sx, sy, sw, sh, 0, 0, S, S);
    if (band > 0) {
      try {
        const image = g.getImageData(0, 0, S, S);
        const srcPx = image.data;
        const out = new Uint8ClampedArray(srcPx);
        for (let y = 0; y < S; y++) {
          for (let x = 0; x < S; x++) {
            const dx = x < band ? (band - x) / band : x >= S - band ? (x - (S - band) + 1) / band : 0;
            const dy = y < band ? (band - y) / band : y >= S - band ? (y - (S - band) + 1) / band : 0;
            const e = Math.min(1, Math.max(dx, dy));
            if (e <= 0) continue;
            const ox = x < band ? S - band + x : x >= S - band ? x - (S - band) : x;
            const oy = y < band ? S - band + y : y >= S - band ? y - (S - band) : y;
            const i = (y * S + x) * 4;
            const j = (oy * S + ox) * 4;
            const t = e * 0.72;
            out[i] = srcPx[i] * (1 - t) + srcPx[j] * t;
            out[i + 1] = srcPx[i + 1] * (1 - t) + srcPx[j + 1] * t;
            out[i + 2] = srcPx[i + 2] * (1 - t) + srcPx[j + 2] * t;
          }
        }
        image.data.set(out);
        g.putImageData(image, 0, 0);
      } catch (err) { /* pattern still usable if the canvas is tainted */ }
    }
    art.keep.push(cnv);
    return cnv;
  }

  function loadArt() {
    return Promise.all([
      loadImage("img/xiaole.png"),
      loadImage("img/npcs.png"),
      loadImage("img/tiles.png"),
      loadImage("img/props.png"),
    ]).then(([xiaole, npcs, tiles, props]) => {
      art.xiaole = xiaole;
      art.npcs = npcs;
      art.props = props;
      const specs = {
        grass: { r: [20, 16, 248, 200], band: 20, size: 168 },
        sand: { r: [288 + 64, 24, 160, 240], band: 10, size: 150 },
        play: { r: [576 + 12, 12, 264, 264], band: 10, size: 168 },
        court: { r: [864 + 36, 24, 210, 240], band: 14, size: 168 },
        lib: { r: [12, 288 + 8, 264, 220], band: 8, size: 160 },
        class: { r: [288 + 10, 288 + 8, 264, 210], band: 8, size: 150 },
        hall: { r: [576 + 12, 288 + 8, 264, 220], band: 8, size: 150 },
        canteen: { r: [864 + 20, 288 + 20, 248, 248], band: 10, size: 140 },
        roof: { r: [20, 576 + 24, 248, 220], band: 8, size: 96 },
        hedge: { r: [288 + 8, 576 + 8, 270, 240], band: 16, size: 120 },
        flower: { r: [576 + 10, 576 + 8, 268, 250], band: 14, size: 140 },
      };
      for (const key of Object.keys(specs)) {
        const s = specs[key];
        const tile = prepTile(tiles, s.r[0], s.r[1], s.r[2], s.r[3], s.band, s.size);
        if (key === "sand") {
          const g = tile.getContext("2d");
          const stones = [[28, 36, 6], [78, 22, 4], [120, 48, 5], [46, 96, 3.5], [100, 110, 6], [64, 70, 3], [132, 88, 4]];
          for (const [x, y, r] of stones) {
            g.fillStyle = "rgba(176, 150, 112, 0.72)";
            g.beginPath();
            g.ellipse(x, y, r, r * 0.72, 0.5, 0, Math.PI * 2);
            g.fill();
          }
        }
        art.pat[key] = ctx.createPattern(tile, "repeat");
      }
      art.ready = true;
    });
  }

  function facingDir(facing) {
    const deg = (((facing || 0) * 180 / Math.PI) % 360 + 360) % 360;
    if (deg >= 45 && deg < 135) return 0;
    if (deg >= 135 && deg < 225) return 1;
    if (deg >= 225 && deg < 315) return 3;
    return 2;
  }

  function walkColumn(row, phase, moving) {
    if (!moving || reduceMotion) return 0;
    const seq = row === 3 ? [1, 3, 1, 3] : [1, 2, 3, 2];
    const i = Math.floor(Math.abs(phase) / 1.15) % seq.length;
    return seq[i];
  }

  function blit(c, img, rect, dx, dy, dw, dh) {
    c.drawImage(img, rect[0], rect[1], rect[2], rect[3], dx, dy, dw, dh);
  }

  function fillRound(c, x, y, w, h, radius, pattern) {
    c.save();
    roundRect(c, x, y, w, h, radius);
    c.clip();
    c.fillStyle = pattern;
    c.fillRect(x, y, w, h);
    c.restore();
  }

  function drawGround(c) {
    c.fillStyle = art.pat.grass;
    c.fillRect(0, 0, WORLD.w, WORLD.h);
    fillRound(c, surfaces[0].x, surfaces[0].y, surfaces[0].w, surfaces[0].h, 18, art.pat.play);
    fillRound(c, surfaces[1].x, surfaces[1].y, surfaces[1].w, surfaces[1].h, 18, art.pat.court);
    for (const p of paths) fillRound(c, p.x, p.y, p.w, p.h, 16, art.pat.sand);
    if (state.mission?.id === "stealth") drawVision(c);
    for (const b of compounds) drawCompound(c, b);
    for (const p of props) drawProp(c, p);
    drawStairs(c);
    drawFence(c);
    drawArch(c);
    drawHopscotch(c);
    c.save();
    roundRect(c, 628, 732, 144, 40, 12);
    c.fillStyle = "rgba(255, 248, 236, 0.78)";
    c.fill();
    c.lineWidth = 3;
    c.strokeStyle = INK;
    c.stroke();
    c.fillStyle = "#a61e4d";
    c.font = "700 20px " + FONT;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("開心學習", 700, 752);
    c.restore();
  }

  function drawRoof(c) {
    const sky = c.createLinearGradient(0, 0, 0, WORLD.h);
    sky.addColorStop(0, "#9fd4f5");
    sky.addColorStop(1, "#e7f6ff");
    c.fillStyle = sky;
    c.fillRect(0, 0, WORLD.w, WORLD.h);
    for (const cloud of clouds) {
      const x = ((cloud.x + ambient * 14 * cloud.s) % (WORLD.w + 240)) - 120;
      c.fillStyle = "rgba(255,255,255,0.92)";
      c.beginPath();
      c.ellipse(x, cloud.y, 40 * cloud.s, 18 * cloud.s, 0, 0, Math.PI * 2);
      c.ellipse(x + 30 * cloud.s, cloud.y + 4, 26 * cloud.s, 16 * cloud.s, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = "rgba(255, 214, 102, 0.35)";
    c.beginPath();
    c.arc(620, 150, 48, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#ffd56a";
    c.strokeStyle = "#e09a2e";
    c.lineWidth = 3;
    c.beginPath();
    c.arc(620, 150, 28, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    roundRect(c, 1064, 80, 752, 372, 12);
    c.fillStyle = art.pat.roof;
    c.fill();
    c.lineWidth = 4;
    c.strokeStyle = INK;
    c.stroke();
    c.fillStyle = "#f0ddc0";
    c.fillRect(1064, 80, 752, 28);
    c.fillRect(1064, 80, 28, 372);
    c.fillRect(1786, 80, 30, 372);
    c.fillRect(1064, 422, 36, 30);
    c.fillRect(1230, 422, 586, 30);
    c.fillStyle = "#e07a45";
    c.fillRect(1092, 80, 694, 8);
    drawTank(c, 1500, 122);
    drawTank(c, 1584, 122);
    c.fillStyle = "rgba(255, 214, 90, 0.45)";
    c.strokeStyle = "#e09a2e";
    c.lineWidth = 3;
    c.beginPath();
    c.arc(VIEWPOINT.x, VIEWPOINT.y, 30, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = "#e7c08a";
    roundRect(c, VIEWPOINT.x - 24, VIEWPOINT.y + 12, 48, 16, 5);
    c.fill();
    c.strokeStyle = INK;
    c.stroke();
    drawStairs(c);
  }

  function drawStairs(c) {
    const x = STAIRS.x + 8;
    const y = STAIRS.y + 8;
    const w = STAIRS.w - 16;
    const h = STAIRS.h - 14;
    roundRect(c, x, y, w, h, 8);
    c.fillStyle = "#f4e2c4";
    c.fill();
    c.strokeStyle = INK;
    c.lineWidth = 3;
    c.stroke();
    c.fillStyle = "#b8884e";
    c.fillRect(x + 7, y + 8, 8, h - 16);
    c.fillRect(x + w - 15, y + 8, 8, h - 16);
    c.fillStyle = "#e7c48a";
    c.strokeStyle = "#8a5a34";
    c.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const sy = y + 12 + i * 14;
      roundRect(c, x + 18, sy, w - 36, 8, 2);
      c.fill();
      c.stroke();
    }
  }

  function drawTank(c, x, y) {
    c.fillStyle = "#7ec8e3";
    c.strokeStyle = INK;
    c.lineWidth = 3;
    roundRect(c, x, y, 62, 46, 10);
    c.fill();
    c.stroke();
    c.fillStyle = "rgba(255,255,255,0.55)";
    roundRect(c, x + 8, y + 8, 46, 12, 5);
    c.fill();
  }

  function drawVision(c) {
    c.save();
    c.translate(teacher.x, teacher.y);
    c.rotate(teacher.facing);
    c.fillStyle = state.catching > 0 ? "rgba(255, 120, 70, 0.38)" : "rgba(255, 206, 70, 0.34)";
    c.beginPath();
    c.moveTo(0, 0);
    c.arc(0, 0, CONE_R, -CONE_A, CONE_A);
    c.closePath();
    c.fill();
    c.beginPath();
    c.arc(0, 0, VIS_R, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  const FLOOR_PAT = {
    library: "lib",
    class: "class",
    hall: "hall",
    canteen: "canteen",
    garden: "flower",
    grove: "grass",
    nook: "grass",
  };

  function drawCompound(c, b) {
    const t = b.t || 24;
    c.save();
    c.globalAlpha = 0.14;
    c.fillStyle = "#5c4636";
    roundRect(c, b.x + 6, b.y + 8, b.w, b.h, 16);
    c.fill();
    c.restore();
    roundRect(c, b.x, b.y, b.w, b.h, 16);
    if (b.hedge) {
      c.fillStyle = art.pat.hedge;
      c.fill();
    } else {
      c.fillStyle = "#f6e6c8";
      c.fill();
      c.save();
      roundRect(c, b.x, b.y, b.w, b.h, 16);
      c.clip();
      const roof = c.createLinearGradient(0, b.y, 0, b.y + t + 6);
      roof.addColorStop(0, "#e07a45");
      roof.addColorStop(1, "#c75b34");
      c.fillStyle = roof;
      c.fillRect(b.x, b.y, b.w, t + 4);
      c.restore();
    }
    c.lineWidth = 4;
    c.strokeStyle = INK;
    roundRect(c, b.x, b.y, b.w, b.h, 16);
    c.stroke();
    const floorKey = FLOOR_PAT[b.id] || "grass";
    fillRound(c, b.x + t, b.y + t, b.w - t * 2, b.h - t * 2, 8, art.pat[floorKey]);
    if (b.floorLabel) {
      c.save();
      c.globalAlpha = b.hedge ? 0.55 : 0.42;
      c.fillStyle = b.hedge ? "#1b4332" : "#5c4636";
      c.font = "700 30px " + FONT;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(b.floorLabel, b.x + b.w / 2, b.y + b.h / 2 + 8);
      c.restore();
    }
    const holes = b.doors || {};
    for (const side of Object.keys(holes)) {
      for (const gap of holes[side]) drawDoorMat(c, b, side, gap, t);
    }
  }

  function drawDoorMat(c, b, side, gap, t) {
    const hole = doorHole(b, side, gap, t);
    const reach = 10;
    let x = hole.x;
    let y = hole.y;
    let w = hole.w;
    let h = hole.h;
    if (side === "s") h += reach;
    else if (side === "n") { y -= reach; h += reach; }
    else if (side === "e") w += reach;
    else { x -= reach; w += reach; }
    fillRound(c, x, y, w, h, 12, art.pat.sand);
  }

  function doorHole(b, side, gap, t) {
    const extra = 16;
    if (side === "n") return { x: b.x + gap.offset, y: b.y - extra, w: gap.length, h: t + extra * 2 };
    if (side === "s") return { x: b.x + gap.offset, y: b.y + b.h - t - extra, w: gap.length, h: t + extra * 2 };
    if (side === "w") return { x: b.x - extra, y: b.y + gap.offset, w: t + extra * 2, h: gap.length };
    return { x: b.x + b.w - t - extra, y: b.y + gap.offset, w: t + extra * 2, h: gap.length };
  }

  function drawPropShadow(c, x, y, w) {
    c.fillStyle = "rgba(70, 45, 25, 0.16)";
    c.beginPath();
    c.ellipse(x, y, Math.max(8, w * 0.32), 5.5, 0, 0, Math.PI * 2);
    c.fill();
  }

  function drawProp(c, p) {
    const src = PROP_SRC[p.type];
    if (!src) return;
    if (p.type === "partition") {
      const segW = 86;
      const segH = segW * (src[3] / src[2]);
      const n = Math.max(1, Math.round(Math.max(p.w, p.h) / 52));
      for (let i = 0; i < n; i++) {
        const along = (i + 0.5) / n;
        const cx = p.x + p.w * (p.w >= p.h ? along : 0.5);
        const cy = p.y + p.h * (p.h > p.w ? along : 0.5);
        drawPropShadow(c, cx, cy + 4, segW * 0.7);
        blit(c, art.props, src, cx - segW / 2, cy - segH + 8, segW, segH);
      }
      return;
    }
    if (p.type === "shelf" || p.type === "desk" || p.type === "counter" || p.type === "chair") {
      const unitH = p.type === "shelf" ? 58 : p.type === "desk" ? 56 : p.type === "counter" ? 64 : 50;
      const unitW = unitH * (src[2] / src[3]);
      const n = Math.max(1, Math.round(p.w / (unitW * 0.96)));
      const gap = p.w / n;
      const bottom = p.y + p.h;
      for (let i = 0; i < n; i++) {
        const cx = p.x + gap * (i + 0.5);
        drawPropShadow(c, cx, bottom, unitW);
        blit(c, art.props, src, cx - unitW / 2, bottom - unitH, unitW, unitH);
      }
      return;
    }
    const heights = { board: 118, table: 58, stage: 76, slide: 112, swing: 112, climb: 100, fountain: 70 };
    const dh = heights[p.type] || Math.max(p.h, 48);
    const dw = dh * (src[2] / src[3]);
    const cx = p.x + p.w / 2;
    const bottom = p.type === "board" ? p.y + 22 : p.y + p.h;
    drawPropShadow(c, cx, bottom, dw);
    blit(c, art.props, src, cx - dw / 2, bottom - dh, dw, dh);
    if (p.type === "board") {
      c.font = "700 16px " + FONT;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.lineWidth = 4;
      c.strokeStyle = "#fff6e4";
      const labelY = bottom - dh * 0.2;
      c.strokeText("任務板", cx, labelY);
      c.fillStyle = "#6b3f1f";
      c.fillText("任務板", cx, labelY);
    }
  }

  function drawFence(c) {
    c.save();
    c.beginPath();
    c.rect(0, 0, WORLD.w, 34);
    c.rect(0, WORLD.h - 34, WORLD.w, 34);
    c.rect(0, 0, 34, WORLD.h);
    c.rect(WORLD.w - 34, 0, 34, WORLD.h);
    c.clip();
    c.fillStyle = art.pat.hedge;
    c.fillRect(0, 0, WORLD.w, WORLD.h);
    c.restore();
    c.strokeStyle = "#2f6b32";
    c.lineWidth = 3;
    c.strokeRect(34, 34, WORLD.w - 68, WORLD.h - 68);
  }

  function drawArch(c) {
    const src = PROP_SRC.gate;
    const dw = 320;
    const dh = dw * (src[3] / src[2]);
    const cx = 1523;
    const top = 1302;
    const bottom = top + dh;
    drawPropShadow(c, cx, bottom - 4, dw * 0.72);
    blit(c, art.props, src, cx - dw / 2, top, dw, dh);
    c.font = "700 22px " + FONT;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = "#7a3e12";
    c.fillText("圓形小學", cx, top + dh * 0.55);
  }

  function drawHopscotch(c) {
    c.strokeStyle = "#8a5a34";
    c.lineWidth = 2;
    c.fillStyle = "#6b3f1f";
    c.font = "700 14px " + FONT;
    c.textAlign = "center";
    c.textBaseline = "middle";
    for (let i = 0; i < 4; i++) {
      const x = 560 + (i % 2) * 34;
      const y = 1270 + i * 32;
      c.strokeRect(x, y, 28, 28);
      c.fillText(String(i + 1), x + 14, y + 15);
    }
  }

  function drawTree(c, t, index) {
    const bush = t.r < 26 && index % 2 === 0;
    const src = bush ? PROP_SRC.bush : (index % 2 ? PROP_SRC.treeB : PROP_SRC.treeA);
    const dh = t.r * (bush ? 2.7 : 3.35);
    const dw = dh * (src[2] / src[3]);
    const bottom = t.y + 6;
    drawPropShadow(c, t.x, bottom, dw * 0.7);
    blit(c, art.props, src, t.x - dw / 2, bottom - dh, dw, dh);
  }

  function actorFrames(actor) {
    if (actor.kind === "player") {
      const row = facingDir(actor.facing);
      const col = walkColumn(row, actor.phase || 0, actor.moving);
      return { img: art.xiaole, rect: XIAOLE[row][col], dh: 80 };
    }
    if (actor.kind === "cat") return { img: art.npcs, rect: NPC_FRAMES.cat[0], dh: 48 };
    const who = actor.kind === "teacher" ? "chen"
      : actor.kind === "librarian" ? "huang"
      : actor.kind === "janitor" ? "lin"
      : actor.id === "min" ? "min" : "kit";
    const col = facingDir(actor.facing);
    const dh = who === "kit" || who === "min" ? 62 : 76;
    return { img: art.npcs, rect: NPC_FRAMES[who][col], dh };
  }

  function drawIllustratedActor(c, actor) {
    const frame = actorFrames(actor);
    const rect = frame.rect;
    const dw = frame.dh * (rect[2] / rect[3]);
    const bob = actor.moving && !reduceMotion ? Math.sin((actor.phase || 0) * 2) * 1.1 : 0;
    c.fillStyle = "rgba(70, 45, 25, 0.18)";
    c.beginPath();
    c.ellipse(actor.x, actor.y + 2, Math.max(9, dw * 0.28), 5, 0, 0, Math.PI * 2);
    c.fill();
    blit(c, frame.img, rect, actor.x - dw / 2, actor.y - frame.dh + bob, dw, frame.dh);
    if (actor.kind === "player" && state.carrying) {
      const dir = facingDir(actor.facing);
      const ox = dir === 1 ? -16 : dir === 2 ? 16 : 8;
      const oy = dir === 3 ? -frame.dh + 18 : dir === 0 ? -8 : -frame.dh * 0.42;
      c.save();
      c.translate(actor.x + ox, actor.y + oy);
      roundRect(c, -8, -10, 16, 12, 2);
      c.fillStyle = "#4c6ef5";
      c.fill();
      c.lineWidth = 2;
      c.strokeStyle = INK;
      c.stroke();
      c.fillStyle = "#fff";
      c.fillRect(-1, -8, 2, 8);
      c.restore();
    }
  }

  function drawChibi(c, p, style, opts) {
    drawIllustratedActor(c, p);
    void style;
    void opts;
  }

  function drawCat(c, cat) {
    drawIllustratedActor(c, cat);
  }
  function drawLabel(c, x, y, textLabel) {
    c.font = "700 14px " + FONT;
    const w = c.measureText(textLabel).width + 12;
    roundRect(c, x - w / 2, y - 18, w, 18, 8);
    c.fillStyle = "rgba(255, 250, 240, 0.94)";
    c.fill();
    c.lineWidth = 2;
    c.strokeStyle = INK;
    c.stroke();
    c.fillStyle = INK;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(textLabel, x, y - 9);
  }

  function drawSign(c, s) {
    c.font = "700 20px " + FONT;
    const w = Math.max(84, c.measureText(s.text).width + 22);
    c.fillStyle = "#8d5a32";
    c.fillRect(s.x - 3, s.y, 6, 20);
    roundRect(c, s.x - w / 2, s.y - 30, w, 30, 8);
    c.fillStyle = "#fff8ea";
    c.fill();
    c.lineWidth = 3;
    c.strokeStyle = INK;
    c.stroke();
    c.fillStyle = "#7a3e12";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(s.text, s.x, s.y - 15);
  }

  function drawRing(c, x, y, r, color) {
    const pulse = 1 + Math.sin(ambient * 5) * 0.08;
    c.save();
    c.strokeStyle = color;
    c.lineWidth = 4;
    c.globalAlpha = 0.9;
    c.beginPath();
    c.arc(x, y, r * pulse, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }

  function drawPin(c, x, y) {
    const bob = reduceMotion ? 0 : Math.sin(ambient * 5) * 5;
    c.save();
    c.translate(x, y + bob);
    c.fillStyle = "#ff5d73";
    c.strokeStyle = INK;
    c.lineWidth = 3;
    c.beginPath();
    c.arc(0, -24, 9, 0, Math.PI * 2);
    c.moveTo(-7, -18);
    c.lineTo(0, 0);
    c.lineTo(7, -18);
    c.fill();
    c.stroke();
    c.fillStyle = "#fff";
    c.beginPath();
    c.arc(0, -24, 3, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  function drawPlane(c) {
    c.save();
    c.translate(140, 1248);
    c.rotate(-0.5);
    c.fillStyle = "#fff";
    c.strokeStyle = INK;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(26, 7);
    c.lineTo(0, 14);
    c.lineTo(7, 7);
    c.closePath();
    c.fill();
    c.stroke();
    c.restore();
  }

  function drawBookItem(c) {
    const bob = reduceMotion ? 0 : Math.sin(ambient * 3) * 4;
    c.save();
    c.translate(BOOK.x, BOOK.y + bob);
    roundRect(c, -14, -18, 28, 20, 3);
    c.fillStyle = "#4c6ef5";
    c.fill();
    c.lineWidth = 3;
    c.strokeStyle = INK;
    c.stroke();
    c.fillStyle = "#fff";
    c.fillRect(-3, -16, 4, 16);
    c.fillStyle = "#ffd43b";
    c.fillRect(-11, -12, 7, 4);
    c.restore();
  }

  function drawActors(c) {
    const list = [];
    if (player.floor === 0) {
      for (let i = 0; i < trees.length; i++) {
        const tree = trees[i];
        list.push({ y: tree.y, draw: () => drawTree(c, tree, i) });
      }
      for (const n of npcs) list.push({ y: n.y, draw: () => drawActor(c, n) });
      list.push({ y: player.y, draw: () => drawActor(c, player) });
    } else {
      list.push({ y: player.y, draw: () => drawActor(c, player) });
    }
    list.sort((a, b) => a.y - b.y);
    for (const item of list) item.draw();
  }

  function drawActor(c, actor) {
    if (actor.kind === "cat") drawCat(c, actor);
    else if (actor.kind === "player") drawChibi(c, actor, actor.style, { book: state.carrying });
    else drawChibi(c, actor, actor.style);
    if (actor.name) {
      const lift = actor.kind === "cat" ? 56 : actor.kind === "player" ? 90 : actor.kind === "kid" ? 72 : 86;
      drawLabel(c, actor.x, actor.y - lift, actor.name);
    }
    if (actor.kind === "teacher" && state.catching > 0) {
      c.fillStyle = "#ff6b6b";
      c.strokeStyle = INK;
      c.lineWidth = 2;
      c.beginPath();
      c.arc(actor.x + 18, actor.y - 96, 11, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.fillStyle = "#fff";
      c.font = "700 14px " + FONT;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText("!", actor.x + 18, actor.y - 96);
    }
  }

  function drawMissionMarks(c) {
    const m = state.mission;
    if (!m) return;
    if (state.path && state.path.length) {
      for (let i = 0; i < state.path.length; i += 1) {
        const p = state.path[i];
        const twinkle = 0.45 + (Math.sin(ambient * 4 - i * 0.35) + 1) * 0.25;
        c.globalAlpha = twinkle;
        c.fillStyle = "#fff";
        c.beginPath();
        c.arc(p.x, p.y, 4.2, 0, Math.PI * 2);
        c.fill();
      }
      c.globalAlpha = 1;
    }
    if (m.id === "ontime") {
      drawRing(c, CLASS_GOAL.x, CLASS_GOAL.y, 34, "#ff922b");
      drawPin(c, CLASS_GOAL.x, CLASS_GOAL.y);
    } else if (m.id === "homework") {
      if (!state.carrying) {
        drawRing(c, BOOK.x, BOOK.y, 26, "#4c6ef5");
        drawBookItem(c);
        drawPin(c, BOOK.x, BOOK.y);
      } else {
        drawRing(c, 730, 318, 30, "#7950f2");
        drawPin(c, 730, 318);
      }
    } else if (m.id === "stealth") {
      if (player.floor === 1) {
        drawRing(c, VIEWPOINT.x, VIEWPOINT.y, 34, "#fab005");
        drawPin(c, VIEWPOINT.x, VIEWPOINT.y);
      } else drawPin(c, STAIRS.x + STAIRS.w / 2, STAIRS.y + 20);
    }
  }

  function drawTutorialArrow(c) {
    if (state.everStarted || state.mission || state.dialog) return;
    const y = BOARD.y + 22 - 118 - 18 + (reduceMotion ? 0 : Math.sin(ambient * 5) * 6);
    c.fillStyle = "#ffd43b";
    c.strokeStyle = INK;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(BOARD.x + BOARD.w / 2, y + 16);
    c.lineTo(BOARD.x + BOARD.w / 2 - 12, y);
    c.lineTo(BOARD.x + BOARD.w / 2 + 12, y);
    c.closePath();
    c.fill();
    c.stroke();
  }

  function render() {
    const dpr = state.dpr;
    const cssW = state.cssW;
    const cssH = state.cssH;
    const zoom = state.zoom;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = player.floor === 1 ? "#9fd4f5" : "#7eb85a";
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, -camX * dpr * zoom, -camY * dpr * zoom);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    if (player.floor === 1) drawRoof(ctx);
    else drawGround(ctx);
    if (player.floor === 0) {
      drawPlane(ctx);
      for (const d of dust) {
        ctx.globalAlpha = Math.max(0, d.life * 2);
        ctx.fillStyle = "rgba(232, 210, 170, 0.8)";
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      for (const b of birds) {
        const y = b.y + Math.sin(ambient * 2 + b.p) * 12;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(b.x - 8, y);
        ctx.lineTo(b.x, y + 3);
        ctx.lineTo(b.x + 8, y);
        ctx.stroke();
      }
    }
    drawMissionMarks(ctx);
    drawActors(ctx);
    for (const s of signs) if (s.floor === player.floor) drawSign(ctx, s);
    drawTutorialArrow(ctx);
    const near = nearestInteract();
    if (near && !state.dialog) {
      const ly = near.kind === "board" ? BOARD.y + 22 - 118 - 36 : near.y - 102;
      drawLabel(ctx, near.x, ly, "互動");
    }
    for (const bit of confetti) {
      ctx.globalAlpha = Math.max(0, bit.life);
      ctx.fillStyle = bit.color;
      ctx.fillRect(bit.x, bit.y, bit.size, bit.size * 0.6);
    }
    ctx.globalAlpha = 1;
    if (debug) {
      ctx.strokeStyle = "rgba(255,0,0,0.45)";
      ctx.lineWidth = 1;
      const solids = solidsFor(player.floor);
      for (const s of solids) {
        if (s.r) { ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.stroke(); }
        else ctx.strokeRect(s.x, s.y, s.w, s.h);
      }
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawEdgeArrow(ctx, cssW, cssH);
    if (debug && issues.length) {
      ctx.fillStyle = "#fff";
      ctx.font = "14px sans-serif";
      issues.forEach((textLine, i) => ctx.fillText(textLine, 8, cssH - 20 - i * 16));
    }
    drawMinimap();
    updateDom();
  }

  function drawEdgeArrow(c, cssW, cssH) {
    const goal = guidePoint();
    if (!goal || goal.floor !== player.floor) return;
    const sx = (goal.x - camX) * state.zoom;
    const sy = (goal.y - camY) * state.zoom;
    const pad = 36;
    if (sx >= pad && sy >= pad && sx <= cssW - pad && sy <= cssH - pad) return;
    const px = (player.x - camX) * state.zoom;
    const py = (player.y - camY) * state.zoom;
    const dx = sx - px;
    const dy = sy - py;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    let x = px;
    let y = py;
    for (let i = 0; i < 60; i++) {
      const nx = x + ux * 16;
      const ny = y + uy * 16;
      if (nx < pad || ny < pad || nx > cssW - pad || ny > cssH - pad) break;
      x = nx;
      y = ny;
    }
    c.save();
    c.translate(x, y);
    c.rotate(Math.atan2(uy, ux));
    c.fillStyle = "#ff5d73";
    c.strokeStyle = INK;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(14, 0);
    c.lineTo(-10, 9);
    c.lineTo(-10, -9);
    c.closePath();
    c.fill();
    c.stroke();
    c.restore();
  }

  function drawMinimap() {
    const w = mini.width;
    const h = mini.height;
    const sx = w / WORLD.w;
    const sy = h / WORLD.h;
    miniCtx.setTransform(1, 0, 0, 1, 0, 0);
    miniCtx.clearRect(0, 0, w, h);
    miniCtx.fillStyle = "#8fce63";
    miniCtx.fillRect(0, 0, w, h);
    miniCtx.fillStyle = "#f0d2a0";
    for (const p of paths) miniCtx.fillRect(p.x * sx, p.y * sy, p.w * sx, p.h * sy);
    for (const b of compounds) {
      miniCtx.fillStyle = player.floor === 1 && b.id !== "class" ? "rgba(255,255,255,0.25)" : b.wall;
      miniCtx.fillRect(b.x * sx, b.y * sy, b.w * sx, b.h * sy);
    }
    miniCtx.strokeStyle = "rgba(255,255,255,0.85)";
    miniCtx.lineWidth = 2;
    miniCtx.strokeRect(camX * sx, camY * sy, state.viewW * sx, state.viewH * sy);
    const goal = guidePoint();
    if (goal) {
      miniCtx.fillStyle = "#ff5d73";
      miniCtx.beginPath();
      miniCtx.arc(goal.x * sx, goal.y * sy, 4 + Math.sin(ambient * 5) * 1.2, 0, Math.PI * 2);
      miniCtx.fill();
    }
    if (state.mission?.id === "stealth" && player.floor === 0) {
      miniCtx.fillStyle = "#4dabf7";
      miniCtx.beginPath();
      miniCtx.arc(teacher.x * sx, teacher.y * sy, 3.5, 0, Math.PI * 2);
      miniCtx.fill();
    }
    miniCtx.fillStyle = "#ffd43b";
    miniCtx.strokeStyle = INK;
    miniCtx.lineWidth = 1.5;
    miniCtx.beginPath();
    miniCtx.arc(player.x * sx, player.y * sy, 4.5, 0, Math.PI * 2);
    miniCtx.fill();
    miniCtx.stroke();
  }

  function setText(el, text) {
    if (el.textContent !== text) el.textContent = text;
  }

  function updateDom() {
    const zone = currentZone();
    setText($("place"), zone.name);
    if (state.lastZoneAnnounce !== zone.name) {
      state.lastZoneAnnounce = zone.name;
      announce("而家喺" + zone.name);
    }
    const card = $("mission-card");
    if (state.mission) {
      card.classList.remove("hidden");
      setText($("mission-title"), state.mission.title);
      const metres = (() => {
        const g = guidePoint();
        if (!g) return "";
        const m = Math.max(1, Math.round(dist(player.x, player.y, g.x, g.y) / 42));
        return g.floor !== player.floor ? "先上樓梯" : "約 " + m + " 米";
      })();
      setText($("mission-obj"), objectiveLine() + " · " + metres);
      const timer = $("timer");
      if (state.mission.time) {
        timer.classList.remove("hidden");
        const sec = Math.ceil(state.timeLeft);
        setText(timer, "剩餘 " + sec + " 秒");
        timer.classList.toggle("urgent", sec <= 10);
      } else timer.classList.add("hidden");
    } else card.classList.add("hidden");
    const near = nearestInteract();
    $("btn-interact").classList.toggle("hidden", !near || !!state.dialog);
    $("badge").classList.toggle("hidden", !state.carrying);
    const toastEl = $("toast");
    if (state.toast && ambient < state.toastUntil) {
      toastEl.classList.remove("hidden");
      setText(toastEl, state.toast);
    } else toastEl.classList.add("hidden");
    const bannerEl = $("banner");
    if (state.banner && ambient < state.bannerUntil) {
      bannerEl.classList.remove("hidden");
      setText(bannerEl, state.banner);
    } else bannerEl.classList.add("hidden");
    setText($("btn-mute"), state.mute ? "靜音" : "聲音");
    $("btn-mute").setAttribute("aria-pressed", state.mute ? "true" : "false");
  }

  function parkJoy(clientX, clientY) {
    const size = joyEl.offsetWidth || 128;
    const x = clamp(clientX - size / 2, 8, window.innerWidth - size - 8);
    const y = clamp(clientY - size / 2, 8, window.innerHeight - size - 8);
    joyEl.style.left = x + "px";
    joyEl.style.top = y + "px";
    joyEl.style.bottom = "auto";
    joyEl.classList.add("active");
  }

  function endJoy() {
    joy.active = false;
    joy.id = null;
    joy.x = 0;
    joy.y = 0;
    joy.max = 0;
    joyEl.style.left = "";
    joyEl.style.top = "";
    joyEl.style.bottom = "";
    joyEl.classList.remove("active");
    knob.style.transform = "translate(0px, 0px)";
  }

  function moveJoy(e) {
    const rect = joyEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const max = rect.width * 0.34;
    const mag = Math.hypot(dx, dy) || 0;
    if (mag > max) { dx = (dx / mag) * max; dy = (dy / mag) * max; }
    joy.x = dx / max;
    joy.y = dy / max;
    joy.max = Math.max(joy.max, mag / max);
    if (mag / max < 0.16) { joy.x = 0; joy.y = 0; }
    knob.style.transform = "translate(" + dx + "px, " + dy + "px)";
  }

  function tryWorldTap(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const wx = (clientX - rect.left) / state.zoom + camX;
    const wy = (clientY - rect.top) / state.zoom + camY;
    let best = null;
    for (const item of interactables(9999)) {
      const td = dist(wx, wy, item.x, item.y);
      if (td < 42 && (!best || td < best.td)) best = { ...item, td };
    }
    if (!best) return;
    if (best.d > best.range) { toast("行近啲先"); return; }
    doInteract(best);
  }

  function onPointerDown(e) {
    if (e.button > 0) return;
    unlockAudio();
    if (e.target.closest("button, #overlay, #topbar, #minimap-wrap, #sheet")) return;
    if (state.dialog) return;
    const left = e.clientX <= window.innerWidth * 0.56;
    if (left && !joy.active) {
      e.preventDefault();
      joy.active = true;
      joy.id = e.pointerId;
      joy.max = 0;
      parkJoy(e.clientX, e.clientY);
      moveJoy(e);
      tap = { x: e.clientX, y: e.clientY, t: performance.now(), left: true, id: e.pointerId, moved: false };
    } else if (!left) {
      tap = { x: e.clientX, y: e.clientY, t: performance.now(), left: false, id: e.pointerId, moved: false };
    }
  }

  function onPointerMove(e) {
    if (joy.active && e.pointerId === joy.id) {
      e.preventDefault();
      moveJoy(e);
    }
    if (tap && e.pointerId === tap.id) {
      if (Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 16) tap.moved = true;
    }
  }

  function onPointerUp(e) {
    if (joy.active && e.pointerId === joy.id) {
      const wasTap = tap && !tap.moved && joy.max < 0.28 && performance.now() - tap.t < 340;
      endJoy();
      if (wasTap) tryWorldTap(e.clientX, e.clientY);
      tap = null;
      return;
    }
    if (tap && !tap.left && e.pointerId === tap.id && !tap.moved && performance.now() - tap.t < 340) {
      tryWorldTap(e.clientX, e.clientY);
    }
    if (tap && e.pointerId === tap.id) tap = null;
  }

  function bindHold(button, setHeld) {
    const down = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setHeld(true);
      button.classList.add("held");
      try { button.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      unlockAudio();
    };
    const up = () => { setHeld(false); button.classList.remove("held"); };
    button.addEventListener("pointerdown", down);
    button.addEventListener("pointerup", up);
    button.addEventListener("pointercancel", up);
    button.addEventListener("lostpointercapture", up);
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - lastTs) / 1000 || 0);
    lastTs = now;
    ambient += dt;
    try {
      if (!state.dialog && !document.hidden) update(dt);
      updateAmbient(dt);
      updateCamera(dt);
      render();
    } catch (err) {
      console.error(err);
      $("loading").classList.remove("hidden");
      $("loading").textContent = "遊戲遇到問題，請重新開一次。";
      return;
    }
    requestAnimationFrame(frame);
  }

  function boot() {
    buildWorld();
    selfCheck();
    resize();
    updateStars();
    $("btn-mute").textContent = state.mute ? "靜音" : "聲音";
    window.addEventListener("resize", resize);
    if (window.visualViewport) window.visualViewport.addEventListener("resize", resize);
    window.addEventListener("pointerdown", onPointerDown, { capture: true });
    window.addEventListener("pointermove", onPointerMove, { capture: true });
    window.addEventListener("pointerup", onPointerUp, { capture: true });
    window.addEventListener("pointercancel", onPointerUp, { capture: true });
    bindHold($("btn-sprint"), (v) => { sprintHeld = v; });
    $("btn-interact").addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      unlockAudio();
      doInteract();
    });
    $("btn-help").addEventListener("click", () => { if (!state.dialog) openHelp(); });
    $("btn-abandon").addEventListener("click", () => { if (!state.dialog && state.mission) confirmAbandon(); });
    $("btn-mute").addEventListener("click", () => {
      state.mute = !state.mute;
      persist();
      if (!state.mute) unlockAudio();
      updateDom();
    });
    window.addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      if (e.key.startsWith("Arrow") || k === " ") e.preventDefault();
      keys.add(k);
      unlockAudio();
      if (state.dialog) {
        if (e.key === "Escape") {
          const buttons = state.dialog.buttons || [];
          const back = [...buttons].reverse().find((b) => !b.primary) || buttons[0];
          if (back) back.onClick();
          e.preventDefault();
        }
        return;
      }
      if ((k === "e" || k === "enter") && !e.repeat) {
        doInteract();
        e.preventDefault();
      }
    });
    window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
    window.addEventListener("blur", () => { keys.clear(); sprintHeld = false; endJoy(); });
    document.addEventListener("touchmove", (e) => {
      if (e.target.closest("#sheet")) return;
      e.preventDefault();
    }, { passive: false });
    document.addEventListener("contextmenu", (e) => e.preventDefault());
    ["gesturestart", "gesturechange", "gestureend"].forEach((type) => {
      document.addEventListener(type, (e) => e.preventDefault());
    });
    window.__qingwan = {
      issues,
      getState: () => ({
        x: Math.round(player.x),
        y: Math.round(player.y),
        floor: player.floor,
        zone: currentZone().name,
        mission: state.mission ? state.mission.id : null,
        objective: state.mission ? objectiveLine() : "",
        carrying: state.carrying,
        dialog: state.dialog ? state.dialog.title : null,
        timeLeft: Math.ceil(state.timeLeft),
        done: [...state.done],
        catching: state.catching > 0,
        teacherX: Math.round(teacher.x),
        teacherY: Math.round(teacher.y),
        issues,
      }),
      getPath: () => state.path ? state.path.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) })) : [],
      routeTo: (x, y) => {
        const path = findPath(gridFor(player.floor), player.x, player.y, x, y);
        return path ? path.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) })) : [];
      },
    };
    if (params.has("skipintro")) {
      state.dialog = null;
      joyEl.classList.add("hint");
    } else openWelcome();
    $("loading").classList.add("hidden");
    lastTs = performance.now();
    requestAnimationFrame(frame);
  }

  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.all([
    Promise.race([
      fontsReady,
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]),
    loadArt(),
  ]).then(boot).catch((err) => {
    console.error(err);
    $("loading").textContent = "載入失敗，請重新開一次。";
  });
})();
