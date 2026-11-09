// Midnight Brew's stage (docs/milestones/M16-16g-2-midnight-brew-in-play2.md, 16g-2a): the 3D parts of the 16g-1 mock's
// harness (its scratchpad `mocks/shared/harness.js`, version 6), typed: the renderer and its loop, a camera that holds one
// pose and moves only when told (a punch, a shake, a pull; 16g-1 answer 9), letter blocks, a pool of low-poly particles,
// eased values, and polyfork model loading. The mock's own panel, sample run and scoring stay behind: the real run and the
// server replace them (16g-2, Design). Browser only; loaded on demand by game 2's screen.
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export { THREE };

// ---------- small helpers ----------
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const smooth = (k: number) => {
  k = clamp(k, 0, 1);
  return k * k * (3 - 2 * k);
};
export const easeOutCubic = (k: number) => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
export const easeOutBack = (k: number) => {
  k = clamp(k, 0, 1);
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2);
};
export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export type Updater = (t: number, dt: number) => void;

// A slow GPU, such as CI's software renderer (16g-2 answer 13). Proposed by Claude and approved by the human (answers 18, 20;
// ticket, Numbers): the stage keeps real time through frames up to MAX_DT long (the mock's 0.05 s slowed every moment on a slow
// GPU); the first SLOW_SAMPLE drawn frames decide, and a GPU whose median frame is over SLOW_MS (under 10 a second) leaves
// SLOW_DRAW_MS between the end of one draw and the next, and draws its shadows once more and then holds them (answer 15:
// redrawing the shadow map was two-thirds of a software draw).
// 1 s, not the 0.25 s first approved: CI's software draws ran longer, and the moments fell behind real time (answer 20).
const MAX_DT = 1;
const SLOW_SAMPLE = 10;
const SLOW_MS = 100;
const SLOW_DRAW_MS = 500;
type Pose = { pos: THREE.Vector3; target: THREE.Vector3 };
type Move =
  | { kind: "punch"; focus: THREE.Vector3; amount: number; dur: number; start: number }
  | { kind: "shake"; amount: number; dur: number; start: number; seed: number }
  | { kind: "pull"; amount: number; dur: number; rise: number; start: number };

export type Stage = ReturnType<typeof createStage>;

// ---------- the stage ----------
// onFault: an error in the frame loop stops the scene and is handed on, to be shown (DECISIONS.md, Error handling), as a
// loop that threw would otherwise just stop drawing. The canvas joins the host only when the caller shows the stage.
export function createStage(host: HTMLElement, onFault: (err: unknown) => void, { fov = 30, near = 0.3, far = 500 } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, near, far);
  const updaters = new Set<Updater>();
  // The held pose; a phone's tall box gets the wide pose, so the centre still reads (16g-1 answer 8).
  // Rejects when the frame loop faults, so a wait on the scene ends instead of hanging; onFault reports the error.
  let faulted: (err: unknown) => void = () => {};
  const dead = new Promise<never>((_, reject) => { faulted = reject; });
  dead.catch(() => {});
  const rig: { pos: THREE.Vector3; target: THREE.Vector3; wide: Pose | null; moves: Move[] } = { pos: new THREE.Vector3(0, 2, 6), target: new THREE.Vector3(), wide: null, moves: [] };
  const stage = {
    renderer, scene, camera, updaters, t: 0, aspect: 1,
    // A jump returns to the pose, cutting any move still running, so a round never starts with the camera moving.
    setPose(pos: THREE.Vector3, target: THREE.Vector3, wide: Pose | null) {
      rig.pos.copy(pos); rig.target.copy(target);
      rig.wide = wide && { pos: wide.pos.clone(), target: wide.target.clone() };
      rig.moves = [];
    },
    punch(focus: THREE.Vector3, amount = 0.22, dur = 1.4) { rig.moves.push({ kind: "punch", focus: focus.clone(), amount, dur, start: stage.t }); },
    shake(amount = 0.04, dur = 0.45) { rig.moves.push({ kind: "shake", amount, dur, start: stage.t, seed: Math.random() * 100 }); },
    pull(amount = 0.3, dur = 3.2, rise = 0.5) { rig.moves.push({ kind: "pull", amount, dur, rise, start: stage.t }); },
    // Resolves once no move is running, in the stage's own time: the box takes focus only then (16g-1 answer 9).
    settled() {
      return stage.until(() => {
        rig.moves = rig.moves.filter((m) => stage.t - m.start < m.dur);
        return !rig.moves.length;
      });
    },
    // Resolves on the first frame fn returns true; rejects if the scene faults first.
    until(fn: (t: number, dt: number) => boolean) {
      return Promise.race([
        new Promise<void>((done) => {
          const u: Updater = (t, dt) => { if (fn(t, dt)) { updaters.delete(u); done(); } };
          updaters.add(u);
        }),
        dead,
      ]);
    },
    // The village is in: it joins the page, and the frames that decide a slow GPU are counted from here. Resolves once
    // they have decided, as on a slow GPU those frames hold the page for seconds, and a run started then waits for them.
    show() {
      host.appendChild(renderer.domElement);
      shown = true; lastDraw = -Infinity; gaps = []; slow = false; renderer.shadowMap.autoUpdate = true;
      return Promise.race([new Promise<void>((r) => { paced = r; }), dead]);
    },
    stop() {},
  };

  const tmpP = new THREE.Vector3(), tmpT = new THREE.Vector3(), blendTarget = new THREE.Vector3(), off = new THREE.Vector3();
  function placeCamera() {
    let pos = rig.pos, target = rig.target;
    if (rig.wide && stage.aspect < 1.1) { pos = rig.wide.pos; target = rig.wide.target; }
    tmpP.copy(pos); tmpT.copy(target);
    let dolly = 0, rise = 0, sx = 0, sy = 0, blendK = 0;
    rig.moves = rig.moves.filter((m) => stage.t - m.start < m.dur);
    for (const m of rig.moves) {
      const k = (stage.t - m.start) / m.dur;
      if (m.kind === "punch") {
        const env = k < 0.2 ? easeOutCubic(k / 0.2) : k < 0.55 ? 1 : 1 - smooth((k - 0.55) / 0.45);
        dolly -= m.amount * env;
        blendTarget.copy(m.focus); blendK = Math.max(blendK, 0.45 * env);
      } else if (m.kind === "pull") {
        const env = k < 0.35 ? smooth(k / 0.35) : k < 0.6 ? 1 : 1 - smooth((k - 0.6) / 0.4);
        dolly += m.amount * env; rise += m.rise * env;
      } else {
        const d = Math.pow(1 - k, 2) * m.amount, tt = stage.t + m.seed;
        sx += (Math.sin(tt * 47) + Math.sin(tt * 31.7) * 0.6) * d;
        sy += (Math.sin(tt * 39.3) + Math.sin(tt * 27.1) * 0.6) * d;
      }
    }
    if (blendK > 0) tmpT.lerp(blendTarget, blendK);
    off.copy(tmpP).sub(tmpT).multiplyScalar(1 + dolly);
    camera.position.copy(tmpT).add(off);
    camera.position.y += rise;
    camera.lookAt(tmpT);
    if (sx || sy) { const len = off.length(); camera.translateX(sx * len); camera.translateY(sy * len); }
  }

  function resize() {
    const w = host.clientWidth || 1, h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = stage.aspect = w / h;
    // A narrow box widens the vertical field of view so the village's width stays in view.
    camera.fov = stage.aspect < 1.2 ? Math.min(fov * (1.2 / stage.aspect) ** 0.55, 72) : fov;
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  let last = performance.now(), raf = 0, moving = "";
  function frame(now: number) {
    try {
      step(now);
    } catch (err) {
      faulted(err);
      stage.stop();
      onFault(err);
      return;
    }
    raf = requestAnimationFrame(frame);
  }
  // A slow GPU (16g-2, answer 13): once the median drawn frame is over SLOW_MS, the village leaves SLOW_DRAW_MS free after each
  // draw, while time and movement still step every frame, so the page stays responsive and the moments keep real time.
  // Nothing is drawn before the village shows: its canvas is off the page, and on a slow GPU each draw held up the load.
  // The median, not the mean, so one stall in the sample (the first draw's uploads, a hidden tab) can't make a GPU slow.
  let shown = false, lastDraw = -Infinity, gaps: number[] = [], slow = false, paced = () => {};
  function step(now: number) {
    const dt = Math.min((now - last) / 1000, MAX_DT);
    last = now;
    stage.t += dt;
    for (const u of updaters) u(stage.t, dt);
    placeCamera();
    // Whether the camera is moving, on the host, so a check can see answer 9 held: still whenever the box has focus.
    const now2 = rig.moves.length ? "moving" : "still";
    if (now2 !== moving) { moving = now2; host.dataset.camera = now2; }
    if (!shown || (slow && now - lastDraw < SLOW_DRAW_MS)) return;
    if (!slow && Number.isFinite(lastDraw) && gaps.length < SLOW_SAMPLE) {
      gaps.push(now - lastDraw);
      if (gaps.length === SLOW_SAMPLE) {
        if (gaps.sort((a, b) => a - b)[SLOW_SAMPLE >> 1] > SLOW_MS) {
          slow = true;
          renderer.shadowMap.autoUpdate = false;
          renderer.shadowMap.needsUpdate = true;
        }
        paced();
      }
    }
    renderer.render(scene, camera);
    // From the draw's end, not its start: on a slow GPU a draw blocks the page longer than SLOW_DRAW_MS, and the gap
    // after it is the page's time for taps and replies.
    lastDraw = slow ? performance.now() : now;
  }
  raf = requestAnimationFrame((n) => { last = n; frame(n); });
  // Stopping ends every wait on the scene, so a moment the panel is watching can't hang on a village that's gone.
  stage.stop = () => {
    faulted(new Error("The village stopped."));
    cancelAnimationFrame(raf);
    observer.disconnect();
    updaters.clear();
    renderer.dispose();
    renderer.domElement.remove();
  };
  return stage;
}

// ---------- models ----------
// The models are polyfork.dev GLB files in public/brew/, shipped inside the game (DECISIONS.md, 3D scenes).
const loader = new GLTFLoader();
export async function loadModels(ids: readonly string[]): Promise<Record<string, GLTF>> {
  const out: Record<string, GLTF> = {};
  await Promise.all(ids.map(async (id) => { out[id] = await loader.loadAsync(`/brew/${id}.glb`); }));
  return out;
}

export type Ent = {
  obj: THREE.Object3D;
  mixer: THREE.AnimationMixer | null;
  actions: Record<string, THREE.AnimationAction>;
  current: THREE.AnimationAction | null;
  play(name: string, opts?: { fade?: number; loop?: boolean; timeScale?: number }): THREE.AnimationAction;
};

// A placed copy of a model. A model's own clips play through a mixer; 'tick' is a prop's self-animating idle loop.
export function spawn(stage: Stage, gltf: GLTF, { pos = [0, 0, 0] as [number, number, number], rotY = 0, scale = 1, shadows = true, tick = true, parent = null as THREE.Object3D | null } = {}): Ent {
  const obj = SkeletonUtils.clone(gltf.scene);
  obj.position.set(...pos);
  obj.rotation.y = rotY;
  obj.scale.setScalar(scale);
  obj.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = shadows; o.receiveShadow = true;
      if (o instanceof THREE.SkinnedMesh) o.frustumCulled = false;
    }
  });
  (parent ?? stage.scene).add(obj);
  const ent: Ent = {
    obj, mixer: null, actions: {}, current: null,
    play(name, { fade = 0.25, loop = true, timeScale = 1 } = {}) {
      const next = ent.actions[name];
      if (!next) throw new Error(`no clip ${name} (has ${Object.keys(ent.actions).join(", ")})`);
      next.timeScale = timeScale;
      if (next === ent.current && loop) return next;
      next.reset();
      next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
      next.clampWhenFinished = !loop;
      next.enabled = true;
      next.play();
      if (ent.current && ent.current !== next) ent.current.crossFadeTo(next, fade, false);
      ent.current = next;
      return next;
    },
  };
  if (gltf.animations.length) {
    const mixer = new THREE.AnimationMixer(obj);
    ent.mixer = mixer;
    for (const clip of gltf.animations) ent.actions[clip.name] = mixer.clipAction(clip);
    if (tick && ent.actions.tick) ent.actions.tick.play();
    stage.updaters.add((t, dt) => mixer.update(dt));
  }
  return ent;
}

// Props that never move, joined into one mesh per look (16g-2 answers 14, 16): it took the village from 558 draw calls a
// frame to 268, less work a frame for a phone's CPU (unverified; it didn't speed up software drawing, ticket). Meshes join
// when their materials look the same, as the polyfork models' materials all do, so a field of models costs one draw. The
// joined meshes go into `into`; `still` is left empty.
export function joinStill(still: THREE.Object3D, into: THREE.Object3D) {
  still.updateMatrixWorld(true);
  const sets = new Map<string, { mesh: THREE.Mesh; geos: THREE.BufferGeometry[] }>();
  still.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    if (o instanceof THREE.SkinnedMesh || Array.isArray(o.material) || !(o.material instanceof THREE.MeshStandardMaterial)) throw new Error(`joinStill: ${o.name || "a mesh"} can't join`);
    const m = o.material, g = o.geometry as THREE.BufferGeometry;
    const attrs = Object.entries(g.attributes).map(([n, a]) => `${n}:${a.itemSize}:${a.normalized}:${a.array.constructor.name}`).sort();
    const key = [
      m.color.getHex(), m.emissive.getHex(), m.emissiveIntensity, m.roughness, m.metalness, m.vertexColors, m.flatShading, m.transparent, m.opacity, m.side, m.map?.uuid,
      o.castShadow, o.receiveShadow, g.index !== null, ...attrs,
    ].join("|");
    const geo = g.clone().applyMatrix4(o.matrixWorld);
    const set = sets.get(key);
    if (set) set.geos.push(geo);
    else sets.set(key, { mesh: o, geos: [geo] });
  });
  for (const { mesh, geos } of sets.values()) {
    const joined = mergeGeometries(geos);
    if (!joined) throw new Error("joinStill: mergeGeometries refused a set");
    for (const geo of geos) geo.dispose();
    const out = new THREE.Mesh(joined, mesh.material);
    out.castShadow = mesh.castShadow; out.receiveShadow = mesh.receiveShadow;
    into.add(out);
  }
  still.clear();
}

// ---------- letter blocks ----------
export type BlockLook = { face: string; ink: string; edge: string; side: string; glow?: string | null };
const texCache = new Map<string, THREE.CanvasTexture>();
function letterTexture(ch: string, look: BlockLook, font: string) {
  const key = ch + look.face + look.ink + look.edge;
  const hit = texCache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = look.edge; g.fillRect(0, 0, 128, 128);
  g.fillStyle = look.face; g.fillRect(8, 8, 112, 112);
  g.fillStyle = look.ink;
  g.font = `800 92px ${font}`;
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(ch.toUpperCase(), 64, 72);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  texCache.set(key, t);
  return t;
}
export type Block = THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial[]>;
export function letterBlock(ch: string, size: number, look: BlockLook, font: string): Block {
  const geo = new THREE.BoxGeometry(size, size, size * 0.62);
  const sideMat = new THREE.MeshStandardMaterial({ color: look.side, flatShading: true, roughness: 0.8 });
  const faceMat = new THREE.MeshStandardMaterial({ map: letterTexture(ch, look, font), roughness: 0.7 });
  if (look.glow) {
    faceMat.emissive = new THREE.Color(look.glow); faceMat.emissiveIntensity = 0.55; faceMat.emissiveMap = faceMat.map;
    sideMat.emissive = new THREE.Color(look.glow); sideMat.emissiveIntensity = 0.35;
  }
  const m = new THREE.Mesh(geo, [sideMat, sideMat, sideMat, sideMat, faceMat, faceMat]);
  m.castShadow = true;
  return m;
}
export function disposeBlock(m: Block) {
  m.parent?.remove(m);
  m.geometry.dispose();
  for (const mat of new Set(m.material)) mat.dispose();
}

// ---------- particles: low-poly chips in one instanced mesh ----------
type Chip = { life: number; max: number; p: THREE.Vector3; v: THREE.Vector3; size: number; g: number; drag: number; spin: number; grow: number; floor: number; bounce: number };
export type Emit = {
  at: THREE.Vector3; count?: number; speed?: number; spread?: number; up?: number; dir?: THREE.Vector3 | null; color?: string; colors?: readonly string[] | null;
  size?: number; sizeJitter?: number; life?: number; lifeJitter?: number; gravity?: number; drag?: number; grow?: number; floor?: number; bounce?: number;
};
export type Particles = ReturnType<typeof createParticles>;
export function createParticles(stage: Stage, capacity = 700) {
  const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.6, metalness: 0 }), capacity);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  const col = new THREE.Color();
  for (let i = 0; i < capacity; i++) mesh.setColorAt(i, col.set("#ffffff"));
  stage.scene.add(mesh);
  const P: Chip[] = [];
  for (let i = 0; i < capacity; i++) P.push({ life: 0, max: 1, p: new THREE.Vector3(), v: new THREE.Vector3(), size: 0.05, g: 9.8, drag: 0, spin: 0, grow: 0, floor: -Infinity, bounce: 0 });
  let next = 0;
  const dummy = new THREE.Object3D();
  stage.updaters.add((t, dt) => {
    for (let i = 0; i < capacity; i++) {
      const q = P[i];
      if (q.life <= 0) { dummy.scale.setScalar(0); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); continue; }
      q.life -= dt;
      q.v.y -= q.g * dt;
      q.v.multiplyScalar(1 - q.drag * dt);
      q.p.addScaledVector(q.v, dt);
      if (q.p.y < q.floor) { q.p.y = q.floor; q.v.y = -q.v.y * q.bounce; q.v.x *= 0.6; q.v.z *= 0.6; }
      const k = q.life / q.max;
      const s = q.size * (q.grow ? 1 + (1 - k) * q.grow : 1) * Math.min(1, k * 4);
      dummy.position.copy(q.p);
      dummy.rotation.set(q.spin * t, q.spin * 0.7 * t, 0);
      dummy.scale.setScalar(Math.max(s, 0));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return {
    emit({ at, count = 20, speed = 2, spread = 1, up = 1, dir = null, color = "#ffffff", colors = null, size = 0.05, sizeJitter = 0.5, life = 1, lifeJitter = 0.4, gravity = 9.8, drag = 0.5, grow = 0, floor = -Infinity, bounce = 0 }: Emit) {
      for (let n = 0; n < count; n++) {
        const i = next;
        const q = P[i];
        next = (next + 1) % capacity;
        q.p.copy(at);
        const a = Math.random() * Math.PI * 2, r = Math.random() * spread;
        q.v.set(Math.cos(a) * r, up + (Math.random() - 0.3) * 0.5 * up, Math.sin(a) * r).normalize().multiplyScalar(speed * (0.5 + Math.random() * 0.7));
        if (dir) q.v.add(dir);
        q.size = size * (1 - sizeJitter / 2 + Math.random() * sizeJitter);
        q.max = q.life = life * (1 - lifeJitter / 2 + Math.random() * lifeJitter);
        q.g = gravity; q.drag = drag; q.grow = grow; q.floor = floor; q.bounce = bounce;
        q.spin = Math.random() * 6;
        mesh.setColorAt(i, col.set(colors ? colors[(Math.random() * colors.length) | 0] : color));
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },
  };
}

// A value that eases toward its target each frame, for colours, light levels and the tracker.
export type Tween = { v: number; to: number; set(x: number): void; jump(x: number): void };
export function tween(stage: Stage, value: number, rate = 2): Tween {
  const s: Tween = { v: value, to: value, set(x) { s.to = x; }, jump(x) { s.v = s.to = x; } };
  stage.updaters.add((t, dt) => { s.v += (s.to - s.v) * (1 - Math.exp(-rate * dt)); });
  return s;
}

// A soft round glow, for candles, windows, fireflies and lamps that don't need a real light.
let glowTex: THREE.CanvasTexture | null = null;
export function glowSprite(scene: THREE.Object3D, color: string, size: number, pos: THREE.Vector3) {
  if (!glowTex) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!, gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    glowTex = new THREE.CanvasTexture(c);
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
  s.scale.setScalar(size); s.position.copy(pos); scene.add(s);
  return s;
}
