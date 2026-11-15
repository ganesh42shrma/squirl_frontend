import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { KINDS, T, at } from './journey';

/*
 * The journey's scene: one renderer, one world, pinned behind the page's chapters.
 *
 * The story (journey.js has the timeline): bank statements drift in the dark; they gather into a
 * stack and their rows lift off; the rows take the colours of the five kinds of money and settle
 * into five columns; the columns shrink onto a pen drive's board and the drive closes round them;
 * the drive flies to a laptop and plugs in, charge arcs round the port and the screen wakes; the
 * camera flies into the screen, which becomes the page (the HTML panels over the stage); then it
 * pulls out again, the lid closes on the drive's glow and the laptop turns for the last words.
 *
 * Rule of the house: every pose is a pure function of `progress` (the smoothed scroll, 0..1, owned
 * by the page). Clock time only adds motion that is zero-sum: a bob on loose parts, the flicker of
 * the charge, the pulse of the drive's light. Nothing is accumulated between frames, so scrolling
 * back, jumping to an anchor or reloading mid-page all land on the same picture.
 */

const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const ease = (t) => { const c = clamp01(t); return c * c * (3 - 2 * c); };
const easeOut = (t) => 1 - (1 - clamp01(t)) ** 3;
const span = (p, [a, b]) => (p - a) / (b - a);
const lerp = (a, b, t) => a + (b - a) * t;
const v = (x, y, z) => new THREE.Vector3(x, y, z);

// deterministic "random": the same scatter on every load
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* ---------------------------------------------------------------- the world's fixed points */

// The laptop's base is centred on the origin, its right side at x = 7, standing on the ground (y = 0).
const PORT = v(7, 0.42, 2.2);
const PLUGGED = v(PORT.x - 1.35, PORT.y, PORT.z); // the drive's tip, inside the laptop
const READY = v(PORT.x + 0.35, PORT.y, PORT.z); // the tip at the port's mouth
// The story's first half happens well to the laptop's right, out of its sight: the statements at
// x = 22, the columns round x = 26, the drive's build at x = 32. The drive then flies 25 units back.
const BUILD = v(32, 3.1, 4.6); // where the drive is built
const DRIVE_TILT = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.25, -0.9, 0.18));
const STACK = v(22.5, 4.3, 5.4); // where the statement pages gather
const STACK_TILT = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.32, 0.5, 0.06));
const CLOUD = v(26.2, 5.0, 4.2); // where lifted rows hang before they are sorted
const COLUMNS = { x0: 24.2, dx: 1.12, y0: 1.5, dy: 0.105, z: 4.8 };
const STORE = BUILD.clone().add(v(2.7, 0.14, 0).applyQuaternion(DRIVE_TILT)); // the drive's board

const PAPER = '#faf9f5';
const INK = '#1f1e1d';

/* ---------------------------------------------------------------- drawn textures */

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const FONT = '"Instrument Sans", system-ui, sans-serif';

/** The ledger on the laptop's screen. */
function screenTexture() {
  return canvasTexture(1024, 640, (g) => {
    g.fillStyle = PAPER;
    g.fillRect(0, 0, 1024, 640);
    g.fillStyle = '#f0eee6';
    g.fillRect(0, 0, 200, 640);
    g.fillStyle = INK;
    g.font = `500 30px ${FONT}`;
    g.fillText('squirl', 40, 64);
    g.font = `400 22px ${FONT}`;
    ['Dashboard', 'Ledger', 'Highlights', 'Imports'].forEach((w, i) => {
      if (i === 1) {
        g.fillStyle = '#e4e1d8';
        g.fillRect(24, 104 + i * 48, 152, 40);
      }
      g.fillStyle = i === 1 ? INK : '#6b6862';
      g.fillText(w, 40, 132 + i * 48);
    });
    g.fillStyle = INK;
    g.font = `500 34px ${FONT}`;
    g.fillText('March', 240, 70);
    const rows = [
      ['Salary credit', '#56693d', '+₹1,12,000'],
      ['Rent, March', '#a5543a', '−₹28,000'],
      ['SIP, index fund', '#3c6c9b', '−₹25,000'],
      ['Society maintenance', '#a5543a', '−₹3,400'],
      ['Swiggy', '#a5543a', '−₹486'],
      ['Credit card bill', '#8e6240', '−₹14,820'],
      ['Jio recharge', '#a5543a', '−₹299'],
    ];
    g.font = `400 24px ${FONT}`;
    rows.forEach(([name, col, amt], i) => {
      const y = 130 + i * 66;
      g.fillStyle = '#e8e5dc';
      g.fillRect(240, y + 30, 744, 2);
      g.fillStyle = INK;
      g.fillText(name, 240, y + 10);
      g.fillStyle = col;
      g.beginPath();
      g.arc(660, y + 2, 8, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = INK;
      g.textAlign = 'right';
      g.fillText(amt, 984, y + 10);
      g.textAlign = 'left';
    });
  });
}

/** One bank statement page: a coloured head, an account line, then ruled rows of grey text. */
function pageTexture(bank, tint, rand) {
  return canvasTexture(512, 704, (g, w, h) => {
    g.fillStyle = '#fbfaf6';
    g.fillRect(0, 0, w, h);
    g.fillStyle = tint;
    g.fillRect(0, 0, w, 74);
    g.fillStyle = '#ffffff';
    g.font = `600 30px ${FONT}`;
    g.fillText(bank, 32, 48);
    g.font = `400 18px ${FONT}`;
    g.textAlign = 'right';
    g.fillText('Account statement', w - 32, 46);
    g.textAlign = 'left';
    g.fillStyle = '#8a867e';
    g.fillRect(32, 104, 190, 10);
    g.fillRect(32, 126, 130, 10);
    g.fillRect(w - 162, 104, 130, 10);
    for (let i = 0; i < 13; i++) {
      const y = 186 + i * 38;
      g.fillStyle = '#e3dfd3';
      g.fillRect(32, y + 20, w - 64, 1.5);
      g.fillStyle = '#b9b4a8';
      g.fillRect(32, y, 54, 9);
      g.fillStyle = '#6f6b63';
      g.fillRect(104, y, 120 + rand() * 150, 9);
      g.fillStyle = rand() > 0.82 ? '#56693d' : '#6f6b63';
      g.fillRect(w - 32 - (48 + rand() * 46), y, 48 + rand() * 46, 9);
    }
  });
}

/** Squirl's acorn, drawn in one light line: the mark on the laptop's lid. */
function acornTexture() {
  return canvasTexture(256, 256, (g) => {
    g.translate(128, 132);
    g.scale(5.4, 5.4);
    g.translate(-16, -16);
    g.lineWidth = 2.6;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.strokeStyle = '#ffffff';
    g.stroke(new Path2D('M8 14c0 7 3.5 12 8 14 4.5-2 8-7 8-14'));
    g.stroke(new Path2D('M6 14c0-4 4.5-6.5 10-6.5S26 10 26 14H6z'));
    g.stroke(new Path2D('M16 7.5c0-2 1-3.5 3-4.5'));
  });
}

/** The ground is a ledger page: faint ruled lines, a stronger one every fourth, fading into the fog. */
function ruledTexture() {
  const tex = canvasTexture(256, 256, (g) => {
    g.fillStyle = '#808080';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4; i++) {
      g.fillStyle = i === 0 ? '#b4b4b4' : '#969696';
      g.fillRect(0, i * 64, 256, i === 0 ? 3 : 2);
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(50, 50);
  tex.anisotropy = 8;
  return tex;
}

/** A soft dark blot: the laptop's contact shadow on the ground. */
function shadowTexture() {
  return canvasTexture(256, 256, (g) => {
    const grad = g.createRadialGradient(128, 128, 20, 128, 128, 128);
    grad.addColorStop(0, 'rgba(0,0,0,0.75)');
    grad.addColorStop(0.55, 'rgba(0,0,0,0.38)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
  });
}

/* ---------------------------------------------------------------- the laptop and the ground */

function buildLaptop() {
  const group = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({ color: 0x3b3936, metalness: 0.78, roughness: 0.3 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, metalness: 0.2, roughness: 0.8 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xa9a9a9, metalness: 1, roughness: 0.35 });

  const base = new THREE.Mesh(new RoundedBoxGeometry(14, 0.84, 10, 4, 0.2), shell);
  base.position.y = 0.42;
  group.add(base);
  const well = new THREE.Mesh(new THREE.BoxGeometry(12, 0.04, 4.6), dark);
  well.position.set(0, 0.845, -1.9);
  group.add(well);
  // 65 keys in one draw call
  const keys = new THREE.InstancedMesh(new RoundedBoxGeometry(0.78, 0.07, 0.74, 2, 0.03), shell, 65);
  const m = new THREE.Matrix4();
  for (let r = 0; r < 5; r++) {
    for (let k = 0; k < 13; k++) {
      m.setPosition(-5.6 + k * 0.93, 0.885, -3.8 + r * 0.92);
      keys.setMatrixAt(r * 13 + k, m);
    }
  }
  group.add(keys);
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(4.6, 0.02, 2.8),
    new THREE.MeshStandardMaterial({ color: 0x47443f, metalness: 0.6, roughness: 0.38 }),
  );
  pad.position.set(0, 0.85, 2.6);
  group.add(pad);

  // the USB port on the right side: a steel lip round a dark slot
  const lip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 1.44), steel);
  lip.position.set(6.99, PORT.y, PORT.z);
  group.add(lip);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.48, 1.3), dark);
  slot.position.set(7.0, PORT.y, PORT.z);
  group.add(slot);

  // the lid, hinged at the back edge; lidAngle -0.32 is open, PI / 2 is shut
  const hinge = new THREE.Group();
  hinge.position.set(0, 0.84, -5);
  const lid = new THREE.Mesh(new RoundedBoxGeometry(14, 9.4, 0.32, 4, 0.14), shell);
  lid.position.set(0, 4.7, 0);
  hinge.add(lid);
  const bezel = new THREE.Mesh(new THREE.PlaneGeometry(13.4, 8.8), dark);
  bezel.position.set(0, 4.7, 0.165);
  hinge.add(bezel);
  // The output pass also releases tone mapping during the screen view to match the HTML paper.
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTexture(), color: 0x000000, toneMapped: false });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(12.6, 7.9), screenMat);
  screen.position.set(0, 4.75, 0.175);
  hinge.add(screen);
  // the mark on the lid's back: it glows when the lid is shut
  const markMat = new THREE.MeshBasicMaterial({ map: acornTexture(), color: new THREE.Color(2.4, 1.4, 1.0), transparent: true, opacity: 0, depthWrite: false });
  const mark = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 3.8), markMat);
  mark.position.set(0, 4.7, -0.17);
  mark.rotation.y = Math.PI;
  mark.rotation.z = Math.PI; // upright when the shut lid is seen from the front
  hinge.add(mark);
  group.add(hinge);

  return { group, hinge, screen, screenMat, markMat };
}

function buildGround() {
  const group = new THREE.Group();
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x1c1a18, map: ruledTexture(), metalness: 0.1, roughness: 0.82 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), floorMat);
  floor.rotation.x = -Math.PI / 2;
  group.add(floor);
  const blot = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 20),
    new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }),
  );
  blot.rotation.x = -Math.PI / 2;
  blot.position.set(0, 0.01, -0.5);
  group.add(blot);
  // dust hanging in the air: depth between the camera and the story
  const rand = seeded(47);
  const dustPos = new Float32Array(260 * 3);
  for (let i = 0; i < 260; i++) {
    dustPos[i * 3] = -12 + rand() * 60;
    dustPos[i * 3 + 1] = 0.4 + rand() * 12;
    dustPos[i * 3 + 2] = -10 + rand() * 30;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xffd9b8, size: 0.06, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending }));
  dust.frustumCulled = false;
  group.add(dust);
  return { group, floorMat, dust };
}

/* ---------------------------------------------------------------- the pen drive */

// Built in its own frame: the connector's tip at the origin, the body along +x.
function buildDrive() {
  const clay = new THREE.MeshPhysicalMaterial({ color: 0xa5543a, metalness: 0.15, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.25 });
  const clayDark = new THREE.MeshPhysicalMaterial({ color: 0x7e3e2a, metalness: 0.15, roughness: 0.4, clearcoat: 0.4 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xa9a9a9, metalness: 1, roughness: 0.38 });
  const board = new THREE.MeshStandardMaterial({ color: 0x1f5a35, metalness: 0.3, roughness: 0.55 });
  const chip = new THREE.MeshStandardMaterial({ color: 0x141414, metalness: 0.4, roughness: 0.5 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd8a64a, metalness: 1, roughness: 0.3 });
  const black = new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.7 });
  const ledMat = new THREE.MeshBasicMaterial({ color: 0x331a10, toneMapped: false });

  // each part: where it hangs when loose (an offset from its place), how it is turned, when it locks
  const parts = [];
  const part = (lockAt, from, rot, build) => {
    const g = new THREE.Group();
    build(g);
    parts.push({ g, from, rot, lockAt, phase: parts.length * 1.7 });
  };
  const add = (g, geometry, material, x, y, z) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    g.add(mesh);
    return mesh;
  };

  part(T.parts.board, v(0.4, -1.5, 2.6), v(1.2, 0.4, -0.8), (g) => {
    add(g, new THREE.BoxGeometry(4.6, 0.08, 1.24), board, 2.7, 0, 0);
    add(g, new THREE.BoxGeometry(1.3, 0.12, 0.9), chip, 3.0, 0.1, 0);
    add(g, new THREE.BoxGeometry(0.6, 0.1, 0.6), chip, 4.3, 0.09, 0.15);
    for (let i = 0; i < 4; i++) add(g, new THREE.BoxGeometry(0.5, 0.02, 0.14), gold, 0.55, 0.05, -0.36 + i * 0.24);
  });
  part(T.parts.connector, v(-4.2, 1.2, 2.2), v(-0.6, 2.2, 0.5), (g) => {
    add(g, new THREE.BoxGeometry(1.5, 0.45, 1.2), steel, 0.75, 0, 0);
    add(g, new THREE.BoxGeometry(1.3, 0.12, 1.0), black, 0.7, -0.06, 0);
    for (const z of [-0.28, 0.28]) add(g, new THREE.BoxGeometry(0.28, 0.02, 0.22), black, 0.55, 0.23, z);
  });
  part(T.parts.bottom, v(2.2, -1.9, -3.2), v(-1.4, 0.3, 0.9), (g) => {
    add(g, new RoundedBoxGeometry(4.4, 0.36, 1.62, 3, 0.12), clayDark, 3.7, -0.19, 0);
  });
  part(T.parts.top, v(1.4, 3.6, 2.2), v(1.6, -0.5, -1.1), (g) => {
    add(g, new RoundedBoxGeometry(4.4, 0.36, 1.62, 3, 0.12), clay, 3.7, 0.19, 0);
    add(g, new THREE.BoxGeometry(0.22, 0.04, 0.22), ledMat, 5.5, 0.38, 0);
  });
  part(T.parts.loop, v(4.6, 2.4, -2.6), v(0.4, 2.8, 1.6), (g) => {
    const ring = add(g, new THREE.TorusGeometry(0.34, 0.08, 12, 32), steel, 6.25, 0, 0);
    ring.rotation.x = Math.PI / 2;
  });

  const drive = new THREE.Group();
  parts.forEach((p) => drive.add(p.g));
  return { drive, parts, ledMat };
}

/* ---------------------------------------------------------------- statement pages and their rows */

const PAGE_W = 3.1;
const PAGE_H = 4.26;

function buildPages() {
  const rand = seeded(11);
  const banks = [['SBI', '#2a5fa8'], ['Kotak', '#c8102e'], ['SBI', '#2a5fa8'], ['Kotak', '#c8102e'], ['SBI', '#2a5fa8']];
  const geometry = new THREE.PlaneGeometry(PAGE_W, PAGE_H);
  const pages = banks.map(([bank, tint], i) => {
    const material = new THREE.MeshStandardMaterial({ map: pageTexture(bank, tint, rand), color: 0xa39f96, roughness: 0.95, metalness: 0, side: THREE.DoubleSide, transparent: true });
    const mesh = new THREE.Mesh(geometry, material);
    // loose: a fan of sheets hanging in the air, the middle one nearest
    const k = i - 2;
    const loose = v(STACK.x + 2.2 + k * 2.15, STACK.y + 0.2 + (i % 2 ? 0.55 : -0.35), STACK.z - Math.abs(k) * 1.1);
    const looseQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.12 + (i % 2 ? 0.1 : -0.06), -k * 0.3 + 0.12, k * 0.07));
    // gathered: a stack, the first page on top
    const rest = STACK.clone().add(v(0, 0, -0.07 * i).applyQuaternion(STACK_TILT));
    return { mesh, material, loose, looseQ, rest, order: i / banks.length, phase: i * 2.1 };
  });
  return pages;
}

const ROWS = 60;
const ROW_COUNTS = [26, 6, 12, 10, 6]; // spent, earned, invested, moved, lent

function buildRows() {
  const rand = seeded(29);
  // which kind each row is, shuffled so the rows that lift off the page are a mix
  const kinds = ROW_COUNTS.flatMap((n, k) => Array(n).fill(k));
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
  }
  const filled = [0, 0, 0, 0, 0];
  const colors = KINDS.map((k) => new THREE.Color(k.color));
  const rows = kinds.map((kind, i) => {
    const slot = filled[kind]++;
    const line = i % 12;
    // on the page: a ruled line of the top sheet
    const onPage = STACK.clone().add(v(0, PAGE_H / 2 - 1.2 - line * 0.23, 0.05).applyQuaternion(STACK_TILT));
    // lifted: hanging in a loose cloud
    const cloud = v(CLOUD.x + (rand() - 0.5) * 6.4, CLOUD.y + (rand() - 0.5) * 3.4, CLOUD.z + (rand() - 0.5) * 3.2);
    const cloudQ = new THREE.Quaternion().setFromEuler(new THREE.Euler((rand() - 0.5) * 1.2, (rand() - 0.5) * 1.4, (rand() - 0.5) * 0.9));
    // sorted: its place in its kind's column
    const column = v(COLUMNS.x0 + kind * COLUMNS.dx, COLUMNS.y0 + slot * COLUMNS.dy, COLUMNS.z);
    return { kind, onPage, cloud, cloudQ, column, order: i / ROWS, slot: slot / ROW_COUNTS[kind], phase: rand() * 6.28 };
  });
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0 });
  const mesh = new THREE.InstancedMesh(new RoundedBoxGeometry(0.92, 0.075, 0.36, 2, 0.03), material, ROWS);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false; // the instances move; the mesh's own bounds do not follow them
  const white = new THREE.Color(0x9a968d);
  for (let i = 0; i < ROWS; i++) mesh.setColorAt(i, white);
  return { mesh, rows, colors, white };
}

/* ---------------------------------------------------------------- the charge */

const ARCS = 9;
const ARC_POINTS = 14;
const SPARKS = 140;

/** A bolt as two crossed ribbons with fixed topology: its points are rewritten in place, never rebuilt. */
function ribbonGeometry() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ARC_POINTS * 4 * 3), 3).setUsage(THREE.DynamicDrawUsage));
  const index = [];
  for (let i = 0; i < ARC_POINTS - 1; i++) {
    for (const o of [0, 2]) {
      const a = i * 4 + o;
      const b = a + 1;
      const c = a + 4;
      const d = a + 5;
      index.push(a, b, c, b, d, c);
    }
  }
  geometry.setIndex(index);
  return geometry;
}

function buildCharge() {
  const coreMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 3.6, 4), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.7, 1.8, 3.4), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const group = new THREE.Group();
  const arcs = Array.from({ length: ARCS }, () => {
    const core = new THREE.Mesh(ribbonGeometry(), coreMat);
    const glow = new THREE.Mesh(ribbonGeometry(), glowMat);
    core.frustumCulled = glow.frustumCulled = false;
    core.visible = glow.visible = false;
    group.add(core, glow);
    return { core, glow };
  });

  const sparkGeo = new THREE.BufferGeometry();
  const sparkPos = new Float32Array(SPARKS * 3);
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3).setUsage(THREE.DynamicDrawUsage));
  const rand = seeded(5);
  const sparkVel = Array.from({ length: SPARKS }, () => v(rand() * 3 + 0.5, rand() * 3.2 - 0.6, (rand() - 0.5) * 4));
  const sparkMat = new THREE.PointsMaterial({ color: new THREE.Color(2.2, 2.8, 3.4), size: 0.09, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  sparks.frustumCulled = false;
  sparks.visible = false;
  group.add(sparks);

  // scratch vectors: a bolt is redrawn about 20 times a second, with no allocation
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const n1 = new THREE.Vector3();
  const n2 = new THREE.Vector3();
  const pt = new THREE.Vector3();

  function writeBolt(geometry, pts, width) {
    const pos = geometry.attributes.position.array;
    for (let i = 0; i < ARC_POINTS; i++) {
      const o = i * 12;
      const x = pts[i * 3];
      const y = pts[i * 3 + 1];
      const z = pts[i * 3 + 2];
      pos[o] = x + n1.x * width; pos[o + 1] = y + n1.y * width; pos[o + 2] = z + n1.z * width;
      pos[o + 3] = x - n1.x * width; pos[o + 4] = y - n1.y * width; pos[o + 5] = z - n1.z * width;
      pos[o + 6] = x + n2.x * width; pos[o + 7] = y + n2.y * width; pos[o + 8] = z + n2.z * width;
      pos[o + 9] = x - n2.x * width; pos[o + 10] = y - n2.y * width; pos[o + 11] = z - n2.z * width;
    }
    geometry.attributes.position.needsUpdate = true;
  }

  const pts = new Float32Array(ARC_POINTS * 3);
  function strike(charge) {
    arcs.forEach(({ core, glow }, i) => {
      const on = Math.random() < 0.35 + charge * 0.55;
      core.visible = glow.visible = on;
      if (!on) return;
      a.set(PORT.x + 0.05, PORT.y + (Math.random() - 0.5) * 0.6, PORT.z + (Math.random() - 0.5) * 1.4);
      if (i % 3 === 0) {
        // crawling along the drive's body
        b.set(PORT.x + 1 + Math.random() * 3.6, PORT.y + 0.4 + Math.random() * 0.3, PORT.z + (Math.random() - 0.5) * 1.6);
      } else {
        const ang = Math.random() * Math.PI * 2;
        const r = 1.6 + Math.random() * 3.8 * charge;
        b.set(PORT.x + Math.abs(Math.cos(ang)) * r * 0.8, Math.max(0.1, PORT.y + Math.sin(ang) * r * 0.7 + 0.3), PORT.z + Math.cos(ang * 1.7) * r);
      }
      dir.subVectors(b, a);
      n1.set(-dir.z, 0, dir.x);
      if (n1.lengthSq() < 0.0001) n1.set(0, 0, 1);
      n1.normalize();
      n2.crossVectors(dir, n1).normalize();
      for (let k = 0; k < ARC_POINTS; k++) {
        const t = k / (ARC_POINTS - 1);
        pt.lerpVectors(a, b, t);
        if (k > 0 && k < ARC_POINTS - 1) {
          const amp = Math.sin(Math.PI * t) * 0.9;
          pt.addScaledVector(n1, (Math.random() - 0.5) * amp).addScaledVector(n2, (Math.random() - 0.5) * amp);
        }
        pts[k * 3] = pt.x; pts[k * 3 + 1] = pt.y; pts[k * 3 + 2] = pt.z;
      }
      writeBolt(core.geometry, pts, 0.022);
      writeBolt(glow.geometry, pts, 0.085);
    });
  }

  let lastStrike = -1;
  function update(p, time, live) {
    const [c0, c1, c2, c3] = T.charge;
    const charge = p < c0 ? 0 : p < c1 ? (p - c0) / (c1 - c0) : p < c2 ? 1 : Math.max(0, 1 - (p - c2) / (c3 - c2));
    const on = live && charge > 0.02;
    if (on) {
      if (time - lastStrike > 0.05 || time < lastStrike) {
        lastStrike = time;
        strike(charge);
      }
    } else {
      for (const arc of arcs) arc.core.visible = arc.glow.visible = false;
    }
    coreMat.opacity = on ? charge : 0;
    glowMat.opacity = on ? 0.3 * charge : 0;

    const burst = span(p, T.sparks);
    sparks.visible = live && burst > 0 && burst < 1;
    if (sparks.visible) {
      for (let i = 0; i < SPARKS; i++) {
        const life = (burst * 3.1 + (i % 7) * 0.13) % 1;
        const s = sparkVel[i];
        sparkPos[i * 3] = PORT.x + 0.1 + s.x * life;
        sparkPos[i * 3 + 1] = Math.max(0.03, PORT.y + s.y * life - 4.5 * life * life);
        sparkPos[i * 3 + 2] = PORT.z + s.z * life;
      }
      sparkGeo.attributes.position.needsUpdate = true;
      sparkMat.opacity = Math.sin(Math.PI * burst);
    }
    return on ? charge : 0;
  }

  return { group, update };
}

/* ---------------------------------------------------------------- the camera's path and the mood */

/*
 * The ledger of views: where the camera stands and what it looks at, beat by beat. Between keys the
 * path is a Catmull-Rom curve through the positions, so the camera sweeps instead of stopping at
 * each key; a key marked `hold` is met on a straight line (no overshoot next to the screen).
 */
function buildRig(screenCentre) {
  const face = { pos: new THREE.Vector3(), look: screenCentre, hold: true }; // filled on resize: square to the screen
  const keys = [
    { p: 0, pos: v(20.5, 7.0, 28.0), look: v(24.8, 3.9, 4.8) },
    { p: at('imports', 0.5), pos: v(23.5, 6.4, 26.5), look: v(24.6, 4.0, 4.8) },
    { p: at('sorting', 0.5), pos: v(28.5, 5.4, 25.0), look: v(26.8, 3.1, 4.6) },
    { p: at('sorting', 0.78), pos: v(28.5, 5.4, 25.0), look: v(26.8, 3.1, 4.6), hold: true }, // keep all five columns in view until sorted
    { p: at('machine', 0.3), pos: v(38.5, 6.0, 21.5), look: v(33.6, 2.9, 4.6) },
    { p: at('machine', 0.72), pos: v(37.0, 6.4, 23.0), look: v(33.2, 3.0, 4.6) }, // on the finished drive until it leaves
    { p: at('machine', 0.97), pos: v(29.0, 8.6, 27.0), look: v(20.5, 3.4, 3.6) }, // following it in flight
    { p: at('plug', 0.2), pos: v(20.0, 7.2, 20.5), look: v(8.8, 0.8, 2.2) },
    { p: at('plug', 0.55), pos: v(16.8, 4.4, 14.5), look: v(8.2, 0.7, 2.2) },
    { p: at('private', 0.55), pos: v(17.5, 11.5, 27.0), look: v(1.0, 3.0, -1.0) },
    { p: T.zoom[0], pos: v(14.0, 10.0, 26.0), look: v(0.5, 3.6, -2.0) },
    { p: T.zoom[1], ...face },
    { p: T.unzoom[0], ...face },
    { p: T.unzoom[1], pos: v(12.5, 9.5, 23.0), look: v(1.0, 2.6, -1.0) },
    { p: T.lid[1], pos: v(13.5, 13.0, 21.5), look: v(0.6, 0.5, 0.4) },
    { p: 1, pos: v(10.0, 17.5, 21.0), look: v(-0.4, 0.4, 0.6) },
  ];

  const posCurve = new THREE.CatmullRomCurve3(keys.map((k) => k.pos), false, 'centripetal');
  const lookCurve = new THREE.CatmullRomCurve3(keys.map((k) => k.look), false, 'centripetal');
  const last = keys.length - 1;

  function view(p, pos, look) {
    let i = 0;
    while (i < last - 1 && p > keys[i + 1].p) i++;
    const k0 = keys[i];
    const k1 = keys[i + 1];
    const raw = clamp01((p - k0.p) / Math.max(1e-6, k1.p - k0.p));
    if (k0.hold || k1.hold) {
      const t = ease(raw);
      pos.lerpVectors(k0.pos, k1.pos, t);
      look.lerpVectors(k0.look, k1.look, t);
      return;
    }
    // half eased: the camera slows through each key without ever standing still
    const t = lerp(raw, ease(raw), 0.5);
    posCurve.getPoint((i + t) / last, pos);
    lookCurve.getPoint((i + t) / last, look);
  }
  return { view, face };
}

// The air's colour, beat by beat: the ground, the fog and the canvas share it.
const MOODS = [
  [0, '#16130f'],
  [at('imports', 0.4), '#10141a'],
  [at('sorting', 0.5), '#1a140d'],
  [at('machine', 0.5), '#151311'],
  [at('plug', 0.4), '#090a0f'],
  [at('private', 0.6), '#14120f'],
  [T.unzoom[1], '#14120f'],
  [1, '#1b140e'],
].map(([p, hex]) => [p, new THREE.Color(hex)]);

function moodAt(p, out) {
  let i = 0;
  while (i < MOODS.length - 2 && p > MOODS[i + 1][0]) i++;
  const [p0, c0] = MOODS[i];
  const [p1, c1] = MOODS[i + 1];
  return out.lerpColors(c0, c1, ease((p - p0) / (p1 - p0)));
}

/* ---------------------------------------------------------------- the component */

export function JourneyScene({ progress, className }) {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch {
      host.dataset.noGl = '';
      return undefined;
    }
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.append(renderer.domElement);

    const scene = new THREE.Scene();
    const mood = new THREE.Color('#16130f');
    scene.background = mood;
    scene.fog = new THREE.Fog(mood, 34, 120);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const envTarget = pmrem.fromScene(room, 0.04);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = 0.55;

    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 400);
    const camPos = new THREE.Vector3();
    const camLook = new THREE.Vector3();

    scene.add(new THREE.AmbientLight(0xfff4ea, 0.22));
    const key = new THREE.DirectionalLight(0xfff1e2, 1.6);
    key.position.set(10, 14, 12);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xe09a7f, 1.2);
    rim.position.set(-8, 6, -10);
    scene.add(rim);
    const zap = new THREE.PointLight(0x9fd4ff, 0, 18, 1.6);
    zap.position.copy(PORT).add(v(0.6, 0.4, 0));
    scene.add(zap);
    const screenGlow = new THREE.PointLight(0xfff3e0, 0, 20, 2);
    screenGlow.position.set(0, 5, -2);
    scene.add(screenGlow);
    const driveGlow = new THREE.PointLight(0xff9a6a, 0, 9, 1.8);
    driveGlow.position.set(PLUGGED.x + 5.5, PLUGGED.y + 0.8, PLUGGED.z);
    scene.add(driveGlow);

    const ground = buildGround();
    scene.add(ground.group);
    const laptop = buildLaptop();
    scene.add(laptop.group);
    const { drive, parts, ledMat } = buildDrive();
    scene.add(drive);
    const pages = buildPages();
    pages.forEach((page) => scene.add(page.mesh));
    const rowSet = buildRows();
    scene.add(rowSet.mesh);
    const charge = buildCharge();
    scene.add(charge.group);

    // the view square to the screen stands on the screen's centre line (the lid is open here)
    laptop.hinge.rotation.x = -0.32;
    scene.updateMatrixWorld(true);
    const screenCentre = laptop.screen.getWorldPosition(new THREE.Vector3());
    const screenNormal = laptop.screen.getWorldDirection(new THREE.Vector3());
    const rig = buildRig(screenCentre);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.6, 0.5, 1.0);
    composer.addPass(bloom);
    const output = new OutputPass();
    output.uniforms.screenView = { value: 0 };
    output.material.fragmentShader = output.material.fragmentShader
      .replace('uniform sampler2D tDiffuse;', 'uniform sampler2D tDiffuse;\nuniform float screenView;')
      .replace('ACESFilmicToneMapping( gl_FragColor.rgb )', 'mix( ACESFilmicToneMapping( gl_FragColor.rgb ), gl_FragColor.rgb, screenView )');
    composer.addPass(output);

    // how far the picture is shifted to leave room for the words: right on wide screens, up on narrow ones
    let shiftX = 0;
    let shiftY = 0;
    let pull = 1; // narrow screens stand further back, so the story's width still fits
    let lastShiftX = null;
    let lastShiftY = null;
    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      const narrow = w < 900;
      const ratio = Math.min(window.devicePixelRatio || 1, narrow ? 1.5 : 2);
      renderer.setPixelRatio(ratio);
      renderer.setSize(w, h, false);
      composer.setPixelRatio(ratio);
      composer.setSize(w, h);
      if (narrow) bloom.setSize((w * ratio) / 2, (h * ratio) / 2); // phones: the glow at half resolution
      camera.aspect = w / h;
      camera.fov = w / h < 0.8 ? 46 : 32;
      shiftX = narrow ? 0 : 0.17;
      shiftY = narrow ? 0.15 : 0;
      pull = w / h < 0.8 ? 1.3 : narrow ? 1.12 : 1;
      lastShiftX = lastShiftY = null;
      camera.updateProjectionMatrix();
      // the screen is 12.6 x 7.9: stand where 78% of it fills the view, whichever side binds
      const fit = Math.min(7.9, 12.6 / camera.aspect) * 0.78;
      const dist = fit / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
      rig.face.pos.copy(screenCentre).addScaledVector(screenNormal, dist);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    let visible = false;
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { rootMargin: '100px' });
    io.observe(host);

    const q = new THREE.Quaternion();
    const identity = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const pos = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    const clock = new THREE.Clock();
    let raf = 0;
    let disposed = false;
    const heroWindow = [0.01, at('imports', 0.1)];

    const frame = () => {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      const time = clock.getElapsedTime();
      const p = clamp01(progress.current ?? 0);
      // The opaque HTML paper covers all time-driven motion here.
      if (p >= T.paper[1] && p <= T.paperOut[0]) return;

      /* ---- statement pages: adrift, then gathered into a stack, then gone */
      for (const page of pages) {
        const gather = ease(span(p, T.pagesGather) * 1.5 - page.order * 0.5);
        const leave = ease(span(p, T.pagesLeave) * 1.4 - (1 - page.order) * 0.4);
        const loose = 1 - gather;
        page.mesh.visible = leave < 1;
        if (!page.mesh.visible) continue;
        page.mesh.position.lerpVectors(page.loose, page.rest, gather);
        page.mesh.position.y += Math.sin(time * 0.55 + page.phase) * 0.22 * loose - leave * 2.4;
        page.mesh.position.z -= leave * 3;
        euler.set(Math.sin(time * 0.4 + page.phase) * 0.1 * loose, Math.cos(time * 0.33 + page.phase) * 0.14 * loose, 0);
        q.setFromEuler(euler);
        page.mesh.quaternion.slerpQuaternions(page.looseQ, STACK_TILT, gather).multiply(q);
        page.material.opacity = 1 - leave;
      }

      /* ---- rows: off the page, into a cloud, into five columns, onto the drive's board */
      const liftSpan = T.rowsLift[1] - T.rowsLift[0];
      const sortSpan = T.rowsSort[1] - T.rowsSort[0];
      const storeSpan = T.rowsStore[1] - T.rowsStore[0];
      let anyRow = false;
      for (let i = 0; i < ROWS; i++) {
        const row = rowSet.rows[i];
        // each row has its own moment inside each window, so they go one after another
        const lift = easeOut((p - T.rowsLift[0] - row.order * liftSpan * 0.72) / (liftSpan * 0.28));
        const sort = ease((p - T.rowsSort[0] - (row.slot * 0.5 + row.order * 0.2) * sortSpan) / (sortSpan * 0.3));
        const store = ease((p - T.rowsStore[0] - (row.kind / 5) * storeSpan * 0.55 - (1 - row.slot) * storeSpan * 0.15) / (storeSpan * 0.3));
        const shown = lift > 0 && store < 1;
        if (!shown) {
          matrix.makeScale(0, 0, 0);
          rowSet.mesh.setMatrixAt(i, matrix);
          continue;
        }
        anyRow = true;
        const adrift = 1 - sort;
        pos.lerpVectors(row.onPage, row.cloud, lift);
        pos.y += Math.sin(time * 0.7 + row.phase) * 0.16 * lift * adrift;
        pos.x += Math.cos(time * 0.5 + row.phase) * 0.12 * lift * adrift;
        pos.lerp(row.column, sort);
        pos.lerp(STORE, store);
        q.slerpQuaternions(STACK_TILT, row.cloudQ, lift).slerp(identity, sort);
        if (store > 0) q.slerp(DRIVE_TILT, store);
        const size = lerp(0.55, 1, lift) * lerp(1, 0.1, store);
        scale.set(size * lerp(2.4, 1, lift), size, size);
        matrix.compose(pos, q, scale);
        rowSet.mesh.setMatrixAt(i, matrix);
        color.lerpColors(rowSet.white, rowSet.colors[row.kind], ease(sort * 1.6));
        rowSet.mesh.setColorAt(i, color);
      }
      rowSet.mesh.visible = anyRow;
      if (anyRow) {
        rowSet.mesh.instanceMatrix.needsUpdate = true;
        rowSet.mesh.instanceColor.needsUpdate = true;
      }

      /* ---- the drive: parts hang apart, then lock one by one */
      for (const part of parts) {
        // a part swells into being a little before it locks, so the early chapters stay uncluttered
        const appear = easeOut((p - part.lockAt + T.partDur * 1.1) / (T.partDur * 0.6));
        part.g.visible = appear > 0;
        if (!part.g.visible) continue;
        part.g.scale.setScalar(appear);
        const t = easeOut((p - part.lockAt) / T.partDur);
        const loose = 1 - t;
        part.g.position.copy(part.from).multiplyScalar(loose);
        part.g.position.y += Math.sin(time * 0.8 + part.phase) * 0.18 * loose;
        euler.set(part.rot.x * loose * 2.2 + Math.sin(time * 0.5 + part.phase) * 0.12 * loose, part.rot.y * loose * 2.2, part.rot.z * loose * 2.2);
        part.g.quaternion.setFromEuler(euler);
      }

      /* ---- the drive travels to the port and slides in */
      const travel = ease(span(p, T.travel));
      const insert = ease(span(p, T.insert));
      if (p < T.insert[0]) drive.position.lerpVectors(BUILD, READY, travel);
      else drive.position.lerpVectors(READY, PLUGGED, insert);
      drive.position.y += Math.sin(Math.PI * travel) * 2.6; // an arc on the way; sin(pi) is 0 on arrival
      euler.set(0, Math.sin(time * 0.6) * 0.05 * (1 - travel), 0);
      q.setFromEuler(euler).premultiply(DRIVE_TILT);
      drive.quaternion.slerpQuaternions(q, identity, travel);

      /* ---- charge */
      const live = charge.update(p, time, true);
      zap.intensity = live ? live * (4 + Math.random() * 9) : 0;

      /* ---- the screen wakes; later the lid shuts and the mark glows */
      const lit = ease(span(p, T.led));
      const wake = ease(span(p, T.wake));
      const zoomIn = ease(span(p, T.zoom));
      const zoomOut = ease(span(p, T.unzoom));
      const inScreen = zoomIn * (1 - zoomOut); // 1 while the camera is square to the screen
      const lid = ease(span(p, T.lid));
      const outro = ease(span(p, T.outro));
      const pulse = 0.5 + 0.5 * Math.sin(time * 2.2);

      laptop.hinge.rotation.x = lerp(-0.32, Math.PI / 2, lid);
      laptop.screenMat.color.setScalar(wake * lerp(0.84, 1, inScreen) * (1 - lid));
      screenGlow.intensity = wake * 2.5 * (1 - inScreen) * (1 - lid);
      laptop.markMat.opacity = outro * (0.75 + 0.25 * pulse);
      const glow = lit * (1 - outro) + outro * (0.55 + 0.45 * pulse);
      ledMat.color.setRGB(lerp(0.2, 3.2, glow), lerp(0.1, 1.5, glow), lerp(0.06, 0.7, glow));
      driveGlow.intensity = outro * (3 + 3 * pulse);
      bloom.strength = 0.6 * (1 - inScreen);
      output.uniforms.screenView.value = inScreen;

      /* ---- the air */
      moodAt(p, mood);
      ground.floorMat.color.copy(mood).multiplyScalar(3.2);
      ground.dust.position.y = Math.sin(time * 0.13) * 0.5;
      ground.dust.position.x = Math.cos(time * 0.09) * 0.6;

      /* ---- the camera */
      const hero = 1 - ease(span(p, heroWindow)); // the hero's words are wider: the picture stands further right
      const sx = shiftX * (1 + 0.8 * hero) * (1 - inScreen);
      const sy = shiftY * (1 - inScreen);
      const roundedX = Math.round(sx * 10000);
      const roundedY = Math.round(sy * 10000);
      if (roundedX !== lastShiftX || roundedY !== lastShiftY) {
        lastShiftX = roundedX;
        lastShiftY = roundedY;
        const w = host.clientWidth;
        const h = host.clientHeight;
        if ((sx || sy) && w && h) camera.setViewOffset(w, h, -w * sx, h * sy, w, h);
        else camera.clearViewOffset();
      }
      rig.view(p, camPos, camLook);
      if (pull !== 1) camPos.sub(camLook).multiplyScalar(lerp(pull, 1, inScreen)).add(camLook);
      if (live) camPos.x += (Math.random() - 0.5) * 0.06 * live;
      camera.position.copy(camPos);
      camera.lookAt(camLook);

      composer.render();
    };
    frame();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      const seen = new Set();
      const drop = (thing) => {
        if (thing && !seen.has(thing)) {
          seen.add(thing);
          thing.dispose?.();
        }
      };
      scene.traverse((o) => {
        drop(o.geometry);
        for (const material of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) {
          drop(material.map);
          drop(material);
        }
        if (o.isInstancedMesh) o.dispose();
      });
      room.traverse?.((o) => { drop(o.geometry); drop(o.material); });
      envTarget.dispose();
      pmrem.dispose();
      bloom.dispose();
      bloom.materialHighPassFilter.dispose(); // three.js 0.170 omits this from the pass's dispose()
      output.dispose();
      composer.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [progress]);

  return <div ref={hostRef} className={className} aria-hidden="true" />;
}

export default JourneyScene;
