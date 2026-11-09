// Midnight Brew's village (docs/milestones/M16-16g-2-midnight-brew-in-play2.md, 16g-2a): the 16g-1 mock's world
// (its scratchpad `mocks/brew/scene.js`, version 6), typed, with this ticket's changes: no character clips, so the witch
// moves by code (answer 6); round 7 brings a jack-o'-lantern parade instead of the trick-or-treaters (answer 9); a refused
// try fizzles (answer 7); and the animals and the hearse load after the rest, so the run can start sooner (answer 11).
// The village transforms one equal step a round (16g-1 answers 14, 15); level n is how it stands once n rounds are done.
// It decides nothing about the run: game 2's screen tells it what happened and waits for each moment.
import {
  THREE, clamp, createParticles, createStage, disposeBlock, joinStill, easeOutBack, glowSprite, lerp, letterBlock, loadModels, rng, smooth, spawn, tween, wait,
  type Block, type BlockLook, type Ent, type Stage, type Tween, type Updater,
} from "./scene";

const M = {
  cauldron: "bubbling-tripod-cauldron-124e15", witch: "kid-witch-01c770", cat: "arched-black-cat-407cf6",
  headstone: "carved-headstone-09d9f8", mound: "grave-mound-169ec3", fence: "wrought-iron-cemetery-fence-f1a113",
  lantern: "cemetery-lantern-post-fed352", jack: "jack-o-lantern-0b1ddb", vine: "pumpkin-vine-7f5c9b",
  oak: "twisted-dead-oak-49457b", bush: "bare-thorn-bush-91a238", angel: "weeping-stone-angel-644ce3",
  broom: "witch-s-broom-ec84c6", luminaria: "paper-bag-luminaria-0e8a1a", mausoleum: "family-mausoleum-c2a009",
  house: "haunted-victorian-house-886931", skeleton: "skeleton-crawling-out-of-24b6ae", spider: "giant-yard-spider-70ddce",
  patch: "pumpkin-patch-tile-b5e5de", lights: "orange-and-purple-string-1fbdab", scarecrow: "halloween-yard-scarecrow-cb0ffb",
  maze: "corn-maze-wall-run-22b0da", corn: "tied-corn-stalk-bundle-c1d042",
  cottage: "thatched-cottage-0e63f5", tavern: "village-tavern-4e94e3", well: "village-well-f8e361", home: "two-story-house-40f6dc",
  bridge: "wooden-bridge-9d2308", barrel: "barrel-aadc94", crate: "wooden-crate-b9c96a", signpost: "signpost-8287c3",
  wall: "low-stone-wall-8a8ea3", woodfence: "wooden-fence-3d8ee7", haystack: "haystack-77b0dd", stump: "tree-stump-8c0513",
  rock: "small-rock-d43710", tuft: "grass-tuft-5ccff0", stele: "carved-grave-stele-a1359c", candles: "candle-spike-cluster-d7c566",
  brazier: "standing-brazier-c9e4ee", bench: "alchemy-workbench-117b73", potion: "potion-bottle-099ad7", shrooms: "mushroom-cluster-18dc1d",
} as const;
// The second stage (answer 11): the run can start without them; they appear when they arrive.
const EXTRAS = { crow: "crow-base", owl: "owl-base", rat: "rat-base", wolf: "wolf-base", hearse: "vintage-hearse-3b2ec1" } as const;
// The tracker's full mark, carried from the mock with this ticket's approval (answer 12; Numbers).
const FULL = 2000;
const R_ISLAND = 17;
const STEPS = ["lanterns", "patch", "moon", "graves", "house", "parade"] as const; // after round n, STEPS[n - 1]
type Step = (typeof STEPS)[number];
const AREAS: Record<Step, THREE.Vector3> = {
  lanterns: new THREE.Vector3(0, 1, 5), patch: new THREE.Vector3(8, 0.5, 6), moon: new THREE.Vector3(-6, 6, -10),
  graves: new THREE.Vector3(-8.5, 0.5, -2), house: new THREE.Vector3(8, 3, -8), parade: new THREE.Vector3(0, 0.5, 9),
};
// 16g-1 answer 21's tiers, by the word's letters: good from 6, great from 8, huge from 10; the bonus letter adds a level.
export const tierOf = (letters: number, bonus: boolean) => Math.min((letters >= 10 ? 3 : letters >= 8 ? 2 : letters >= 6 ? 1 : 0) + (bonus ? 1 : 0), 3);

type Look = BlockLook & { splash: readonly string[] };
const TIER_LOOK: readonly Look[] = [
  { face: "#efe2ff", edge: "#a98fd6", side: "#7a5aa8", ink: "#2a1640", glow: null, splash: ["#c86cf0", "#e7b6ff", "#8a2fb8", "#8df060"] },
  { face: "#e6ffd6", edge: "#7fd65a", side: "#4e9a33", ink: "#163a0a", glow: "#8dff6a", splash: ["#8df060", "#d6ff9e", "#3f9a2a", "#e7b6ff"] },
  { face: "#fff1c8", edge: "#ffb347", side: "#d9772a", ink: "#3a1a05", glow: "#ffb347", splash: ["#ffb347", "#ffe08a", "#8df060", "#c86cf0"] },
  { face: "#fff8de", edge: "#ffe08a", side: "#ff9a3c", ink: "#3a1a05", glow: "#fff1a8", splash: ["#fff1a8", "#ffb347", "#8df060", "#c86cf0", "#ffffff"] },
];
const GOLD: BlockLook = { face: "#ffe08a", edge: "#e0a63a", side: "#c98a2c", ink: "#3a2205", glow: "#ffcf4a" };
const GREY: BlockLook = { face: "#8a8296", edge: "#5d566b", side: "#4b4458", ink: "#1d1924" };

export type Village = {
  // A word that counted: its letters alone, whether it held the bonus letter, and that letter, for the gold block.
  word(letters: string, bonus: boolean, bonusLetter: string | null): Promise<void>;
  // A time-up, with what was left in the box.
  miss(typed: string): Promise<void>;
  // A try the server refused: a puff of grey smoke, and nothing moves the camera (answer 7).
  refused(): void;
  // The next part of the village changes; level is the rounds now done.
  cast(level: number): Promise<void>;
  // How the village stands with this many rounds done, at once, cutting any move: on load and on a resumed run.
  setLevel(level: number): void;
  score(total: number): void;
  finale(): Promise<void>;
  // Resolves once the camera is still (16g-1 answer 9).
  settled(): Promise<void>;
  // The second stage's models are in.
  extras: Promise<void>;
  stop(): void;
};

type Lamp = { s: THREE.Sprite; l?: THREE.PointLight; d: number; big?: boolean; boost: number };
type Shock = { start: number; r: number };
type Geyser = { until: number; rate: number; speed: number; colors: readonly string[]; acc: number };
type WitchMove = { kind: "idle" | "toss" | "cheer" | "flinch"; t0: number };
type Crow = { e: Ent; at: number; next: number; fly: { from: THREE.Vector3; to: number; t0: number; dur: number; high: number } | null };
type Rat = { e: Ent; spots: THREE.Vector3[]; at: number; t0: number; wait: number; from: THREE.Vector3 | null };
type Extras = { crows: Crow[]; perches: THREE.Vector3[]; owl: Ent; rats: Rat[]; wolf: Ent; hearse: Ent; headlights: THREE.Sprite[]; born: number };

// The one held pose; a phone's tall box gets the further one (16g-1 answer 8).
function placeHome(stage: Stage) {
  stage.setPose(new THREE.Vector3(0, 24, 30), new THREE.Vector3(0, 0, 0.2), { pos: new THREE.Vector3(0, 32, 37), target: new THREE.Vector3(0, 0, 1.5) });
}

// font: the page's font family, for the letters on the blocks (DECISIONS.md, Styling: one font). onFault: an error while
// the village runs, to be shown. signal: the screen has gone, so a village still loading never shows its canvas.
export async function startVillage(host: HTMLElement, font: string, onFault: (err: unknown) => void, signal: AbortSignal): Promise<Village> {
  const stage = createStage(host, onFault, { fov: 30, near: 0.3, far: 500 });
  try {
    const village = await build(stage, font);
    if (signal.aborted) { village.stop(); throw signal.reason; }
    // Ready once the village has set its pace (a slow GPU's first frames hold the page).
    await stage.show();
    if (signal.aborted) { village.stop(); throw signal.reason; }
    return village;
  } catch (err) {
    stage.stop();
    throw err;
  }
}

async function build(stage: Stage, font: string): Promise<Village> {
  const { scene } = stage;
  const parts = createParticles(stage);
  const R = rng(1031);
  const g = await loadModels(Object.values(M));
  const G = Object.fromEntries(Object.entries(M).map(([k, id]) => [k, g[id]])) as Record<keyof typeof M, (typeof g)[string]>;
  const put = (m: (typeof g)[string], o: Parameters<typeof spawn>[2] = {}) => spawn(stage, m, o);
  // What never moves goes in `still`, joined into a few meshes once the village is built (answer 14).
  const still = new THREE.Group();
  const fix = (m: (typeof g)[string], o: Parameters<typeof spawn>[2] = {}) => {
    if (m.animations.length) throw new Error("fix: a model with clips moves");
    spawn(stage, m, { ...o, parent: still });
  };
  const glow = (color: string, size: number, pos: THREE.Vector3) => glowSprite(scene, color, size, pos);
  placeHome(stage);

  // ---- sky, stars, moon, light ----
  const domeGeo = new THREE.IcosahedronGeometry(160, 2);
  const domeCols = new Float32Array(domeGeo.attributes.position.count * 3);
  domeGeo.setAttribute("color", new THREE.BufferAttribute(domeCols, 3));
  scene.add(new THREE.Mesh(domeGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })));
  const sp: number[] = [];
  for (let i = 0; i < 320; i++) { const a = R() * Math.PI * 2, e = 0.1 + R() * 1.3; sp.push(Math.cos(a) * Math.cos(e) * 150, Math.sin(e) * 150, Math.sin(a) * Math.cos(e) * 150); }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
  const starMat = new THREE.PointsMaterial({ color: "#fff6dc", size: 2, sizeAttenuation: false, fog: false, transparent: true });
  scene.add(new THREE.Points(starGeo, starMat));
  const moon = new THREE.Mesh(new THREE.IcosahedronGeometry(6, 1), new THREE.MeshBasicMaterial({ color: "#fdf1c8", fog: false }));
  scene.add(moon);
  const hemi = new THREE.HemisphereLight("#8a84d8", "#2a1834", 1.6);
  scene.add(hemi);
  const moonLight = new THREE.DirectionalLight("#c3ccff", 1.1);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.set(2048, 2048);
  Object.assign(moonLight.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 120 });
  moonLight.shadow.bias = -0.0008;
  scene.add(moonLight, moonLight.target);
  scene.fog = new THREE.FogExp2("#1b1430", 0.006);

  // ---- the diorama base: turf on a rocky cliff, with roots hanging out of the earth ----
  const top = new THREE.Mesh(new THREE.CylinderGeometry(R_ISLAND, R_ISLAND, 0.6, 32, 1), new THREE.MeshStandardMaterial({ color: "#56693c", flatShading: true }));
  top.position.y = -0.3; top.receiveShadow = true; still.add(top);
  const earthGeo = new THREE.CylinderGeometry(R_ISLAND, R_ISLAND * 0.78, 5, 32, 3);
  const ep = earthGeo.attributes.position;
  for (let i = 0; i < ep.count; i++) { if (ep.getY(i) < 2.4) { ep.setX(i, ep.getX(i) * (0.94 + R() * 0.1)); ep.setZ(i, ep.getZ(i) * (0.94 + R() * 0.1)); ep.setY(i, ep.getY(i) + (R() - 0.5) * 0.5); } }
  earthGeo.computeVertexNormals();
  const earth = new THREE.Mesh(earthGeo, new THREE.MeshStandardMaterial({ color: "#6a4a33", flatShading: true }));
  earth.position.y = -3.1; still.add(earth);
  const rockMat = new THREE.MeshStandardMaterial({ color: "#7d7486", flatShading: true });
  for (let i = 0; i < 46; i++) {
    const a = R() * Math.PI * 2, low = R() < 0.55;
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4 + R() * 0.8, 0), rockMat);
    const r = low ? R_ISLAND * (0.9 + R() * 0.08) : R_ISLAND - 0.4 - R() * 0.8;
    m.position.set(Math.cos(a) * r, low ? -1 - R() * 3 : 0.05, Math.sin(a) * r);
    m.rotation.set(R() * 3, R() * 3, R() * 3); m.scale.y = low ? 1 : 0.6;
    m.castShadow = !low; still.add(m);
  }
  const rootMat = new THREE.MeshStandardMaterial({ color: "#3e2c1f", flatShading: true });
  for (let i = 0; i < 26; i++) {
    const a = R() * Math.PI * 2, len = 1.2 + R() * 2.6;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.12, len, 4), rootMat);
    m.position.set(Math.cos(a) * (R_ISLAND + 0.05), -0.5 - len / 2, Math.sin(a) * (R_ISLAND + 0.05));
    m.rotation.z = (R() - 0.5) * 0.5; still.add(m);
  }
  const hill = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.8, 0.7, 12), new THREE.MeshStandardMaterial({ color: "#5f7247", flatShading: true }));
  hill.position.y = 0.35; hill.receiveShadow = true; still.add(hill);
  const pathMat = new THREE.MeshStandardMaterial({ color: "#6b5a48", flatShading: true });
  for (const a of [Math.PI * 0.5, Math.PI * 1.08, Math.PI * 1.75, Math.PI * 0.18]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 11), pathMat);
    p.position.set(Math.sin(a) * 8.6, 0.03, Math.cos(a) * 8.6); p.rotation.y = a; p.receiveShadow = true; still.add(p);
  }
  // a stream across the front-left, with a bridge where the path crosses it
  const curve = new THREE.CatmullRomCurve3(([[-16.6, 2.6], [-11, 6], [-7.8, 7.8], [-4.6, 11], [-1.6, 16.8]] as const).map(([x, z]) => new THREE.Vector3(x, 0.03, z)));
  const pts = curve.getPoints(40), strip: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], n = new THREE.Vector3(-(b.z - a.z), 0, b.x - a.x).normalize().multiplyScalar(0.85);
    strip.push(a.x + n.x, 0.04, a.z + n.z, a.x - n.x, 0.04, a.z - n.z, b.x + n.x, 0.04, b.z + n.z, a.x - n.x, 0.04, a.z - n.z, b.x - n.x, 0.04, b.z - n.z, b.x + n.x, 0.04, b.z + n.z);
  }
  const waterGeo = new THREE.BufferGeometry(); waterGeo.setAttribute("position", new THREE.Float32BufferAttribute(strip, 3)); waterGeo.computeVertexNormals();
  const waterMat = new THREE.MeshStandardMaterial({ color: "#2f5486", emissive: "#16305a", emissiveIntensity: 0.5, roughness: 0.15, metalness: 0.3, side: THREE.DoubleSide });
  scene.add(new THREE.Mesh(waterGeo, waterMat));
  fix(G.bridge, { pos: [-7.8, 0, 7.8], rotY: -Math.PI * 0.75, scale: 1.3 });

  // ---- the village ----
  put(G.cauldron, { pos: [0, 0.7, 0] });
  // The witch has no clips (answer 6): her moves are a lean, a hop and a crouch, by code, on her own pose.
  const witch = put(G.witch, { pos: [-1.1, 0.7, 0.5], rotY: 1.3 });
  witch.obj.rotation.order = "YXZ";
  put(G.broom, { pos: [-1.9, 0.7, -0.4], rotY: 0.9 }).obj.rotation.z = 0.25;
  fix(G.bench, { pos: [0.3, 0.7, -2.0], scale: 0.9 });
  for (const [x, c] of [[-0.25, 0], [0.15, 1], [0.55, 2]] as const) fix(G.potion, { pos: [x, 0.7 + 0.86, -2.0], scale: 1.6 + c * 0.2, shadows: false });
  const cat = put(G.cat, { pos: [1.6, 0.7, 0.9], rotY: -0.9, scale: 2, tick: false });
  cat.play("Idle", { fade: 0 });
  // cemetery, left
  for (let x = -14; x <= -6; x += 4) fix(G.fence, { pos: [x, 0, -7.5] });
  fix(G.fence, { pos: [-14.6, 0, -3.5], rotY: Math.PI / 2 });
  const graves: THREE.Vector3[] = [];
  ([[-12, -5], [-9.5, -5.2], [-7, -5], [-12, -2], [-9.5, -1.8], [-12.2, 1.2]] as const).forEach(([x, z], i) => {
    fix(G.headstone, { pos: [x, 0, z - 0.7], rotY: 0.1 * ((i % 3) - 1) });
    fix(G.mound, { pos: [x, 0, z + 0.4], scale: 0.7 });
    graves.push(new THREE.Vector3(x, 0, z + 0.5));
  });
  for (const [x, z, r] of [[-13.6, -6.2, 0.2], [-10.8, 0.4, -0.3], [-8, -3.4, 0.1], [-14.2, -0.8, 0.4]] as const) fix(G.stele, { pos: [x, 0, z], rotY: r });
  const candles: { s: THREE.Sprite; ph: number }[] = [];
  for (const [x, z] of [[-11.6, -5.4], [-9.1, -5.6], [-11.6, -2.4], [-7.4, -2.2], [-13.4, -5.8]] as const) {
    fix(G.candles, { pos: [x, 0, z], scale: 1.4, shadows: false });
    candles.push({ s: glow("#ffb35c", 0.9, new THREE.Vector3(x, 0.62, z)), ph: R() * 6 });
  }
  fix(G.angel, { pos: [-7, 0, -1.5], rotY: 0.5 });
  fix(G.mausoleum, { pos: [-7.6, 0, -11.4], rotY: 0.3, scale: 0.9 });
  const skeletons = graves.slice(0, 4).map((p, i) => put(G.skeleton, { pos: [p.x, -1, p.z + 0.2], rotY: 0.3 * (i - 1.5), scale: 1.2 }));
  // the haunted house, back right
  fix(G.house, { pos: [9, 0, -8.5], rotY: -0.55, scale: 0.62 });
  const houseLights = [new THREE.Vector3(8.4, 2.2, -5.4), new THREE.Vector3(10.6, 4.6, -6.6), new THREE.Vector3(7.2, 5.6, -7)].map((p) => { const l = new THREE.PointLight("#ffb34d", 0, 6, 1.6); l.position.copy(p); scene.add(l); return l; });
  const stringRuns = [put(G.lights, { pos: [5.5, 1.4, -3.6], rotY: -0.55 }), put(G.lights, { pos: [9, 1.4, -1.6], rotY: -0.55 })];
  for (const r of stringRuns) if (r.actions.tick) r.actions.tick.paused = true;
  const spider = put(G.spider, { pos: [12.6, 9, -3.2], scale: 1.4 });
  const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1, 4), new THREE.MeshBasicMaterial({ color: "#d8d0e8" }));
  scene.add(thread);
  // the tavern and a thatched cottage at the back, a two-storey house on the right, a well
  fix(G.tavern, { pos: [-1.2, 0.85, -12.9], scale: 0.55 });
  fix(G.cottage, { pos: [3.6, 0, -14.1], rotY: -0.25, scale: 0.75 });
  fix(G.home, { pos: [12.9, 0, 2.8], rotY: -Math.PI / 2, scale: 0.6 });
  fix(G.well, { pos: [-3.1, 0.2, 1.9], scale: 0.9 });
  const windows = ([
    [[9.6, 2.0, -4.9], "#ffc56b"], [[3.6, 2.6, -12.0], "#ffd27a"], [[-1.2, 5.4, -10.6], "#ffb050"], [[11.1, 1.6, 4.4], "#ffd27a"], [[-2.6, 1.6, -10.4], "#ffc56b"],
    [[0.4, 1.6, -10.4], "#ffc56b"], [[-1.2, 3.6, -10.5], "#ffb050"], [[3.2, 1.3, -12.5], "#ffd27a"], [[11.1, 1.6, 2.0], "#ffd27a"], [[11.1, 3.7, 3.7], "#ffc56b"],
  ] as const).map(([p, c]) => ({ s: glow(c, 1.6, new THREE.Vector3(...p)), ph: R() * 6 }));
  const chimneys = [new THREE.Vector3(1.4, 6.6, -13.6), new THREE.Vector3(4.6, 4.2, -14.6), new THREE.Vector3(13.3, 5.4, 4.2), new THREE.Vector3(10.4, 9.6, -9.6)];
  // props filling the gaps
  for (const [x, z, r] of [[2.6, -10, 0], [3.4, -9.6, 0.6], [-4.4, -10.2, 0.3], [11.8, 6.6, 0], [12.4, 7.2, 0.9]] as const) fix(G.barrel, { pos: [x, 0, z], rotY: r });
  for (const [x, z, r] of [[-5, -9.6, 0.4], [-5.6, -9.2, 1.1], [12.6, 5.8, 0.2], [-2.6, 3.1, 0.7]] as const) fix(G.crate, { pos: [x, 0, z], rotY: r });
  fix(G.brazier, { pos: [1.6, 0, -9.6] });
  const brazierLight = new THREE.PointLight("#ff8a3c", 3, 6, 1.8); brazierLight.position.set(1.6, 1.5, -9.6); scene.add(brazierLight);
  fix(G.signpost, { pos: [2.4, 1.03, 2.8], rotY: -0.6 });
  for (const [x, z, r] of [[-4.6, -6.6, 0.2], [-2.6, -6.9, 0.1], [4.8, -5.6, -0.4], [5.6, 10.6, 0.9]] as const) fix(G.wall, { pos: [x, 0, z], rotY: r });
  for (const [x, z, r] of [[10.4, 0.2, Math.PI / 2], [10.4, 5.6, Math.PI / 2], [11.6, -1, 0], [13.6, -1, 0]] as const) fix(G.woodfence, { pos: [x, 0, z], rotY: r });
  fix(G.haystack, { pos: [12.4, 0, 9.6] });
  for (const [x, z] of [[-2.4, 10.8], [6.4, -2.4], [-14.6, 5.4]] as const) fix(G.stump, { pos: [x, 0, z], rotY: R() * 3 });
  for (let i = 0; i < 26; i++) { const a = R() * Math.PI * 2, r = 4 + R() * 12; fix(G.rock, { pos: [Math.cos(a) * r, 0, Math.sin(a) * r], rotY: R() * 3, scale: 0.8 + R() * 1.4 }); }
  for (let i = 0; i < 70; i++) { const a = R() * Math.PI * 2, r = 3.6 + R() * 13; fix(G.tuft, { pos: [Math.cos(a) * r, 0, Math.sin(a) * r], rotY: R() * 3, scale: 1 + R() * 1.2, shadows: false }); }
  for (let i = 0; i < 12; i++) { const a = R() * Math.PI * 2, r = 9 + R() * 7; fix(G.shrooms, { pos: [Math.cos(a) * r, 0, Math.sin(a) * r], rotY: R() * 3, scale: 1.6, shadows: false }); }
  const oaks = [put(G.oak, { pos: [-13, 0, -11], rotY: 0.6, scale: 0.7 }), put(G.oak, { pos: [14.2, 0, -5.6], rotY: 2.2, scale: 0.6 })];
  for (const [x, z, r] of [[4, -4.5, -0.8], [-4, 3.5, 0.9], [13, 11, 0.2], [-3, -6.5, 1.8]] as const) put(G.bush, { pos: [x, 0, z], rotY: r });
  // pumpkin patch, front right
  for (const [x, z] of [[6, 4], [10, 4], [6, 8], [10, 8]] as const) fix(G.patch, { pos: [x, 0, z], shadows: false });
  put(G.vine, { pos: [8, 0, 6], rotY: 0.4 });
  const patchLight = new THREE.PointLight("#ff9a3c", 0, 9, 1.8); patchLight.position.set(8, 1.2, 6); scene.add(patchLight);
  const pumpkins = ([[6.2, 4.8], [7.8, 7.6], [9.6, 5.2], [10.5, 8.2], [6.6, 8.8], [11.2, 3.8]] as const).map(([x, z]) => {
    const e = put(G.jack, { pos: [x, 0, z], rotY: R() * 2 - 1, scale: 0.001 });
    return { e, s: glow("#ff9a3c", 1.4, new THREE.Vector3(x, 0.35, z)), size: 1.1 + R() * 0.9, d: Math.hypot(x, z), hop: 0 };
  });
  // corn maze and scarecrow, past the stream
  put(G.maze, { pos: [-8.4, 0, 13], rotY: 0.75 });
  put(G.scarecrow, { pos: [-11.6, 0, 10.4], rotY: 0.6, scale: 1.2 });
  put(G.corn, { pos: [-3.4, 0, 6.6] }); put(G.corn, { pos: [3.8, 0, 11.5], rotY: 1 });
  // lanterns and luminaria along the paths (round 2); the luminaria glow without lights of their own
  const lamps: Lamp[] = [];
  for (const [x, z] of [[-1.3, 3.5], [1.3, 3.5], [-1.3, 6.5], [1.3, 6.5], [-1.3, 9.5], [1.3, 9.5], [-1.3, 12.5], [1.3, 12.5]] as const) {
    fix(G.luminaria, { pos: [x, 0, z] });
    lamps.push({ s: glow("#ffc77a", 1.3, new THREE.Vector3(x, 0.32, z)), d: Math.hypot(x, z), boost: 0 });
  }
  for (const [x, z] of [[-4.5, -1.2], [4.6, 3.2], [-3.6, -4.8], [4.4, -3.6]] as const) {
    fix(G.lantern, { pos: [x, 0, z] });
    const l = new THREE.PointLight("#ffc77a", 0, 6, 2); l.position.set(x, 2.3, z); scene.add(l);
    lamps.push({ l, s: glow("#ffd48a", 1.2, new THREE.Vector3(x, 2.35, z)), d: Math.hypot(x, z), big: true, boost: 0 });
  }
  // round 7's jack-o'-lantern parade (answer 9): pumpkins hopping round the ring path, moved by code
  const parade = Array.from({ length: 8 }, (_, i) => ({ e: put(G.jack, { pos: [0, -3, 0], scale: 0.001 }), s: glow("#ff9a3c", 1.2, new THREE.Vector3(0, -3, 0)), i }));
  // bats (round 4)
  const batGeo = new THREE.BufferGeometry();
  batGeo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0.2, -0.6, 0, -0.1, 0, 0, -0.2, 0, 0, 0.2, 0.6, 0, -0.1, 0, 0, -0.2], 3));
  batGeo.computeVertexNormals();
  const batMat = new THREE.MeshBasicMaterial({ color: "#14101c", side: THREE.DoubleSide });
  const bats = Array.from({ length: 9 }, () => {
    const b = new THREE.Mesh(batGeo, batMat);
    b.visible = false; scene.add(b);
    return { b, ph: R() * 6, r: 3 + R() * 4, h: 6 + R() * 5, sp: 0.6 + R() * 0.5 };
  });
  // grave ghosts (round 5), and a few faint wisps that always wander
  const wispMat = new THREE.MeshStandardMaterial({ color: "#e9f2ff", emissive: "#bcd2ff", emissiveIntensity: 0.6, transparent: true, opacity: 0, flatShading: true });
  const wisps = graves.slice(0, 5).map((p, i) => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), wispMat);
    m.scale.set(1, 1.4, 0.8); scene.add(m);
    return { m, p, ph: i * 1.3 };
  });
  const faintMat = new THREE.MeshStandardMaterial({ color: "#e9f2ff", emissive: "#a9c4ff", emissiveIntensity: 0.5, transparent: true, opacity: 0.28, flatShading: true });
  const drifters = [0, 1, 2].map((i) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 1), faintMat); m.scale.set(1, 1.5, 0.8); scene.add(m); return { m, ph: i * 2.2, r: 6 + i * 3 }; });
  // fireflies
  const flies = Array.from({ length: 36 }, () => { const a = R() * Math.PI * 2, r = 4 + R() * 12; return { s: glow("#d8ff8a", 0.35, new THREE.Vector3()), x: Math.cos(a) * r, z: Math.sin(a) * r, ph: R() * 6, sp: 0.3 + R() * 0.4 }; });
  // the brew
  const rimY = 0.7 + 0.7, rimR = 0.26;
  const brewGeo = new THREE.CircleGeometry(rimR * 0.92, 18); brewGeo.rotateX(-Math.PI / 2);
  const brewBase = brewGeo.attributes.position.array.slice();
  const brewMat = new THREE.MeshStandardMaterial({ color: "#b04ad8", emissive: "#d58bff", emissiveIntensity: 0.6, flatShading: true });
  const brew = new THREE.Mesh(brewGeo, brewMat); brew.position.set(0, rimY - 0.03, 0); scene.add(brew);
  const potLight = new THREE.PointLight("#d58bff", 8, 9, 1.6); potLight.position.set(0, rimY + 0.5, 0); scene.add(potLight);
  // the brew's colour washing over the whole village, stronger every round (16g-1 answer 28)
  const washLight = new THREE.PointLight("#a5f07a", 0, 40, 1.1); washLight.position.set(0, 9, 0); scene.add(washLight);
  // drifting fog puffs, thicker from round 4
  const fogMat = new THREE.MeshBasicMaterial({ color: "#b9a8e8", transparent: true, opacity: 0, depthWrite: false });
  const puffs = Array.from({ length: 26 }, () => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), fogMat);
    m.scale.set(1.4 + R(), 0.22, 0.9 + R() * 0.6); scene.add(m);
    return { m, a0: R() * Math.PI * 2, r: 4 + R() * 12, sp: 0.03 + R() * 0.03 };
  });
  // the shockwave ring for big words (16g-1 answer 22)
  const ringMat = new THREE.MeshBasicMaterial({ color: "#b6ff8a", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.95, 1, 64).rotateX(-Math.PI / 2), ringMat);
  ring.position.y = 0.15; scene.add(ring);
  // the stray cat, which shares the witch's cat's model
  const strayCat = put(G.cat, { pos: [3, 0.02, 3], scale: 2, tick: false });
  strayCat.play("Walk", { fade: 0 });

  const k = (rate: number) => tween(stage, 0, rate);
  const K: Record<Step, Tween> = { lanterns: k(1.2), patch: k(1.4), moon: k(0.8), graves: k(1), house: k(1.2), parade: k(1.5) };
  const glowK = tween(stage, 0, 0.9), fill = tween(stage, 0, 1.5);
  let wave = 0, flash = 0, lastLv = -1, skyDirty = true, fireAcc = 0, smokeAcc = 0, steamAcc = 0;
  let shocks: Shock[] = [], geysers: Geyser[] = [];
  let column: { mesh: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshBasicMaterial>; start: number; last: number } | null = null;
  let witchMove: WitchMove = { kind: "idle", t0: 0 };
  const cat2 = { a: 0.6, mode: "walk" as "walk" | "sit", until: 4 };
  let extras: Extras | null = null;

  // ---- the second stage: animals and the hearse (answer 11) ----
  // They're built in a group of their own and their shaders compiled in the background before they join the scene, as
  // compiling them on first draw stalls the page, for seconds on a slow GPU.
  const extrasLoaded = loadModels(Object.values(EXTRAS)).then(async (x) => {
    const E = Object.fromEntries(Object.entries(EXTRAS).map(([key, id]) => [key, x[id]])) as Record<keyof typeof EXTRAS, (typeof x)[string]>;
    const group = new THREE.Group();
    const putX = (m: (typeof x)[string], o: Parameters<typeof spawn>[2] = {}) => spawn(stage, m, { ...o, parent: group });
    const perches = ([[-12, 1.52, -7.5], [-8, 1.52, -7.5], [-14.6, 1.52, -2.6], [-9.5, 1.05, -5.95], [-12, 1.05, -2.75], [12.8, 1.24, -0.6], [11.6, 1.24, 6], [2.6, 0.92, -10]] as const).map((p) => new THREE.Vector3(...p));
    const crows: Crow[] = [0, 1, 2, 3].map((i) => {
      const e = putX(E.crow, { pos: perches[i].toArray() as [number, number, number], scale: 2.4, tick: false });
      e.play("Idle", { fade: 0 });
      return { e, at: i, next: stage.t + 3 + R() * 6, fly: null };
    });
    const owl = putX(E.owl, { pos: [-7.6, 3.95, -11.4], rotY: 0.3, scale: 2.6, tick: false });
    owl.play("Idle", { fade: 0 });
    const rats: Rat[] = [0, 1].map((i) => {
      const e = putX(E.rat, { scale: 2, tick: false });
      e.play("Idle", { fade: 0 });
      const spots = i ? [new THREE.Vector3(2.4, 0, -9.3), new THREE.Vector3(-4.3, 0, -9.4)] : [new THREE.Vector3(11.4, 0, 6.2), new THREE.Vector3(12.8, 0, 9)];
      e.obj.position.copy(spots[0]);
      return { e, spots, at: 0, t0: stage.t, wait: 2 + R() * 3, from: null };
    });
    const wolf = putX(E.wolf, { pos: [-15.4, 0.3, -6.8], rotY: Math.PI + 0.4, scale: 1.7, tick: false });
    wolf.play("Idle", { fade: 0 });
    const hearse = putX(E.hearse, { pos: [0, 0, 15.2], scale: 0.6 });
    const headlights = [glowSprite(group, "#fff2c0", 1.1, new THREE.Vector3()), glowSprite(group, "#fff2c0", 1.1, new THREE.Vector3())];
    await stage.renderer.compileAsync(group, stage.camera, scene);
    scene.add(group);
    extras = { crows, perches, owl, rats, wolf, hearse, headlights, born: stage.t };
  });

  const cA = new THREE.Color(), cB = new THREE.Color(), cC = new THREE.Color(), cD = new THREE.Color();
  const update: Updater = (t, dt) => {
    const lv = (K.lanterns.v + K.patch.v + K.moon.v + K.graves.v + K.house.v + K.parade.v) / 6;
    // the sky is recoloured only when it changes
    if (Math.abs(lv - lastLv) > 0.001 || flash > 0.01 || skyDirty) {
      lastLv = lv; skyDirty = flash > 0.01;
      const lo = cA.set("#0b0818").lerp(cB.set("#13221c"), lv * 0.8), hi = cC.set("#2a1d4a").lerp(cD.set("#1f3b4c"), lv);
      if (flash > 0) { lo.lerp(cB.set("#cfe8c4"), flash * 0.5); hi.lerp(cB.set("#e8ffd8"), flash * 0.5); }
      const pos = domeGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const f = smooth(pos.getY(i) / 90);
        domeCols[i * 3] = lo.r + (hi.r - lo.r) * f; domeCols[i * 3 + 1] = lo.g + (hi.g - lo.g) * f; domeCols[i * 3 + 2] = lo.b + (hi.b - lo.b) * f;
      }
      domeGeo.attributes.color.needsUpdate = true;
    }
    flash *= Math.exp(-dt * 5);
    starMat.opacity = 0.65 + Math.sin(t * 1.7) * 0.2;
    moon.position.set(-40, lerp(-4, 34, K.moon.v), -110);
    moonLight.position.set(-14, lerp(6, 26, K.moon.v), -12);
    // the light that builds every round, 0 at round 1 and 1 at round 7 (16g-1 answer 28)
    const L = glowK.v;
    moonLight.intensity = lerp(0.8, 1.4, L) + K.moon.v * 0.4;
    washLight.intensity = L * 42;
    washLight.color.copy(brewMat.emissive).lerp(cB.set("#a5f07a"), 0.5);
    hemi.intensity = 1.4 + L * 0.7 + flash * 1.5;

    // the shockwave: a ring of light sweeping the base; what it passes flares or hops
    for (const sh of shocks) sh.r = (t - sh.start) * 14;
    shocks = shocks.filter((sh) => sh.r < R_ISLAND + 2);
    const front = shocks[0];
    ringMat.opacity = front ? 0.6 * (1 - front.r / (R_ISLAND + 2)) : 0;
    if (front) ring.scale.setScalar(Math.max(front.r, 0.01));
    const passing = (d: number) => shocks.some((sh) => Math.abs(sh.r - d) < 0.9);
    if (front) {
      const a = R() * Math.PI * 2;
      parts.emit({ at: new THREE.Vector3(Math.cos(a) * front.r, 0.2, Math.sin(a) * front.r), count: 2, speed: 2, spread: 1, up: 1, colors: ["#7a4a2a", "#b0662e", "#5f7247"], size: 0.09, life: 1, gravity: 4 });
    }
    // lanterns light outward from the cauldron, one after another
    for (const l of lamps) {
      if (passing(l.d)) l.boost = 1;
      l.boost *= Math.exp(-dt * 2.5);
      const on = smooth(K.lanterns.v * 1.6 - l.d / 16);
      const fl = 1 + Math.sin(t * 9 + l.d) * 0.08;
      if (l.l) l.l.intensity = on * (2.4 + L * 1.6) * fl * (1 + l.boost * 2.5);
      l.s.material.opacity = on * fl * (0.9 + l.boost);
      l.s.scale.setScalar((l.big ? 1.2 : 1.3) * (1 + l.boost * 1.5));
    }
    // pumpkins swell out of the patch and light up; the shockwave makes them hop
    pumpkins.forEach((p, i) => {
      const gk = smooth(K.patch.v * 1.5 - i * 0.08);
      if (gk > 0.5 && passing(p.d)) p.hop = 1;
      p.hop *= Math.exp(-dt * 4);
      p.e.obj.scale.setScalar(Math.max(easeOutBack(gk) * p.size, 0.001));
      p.e.obj.position.y = Math.abs(Math.sin(p.hop * Math.PI)) * 0.8 * p.hop;
      p.s.material.opacity = gk * (0.8 + Math.sin(t * 8 + i) * 0.15);
    });
    patchLight.intensity = K.patch.v * 4;
    // fog, bats
    fogMat.opacity = K.moon.v * 0.045;
    for (const f of puffs) { const a = f.a0 + t * f.sp; f.m.position.set(Math.cos(a) * f.r, 0.25, Math.sin(a) * f.r); }
    for (const b of bats) {
      b.b.visible = K.moon.v > 0.05;
      const a = b.ph + t * b.sp;
      b.b.position.set(8 + Math.cos(a) * b.r, b.h * K.moon.v + Math.sin(t * 2 + b.ph) * 0.5, -8 + Math.sin(a) * b.r);
      b.b.rotation.set(0, -a, Math.sin(t * 14 + b.ph) * 0.6);
      b.b.scale.setScalar(K.moon.v);
    }
    // graves open
    skeletons.forEach((e, i) => { e.obj.position.y = lerp(-1, 0, smooth(K.graves.v * 1.4 - i * 0.12)); });
    for (const w of wisps) {
      w.m.position.set(w.p.x + Math.sin(t * 0.8 + w.ph) * 0.4, 0.6 + K.graves.v * (1.4 + Math.sin(t * 1.5 + w.ph) * 0.3), w.p.z);
      w.m.rotation.z = Math.sin(t + w.ph) * 0.2;
    }
    wispMat.opacity = K.graves.v * 0.75;
    for (const d of drifters) { const a = d.ph + t * 0.07; d.m.position.set(Math.cos(a) * d.r, 1.4 + Math.sin(t * 0.9 + d.ph) * 0.5, Math.sin(a * 1.3) * d.r * 0.8); }
    // the house wakes
    houseLights.forEach((l, i) => { l.intensity = K.house.v * (5 + Math.sin(t * 6 + i * 2) * 1.2); });
    for (const r of stringRuns) { r.obj.visible = K.house.v > 0.02; if (r.actions.tick) r.actions.tick.paused = K.house.v < 0.5; r.obj.scale.setScalar(Math.max(K.house.v, 0.001)); }
    const sy = lerp(9, 3 + Math.sin(t * 0.9) * 0.4, smooth(K.house.v));
    spider.obj.position.y = sy;
    thread.position.set(12.6, (sy + 9.6) / 2, -3.2);
    thread.scale.y = Math.max(9.6 - sy, 0.01);
    // the parade hops round the ring path
    const pk = K.parade.v;
    for (const p of parade) {
      const a = t * 0.12 - p.i * 0.2, r = 11.8;
      const hop = Math.abs(Math.sin(t * 5 + p.i * 0.9)) * 0.5;
      p.e.obj.position.set(Math.cos(a) * r, lerp(-1.5, hop, smooth(pk)), Math.sin(a) * r);
      p.e.obj.rotation.y = -a;
      p.e.obj.scale.setScalar(Math.max(pk * 1.1, 0.001));
      p.s.position.set(p.e.obj.position.x, p.e.obj.position.y + 0.35, p.e.obj.position.z);
      p.s.material.opacity = pk * (0.75 + Math.sin(t * 8 + p.i) * 0.15);
    }
    // small lights: candles, windows, fireflies, the brazier, chimney smoke, swaying oaks, the stream's shimmer
    for (const c of candles) { c.s.material.opacity = 0.45 + L * 0.5 + Math.sin(t * 11 + c.ph) * 0.12 + Math.sin(t * 23 + c.ph) * 0.08; c.s.scale.setScalar(0.7 + L * 0.6); }
    windows.forEach((w, i) => { const on = smooth(L * 1.6 - i * 0.1); w.s.material.opacity = (0.25 + on * 0.75) * (0.85 + Math.sin(t * 1.3 + w.ph) * 0.12); w.s.scale.setScalar(1.2 + on * 1.2); });
    for (const f of flies) {
      f.s.position.set(f.x + Math.sin(t * f.sp + f.ph) * 1.2, 0.6 + Math.sin(t * f.sp * 1.7 + f.ph) * 0.4, f.z + Math.cos(t * f.sp * 0.8 + f.ph) * 1.2);
      f.s.material.opacity = Math.max(0, Math.sin(t * 2.2 + f.ph * 3)) * 0.9;
    }
    brazierLight.intensity = 3 + Math.sin(t * 13) * 0.5 + Math.sin(t * 29) * 0.3;
    fireAcc += dt * 10;
    while (fireAcc > 1) { fireAcc -= 1; parts.emit({ at: new THREE.Vector3(1.6, 1.15, -9.6), count: 1, speed: 0.8, spread: 0.4, up: 1, colors: ["#ffb347", "#ff7a2c", "#ffe08a"], size: 0.06, life: 0.6, gravity: -1.5, drag: 1 }); }
    smokeAcc += dt * 3;
    while (smokeAcc > 1) { smokeAcc -= 1; const c = chimneys[(R() * chimneys.length) | 0]; parts.emit({ at: c, count: 1, speed: 0.4, spread: 0.3, up: 1, dir: new THREE.Vector3(0.25, 0, 0), color: "#8f8aa0", size: 0.18, life: 3.5, gravity: -0.25, drag: 0.8, grow: 3 }); }
    oaks.forEach((o, i) => { o.obj.rotation.z = Math.sin(t * 0.7 + i * 2) * 0.025; o.obj.rotation.x = Math.sin(t * 0.5 + i) * 0.015; });
    waterMat.emissiveIntensity = 0.45 + Math.sin(t * 1.4) * 0.08;
    // the witch, by code: a gentle sway at rest, a lean to toss, a hop to cheer, a crouch to flinch
    const wk = t - witchMove.t0, wo = witch.obj;
    let pitch = Math.sin(t * 1.1) * 0.02, lift = Math.abs(Math.sin(t * 1.6)) * 0.015, squash = 1;
    if (witchMove.kind === "toss") pitch += Math.sin(clamp(wk / 0.9, 0, 1) * Math.PI) * 0.35;
    else if (witchMove.kind === "cheer") lift += Math.abs(Math.sin(clamp(wk / 1.2, 0, 1) * Math.PI * 2)) * 0.35;
    else if (witchMove.kind === "flinch") { const f = Math.sin(clamp(wk / 1.1, 0, 1) * Math.PI); pitch -= f * 0.25; squash = 1 - f * 0.18; }
    wo.rotation.x = pitch;
    wo.position.y = 0.7 + lift;
    wo.scale.set(1, squash, 1);
    // the stray cat wanders and sits
    if (t > cat2.until) { cat2.mode = cat2.mode === "walk" ? "sit" : "walk"; cat2.until = t + (cat2.mode === "walk" ? 5 + R() * 4 : 3 + R() * 3); strayCat.play(cat2.mode === "walk" ? "Walk" : "Idle", { fade: 0.3 }); }
    if (cat2.mode === "walk") cat2.a += dt * 0.16;
    const cr = 4.4 + Math.sin(cat2.a * 1.7) * 0.6;
    strayCat.obj.position.set(Math.cos(cat2.a) * cr, 0.02, Math.sin(cat2.a) * cr);
    strayCat.obj.rotation.y = -cat2.a;
    if (extras) animals(extras, t);

    // eruptions for big words
    for (const gz of geysers) {
      gz.acc += dt * gz.rate;
      while (gz.acc > 1) { gz.acc -= 1; parts.emit({ at: new THREE.Vector3(0, rimY, 0), count: 3, speed: gz.speed, spread: 0.18, up: 1, colors: gz.colors, size: 0.09, life: 1.6, gravity: 6, drag: 0.2 }); }
    }
    geysers = geysers.filter((gz) => t <= gz.until);
    // the brew
    brew.position.y = rimY - 0.06 + fill.v * 0.05;
    brewMat.emissiveIntensity = 0.5 + fill.v * 0.6 + wave * 0.7;
    potLight.intensity = 6 + fill.v * 5 + wave * 14 + Math.sin(t * 13) * 0.6;
    wave *= Math.exp(-dt * 3);
    const bp = brewGeo.attributes.position;
    for (let i = 0; i < bp.count; i++) bp.setY(i, Math.sin(t * 4 + brewBase[i * 3] * 19) * 0.012 + Math.sin(t * 5.3 + brewBase[i * 3 + 2] * 23) * 0.012);
    bp.needsUpdate = true;
    steamAcc += dt * 3;
    while (steamAcc > 1) { steamAcc -= 1; parts.emit({ at: new THREE.Vector3((R() - 0.5) * 0.4, rimY + 0.1, (R() - 0.5) * 0.4), count: 1, speed: 0.4, spread: 0.3, up: 1, colors: ["#cfc3ea", brewMat.emissive.getStyle()], size: 0.07, life: 2.2, gravity: -0.15, drag: 1.2, grow: 2.5 }); }
    if (column) {
      const c = column, k2 = smooth((t - c.start) / 1.2);
      c.mesh.scale.set(1, Math.max(k2, 0.001), 1); c.mesh.rotation.y = t * 0.6;
      c.mesh.material.opacity = 0.55 + Math.sin(t * 6) * 0.08;
      if (Math.floor(t * 3) !== c.last) { c.last = Math.floor(t * 3); parts.emit({ at: new THREE.Vector3((R() - 0.5) * 20, 7 + R() * 6, (R() - 0.5) * 16), count: 26, speed: 4, spread: 1, up: 0.3, colors: ["#ffe08a", "#c86cf0", "#8df060", "#ff9a3c"], size: 0.12, life: 1.3, gravity: 2.5, drag: 0.6 }); }
    }
  };

  // crows hop between perches; the owl turns its head; rats dart between barrels; the wolf howls; the hearse rolls round
  function animals(x: Extras, t: number) {
    const appear = smooth((t - x.born) / 0.8);
    for (const cw of x.crows) {
      const o = cw.e.obj;
      o.scale.setScalar(2.4 * Math.max(appear, 0.001));
      if (!cw.fly && t > cw.next) {
        let to = cw.at;
        while (to === cw.at || x.crows.some((c) => c !== cw && c.at === to)) to = (R() * x.perches.length) | 0;
        cw.fly = { from: o.position.clone(), to, t0: t, dur: 2.2, high: 3 };
        cw.at = -1;
        cw.e.play("Fly", { fade: 0.15 });
      }
      if (cw.fly) {
        const f = cw.fly, kf = Math.min((t - f.t0) / f.dur, 1), dest = x.perches[f.to];
        o.position.lerpVectors(f.from, dest, smooth(kf));
        o.position.y += Math.sin(kf * Math.PI) * f.high;
        o.rotation.y = Math.atan2(dest.x - f.from.x, dest.z - f.from.z);
        if (kf >= 1) { cw.at = f.to; cw.fly = null; cw.next = t + 5 + R() * 7; cw.e.play("Idle", { fade: 0.2 }); }
      }
    }
    x.owl.obj.scale.setScalar(2.6 * Math.max(appear, 0.001));
    x.owl.obj.rotation.y = 0.3 + Math.round(Math.sin(t * 0.4) * 2) * 0.5;
    for (const r of x.rats) {
      r.e.obj.scale.setScalar(2 * Math.max(appear, 0.001));
      const kr = (t - r.t0) / 0.9;
      if (t - r.t0 > 0.9 + r.wait) { r.from = r.spots[r.at]; r.at = 1 - r.at; r.t0 = t; r.wait = 2 + R() * 4; r.e.play("Run", { fade: 0.1 }); }
      if (!r.from) continue;
      const to = r.spots[r.at], kk = clamp(kr, 0, 1);
      r.e.obj.position.lerpVectors(r.from, to, kk);
      if (kk < 1) r.e.obj.rotation.y = Math.atan2(to.x - r.from.x, to.z - r.from.z);
      else if (r.e.current !== r.e.actions.Idle) r.e.play("Idle", { fade: 0.2 });
    }
    x.wolf.obj.scale.setScalar(1.7 * Math.max(appear, 0.001));
    const hp = (t % 11) / 11, howl = hp > 0.7 ? Math.sin(((hp - 0.7) / 0.3) * Math.PI) : 0;
    x.wolf.obj.rotation.x = -howl * 0.55;
    const ha = -t * 0.05;
    x.hearse.obj.scale.setScalar(0.6 * Math.max(appear, 0.001));
    x.hearse.obj.position.set(Math.sin(ha) * 15.3, 0.37 * 0.6, Math.cos(ha) * 15.3);
    x.hearse.obj.rotation.y = ha - Math.PI / 2;
    const fx = -Math.cos(ha), fz = Math.sin(ha), sx = Math.sin(ha), sz = Math.cos(ha);
    x.headlights.forEach((h, i) => {
      const side = (i ? 1 : -1) * 0.5;
      h.position.set(x.hearse.obj.position.x + fx * 1.9 + sx * side, 0.65, x.hearse.obj.position.z + fz * 1.9 + sz * side);
      h.material.opacity = appear;
    });
  }
  stage.updaters.add(update);
  joinStill(still, scene);
  // The village's shaders, compiled in the background before it shows.
  await stage.renderer.compileAsync(scene, stage.camera);

  const until = stage.until;

  function setSteps(level: number, instant: boolean) {
    if (instant) glowK.jump(level / 6);
    else glowK.set(level / 6);
    STEPS.forEach((name, i) => { const on = level >= i + 1 ? 1 : 0; if (instant) K[name].jump(on); else K[name].set(on); });
  }

  function splash(isBonus: boolean, n: number, tier: number, look: Look) {
    parts.emit({ at: new THREE.Vector3(0, brew.position.y + 0.03, 0), count: 10 + Math.min(n, 12) + tier * 8, speed: 1.8 + n * 0.08 + tier * 0.9, spread: 1, up: tier ? 0.7 : 1.2, colors: isBonus ? ["#ffe08a", "#ffc23a", "#fff4cf"] : look.splash, size: 0.05, life: 0.8, gravity: 7, drag: 0.3 });
    wave = Math.min(wave + 0.6, 1.6);
    stage.shake(isBonus ? 0.016 : 0.007 + tier * 0.006, 0.3);
  }

  type Flying = { m: Block; from: THREE.Vector3; isBonus: boolean; born: number; start: number; to: THREE.Vector3; top: THREE.Vector3; gone: boolean };
  async function arcIn(blocks: Flying[], n: number, look: Look) {
    const fly = 0.62, gap = 0.11, t0 = stage.t;
    blocks.forEach((b, i) => { b.start = t0 + i * gap; b.to.set((R() - 0.5) * 0.2, rimY, (R() - 0.5) * 0.2); });
    await until((t) => {
      let left = 0;
      for (const b of blocks) {
        if (b.gone) continue;
        left++;
        const kf = (t - b.start) / fly;
        if (kf < 0) continue;
        if (kf >= 1) { b.gone = true; disposeBlock(b.m); splash(b.isBonus, n, 0, look); continue; }
        b.m.position.lerpVectors(b.from, b.to, kf);
        b.m.position.y += Math.sin(kf * Math.PI) * 1.2;
        b.m.rotation.set(kf * 6, kf * 4, kf * 2);
        b.m.scale.setScalar(1 - kf * 0.4);
      }
      return !left;
    });
  }
  async function slamIn(blocks: Flying[], n: number, tier: number, look: Look) {
    // the letters rise into a ring over the pot, hang, then slam down one after another, trailing sparks
    const t0 = stage.t, rise = 0.5, gap = tier === 3 ? 0.07 : 0.09, pot = new THREE.Vector3(0, rimY, 0);
    blocks.forEach((b, i) => {
      const a = (i / n) * Math.PI * 2;
      b.top.set(Math.cos(a) * 1.5, 3.4 + tier * 0.35, Math.sin(a) * 1.5);
      b.start = t0 + rise + 0.25 + i * gap;
    });
    await until((t) => {
      let left = 0;
      for (const b of blocks) {
        if (b.gone) continue;
        left++;
        if (t < b.start) { b.m.position.lerpVectors(b.from, b.top, smooth((t - t0) / rise)); b.m.rotation.y += 0.15; continue; }
        const kf = (t - b.start) / 0.32;
        if (kf >= 1) { b.gone = true; disposeBlock(b.m); splash(b.isBonus, n, tier, look); continue; }
        b.m.position.lerpVectors(b.top, pot, kf * kf);
        b.m.rotation.x += 0.4;
        parts.emit({ at: b.m.position.clone(), count: 2, speed: 0.4, spread: 1, up: 0.5, colors: look.splash, size: 0.06, life: 0.5, gravity: 1, drag: 1 });
      }
      return !left;
    });
  }

  return {
    // The word moment in four tiers (16g-1 answers 21, 22). 0: the letters arc in. 1, good: they rise, glow and slam down
    // like meteors. 2, great: the slam, then the cauldron erupts, a shockwave sweeps the village and the camera slams in.
    // 3, huge: all of it bigger, a second shockwave, a flash in the sky and a harder slam.
    async word(letters, bonus, bonusLetter) {
      const n = letters.length, tier = tierOf(n, bonus), look = TIER_LOOK[tier];
      witchMove = { kind: "toss", t0: stage.t };
      const w = Math.min(0.42, 3.4 / n);
      const blocks: Flying[] = [...letters].map((ch, i) => {
        const isBonus = ch === bonusLetter;
        const m = letterBlock(ch, w * 0.9 * (tier ? 1.35 : 1), isBonus ? GOLD : look, font);
        const from = new THREE.Vector3((i - (n - 1) / 2) * w, 3.2, 2.2);
        m.position.copy(from); m.scale.setScalar(0.001); scene.add(m);
        return { m, from, isBonus, born: stage.t + i * 0.04, start: 0, to: new THREE.Vector3(), top: new THREE.Vector3(), gone: false };
      });
      stage.punch(new THREE.Vector3(0, rimY + (tier ? 1.4 : 0), 0), tier ? 0.3 : 0.5, tier ? 2.2 + n * 0.08 : 0.45 + n * 0.11 + 0.62 + 1.6);
      await until((t) => {
        let done = true;
        for (const b of blocks) { const kb = (t - b.born) / 0.3; b.m.scale.setScalar(Math.max(easeOutBack(kb), 0.001)); if (kb < 1) done = false; }
        return done;
      });
      await wait(180);
      if (tier === 0) await arcIn(blocks, n, look);
      else await slamIn(blocks, n, tier, look);
      parts.emit({ at: new THREE.Vector3(0, rimY, 0), count: 18 + n * 6 + tier * 30, speed: 2.6 + n * 0.3 + tier, spread: 0.35, up: 1, colors: look.splash, size: 0.07 + tier * 0.01, life: 1.3, gravity: 5, drag: 0.4 });
      if (bonus) parts.emit({ at: new THREE.Vector3(0, rimY + 0.1, 0), count: 30, speed: 3, spread: 0.8, up: 1, colors: ["#ffe08a", "#fff4cf", "#ffc23a"], size: 0.05, life: 1.4, gravity: 3, drag: 0.6 });
      wave = 1.2 + tier * 0.4;
      if (tier >= 2) {
        geysers.push({ until: stage.t + (tier === 3 ? 2.2 : 1.2), rate: tier === 3 ? 60 : 36, speed: tier === 3 ? 11 : 8, colors: look.splash, acc: 0 });
        shocks.push({ start: stage.t, r: 0 });
        if (tier === 3) { shocks.push({ start: stage.t + 0.45, r: 0 }); flash = 1; }
        ringMat.color.set(tier === 3 ? "#fff1a8" : "#b6ff8a");
        stage.punch(new THREE.Vector3(0, rimY + 1, 0), tier === 3 ? 0.62 : 0.5, tier === 3 ? 3.4 : 2.6);
        stage.shake(tier === 3 ? 0.07 : 0.045, tier === 3 ? 1.1 : 0.8);
      } else stage.shake(0.012 + n * 0.0015 + tier * 0.01, 0.5);
      witchMove = { kind: "cheer", t0: stage.t };
      await wait(tier >= 2 ? 2100 : 1500);
    },
    async miss(typed) {
      const letters = typed.slice(0, 10) || "???";
      cat.play("Arch", { loop: false, fade: 0.15 });
      witchMove = { kind: "flinch", t0: stage.t };
      const n = letters.length, w = Math.min(0.4, 3 / n);
      const blocks = [...letters].map((ch, i) => {
        const m = letterBlock(ch, w * 0.9, GREY, font);
        m.position.set((i - (n - 1) / 2) * w, 3, 2.2); scene.add(m);
        return { m, vy: 0, spin: (R() - 0.5) * 4 };
      });
      stage.shake(0.01, 0.4);
      const t0 = stage.t;
      await until((t, dt) => {
        for (const b of blocks) { b.vy -= 7 * dt; b.m.position.y = Math.max(0.15, b.m.position.y + b.vy * dt); b.m.rotation.z += b.spin * dt; }
        if (t - t0 <= 0.8) return false;
        for (const b of blocks) { parts.emit({ at: b.m.position.clone(), count: 8, speed: 0.6, spread: 1, up: 1, colors: ["#6d6680", "#9a93a8", "#4b4458"], size: 0.09, life: 1.6, gravity: -0.4, drag: 1.5, grow: 2 }); disposeBlock(b.m); }
        return true;
      });
      await wait(900);
      cat.play("Idle", { fade: 0.4 });
    },
    refused() {
      parts.emit({ at: new THREE.Vector3(0, rimY + 0.1, 0), count: 14, speed: 0.7, spread: 1, up: 1, colors: ["#6d6680", "#9a93a8", "#4b4458"], size: 0.08, life: 1.4, gravity: -0.5, drag: 1.4, grow: 2 });
    },
    // One equal step of change a round (16g-1 answers 14, 15): the brew's magic streaks to the next part of the village,
    // the camera glances there and back, and that part changes.
    async cast(level) {
      const to = AREAS[STEPS[level - 1]];
      stage.punch(to, 0.32, 3.6);
      const from = new THREE.Vector3(0, rimY + 0.3, 0), t0 = stage.t, p = new THREE.Vector3();
      await until((t) => {
        const kc = Math.min((t - t0) / 0.9, 1);
        p.lerpVectors(from, to, kc); p.y += Math.sin(kc * Math.PI) * 4;
        parts.emit({ at: p.clone(), count: 4, speed: 0.4, spread: 1, up: 0.2, colors: ["#c86cf0", "#e7b6ff", "#8df060", "#ffe08a"], size: 0.09, life: 0.9, gravity: 0.6, drag: 1 });
        return kc >= 1;
      });
      parts.emit({ at: to, count: 50, speed: 3, spread: 1, up: 1, colors: ["#c86cf0", "#e7b6ff", "#8df060", "#ffe08a"], size: 0.1, life: 1.2, gravity: 3 });
      setSteps(level, false);
      await wait(2800);
    },
    setLevel(level) {
      if (column) { scene.remove(column.mesh); column.mesh.geometry.dispose(); column.mesh.material.dispose(); column = null; }
      shocks = []; geysers = [];
      placeHome(stage);
      setSteps(level, true);
    },
    score(total) { fill.set(Math.min(total / FULL, 1)); },
    // The short finale after round 7 (16g-1 answer 26): a column of light and a burst; it stays lit (answer 29).
    async finale() {
      const geo = new THREE.CylinderGeometry(0.5, 0.9, 40, 7, 1, true); geo.translate(0, 20, 0);
      const mat = new THREE.MeshBasicMaterial({ color: brewMat.emissive.clone(), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
      const mesh = new THREE.Mesh(geo, mat); mesh.position.y = rimY; scene.add(mesh);
      column = { mesh, start: stage.t, last: -1 };
      stage.pull(0.15, 1.6, 2.5);
      parts.emit({ at: new THREE.Vector3(0, rimY, 0), count: 120, speed: 6, spread: 0.5, up: 1, colors: ["#c86cf0", "#e7b6ff", "#8df060", "#ffe08a"], size: 0.08, life: 2, gravity: 4, drag: 0.3 });
      witchMove = { kind: "cheer", t0: stage.t };
      await wait(1400);
    },
    settled: () => stage.settled(),
    extras: extrasLoaded,
    stop: () => stage.stop(),
  };
}
