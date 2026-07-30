/**
 * Inject HerniaDisc_L4L5 into spine-hernia.glb WITHOUT Blender re-export.
 * Preserves RootNode hierarchy, labels, and original bbox.
 *
 * Usage: node scripts/inject_hernia_disc.mjs
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import { writeFileSync, copyFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "public/hero/spine-hernia.backup.glb");
const DST = join(ROOT, "public/hero/spine-hernia.glb");

const DISC_NAME = "HerniaDisc_L4L5";
const MARKER_NAME = "Cylinder049";

function buildIcoSphere(radius, subdivisions = 2) {
  // Start from unit icosahedron, subdivide, scale
  const t = (1 + Math.sqrt(5)) / 2;
  let verts = [
    [-1, t, 0],
    [1, t, 0],
    [-1, -t, 0],
    [1, -t, 0],
    [0, -1, t],
    [0, 1, t],
    [0, -1, -t],
    [0, 1, -t],
    [t, 0, -1],
    [t, 0, 1],
    [-t, 0, -1],
    [-t, 0, 1],
  ].map((v) => {
    const len = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / len, v[1] / len, v[2] / len];
  });

  let faces = [
    [0, 11, 5],
    [0, 5, 1],
    [0, 1, 7],
    [0, 7, 10],
    [0, 10, 11],
    [1, 5, 9],
    [5, 11, 4],
    [11, 10, 2],
    [10, 7, 6],
    [7, 1, 8],
    [3, 9, 4],
    [3, 4, 2],
    [3, 2, 6],
    [3, 6, 8],
    [3, 8, 9],
    [4, 9, 5],
    [2, 4, 11],
    [6, 2, 10],
    [8, 6, 7],
    [9, 8, 1],
  ];

  const midCache = new Map();
  const mid = (a, b) => {
    const key = a < b ? `${a}_${b}` : `${b}_${a}`;
    if (midCache.has(key)) return midCache.get(key);
    const va = verts[a];
    const vb = verts[b];
    const m = [va[0] + vb[0], va[1] + vb[1], va[2] + vb[2]];
    const len = Math.hypot(m[0], m[1], m[2]);
    const idx = verts.length;
    verts.push([m[0] / len, m[1] / len, m[2] / len]);
    midCache.set(key, idx);
    return idx;
  };

  for (let s = 0; s < subdivisions; s++) {
    const next = [];
    for (const [a, b, c] of faces) {
      const ab = mid(a, b);
      const bc = mid(b, c);
      const ca = mid(c, a);
      next.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    faces = next;
    midCache.clear();
  }

  // Disk arkasından fışkıran çekirdek
  // Posterior view'da sola-sağa = X ekseni
  const positions = new Float32Array(verts.length * 3);
  const normals = new Float32Array(verts.length * 3);
  for (let i = 0; i < verts.length; i++) {
    let [x, y, z] = verts[i];
    // -Z = arka yüz; X = bu açıdan yatay (sola/sağa)
    if (z < 0) z *= 1.7;
    else z *= 0.45;
    x *= 1.25; // yatay hacim
    y *= 0.7;
    const len = Math.hypot(x, y, z) || 1;
    const nx = x / len;
    const ny = y / len;
    const nz = z / len;
    positions[i * 3] = nx * radius;
    positions[i * 3 + 1] = ny * radius;
    positions[i * 3 + 2] = nz * radius;
    normals[i * 3] = nx;
    normals[i * 3 + 1] = ny;
    normals[i * 3 + 2] = nz;
  }

  const indices = new Uint16Array(faces.length * 3);
  let w = 0;
  for (const [a, b, c] of faces) {
    indices[w++] = a;
    indices[w++] = b;
    indices[w++] = c;
  }

  return { positions, normals, indices };
}

async function main() {
  if (!existsSync(SRC)) {
    console.error("Missing backup:", SRC);
    process.exit(1);
  }

  // Ensure encoder ready
  await MeshoptEncoder.ready;

  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      "meshopt.decoder": MeshoptDecoder,
      "meshopt.encoder": MeshoptEncoder,
    });

  const doc = await io.read(SRC);
  const root = doc.getRoot();

  // Remove previous injected disc if any
  for (const node of [...root.listNodes()]) {
    if (node.getName() === DISC_NAME || node.getName().startsWith(DISC_NAME)) {
      const mesh = node.getMesh();
      node.setMesh(null);
      node.detach();
      if (mesh) {
        for (const prim of mesh.listPrimitives()) prim.detach();
        mesh.detach();
      }
    }
  }

  let markerA = null; // Cylinder049 — L4 tarafı
  let markerB = null; // Cylinder050 — L5 tarafı
  for (const node of root.listNodes()) {
    if (node.getName() === "Cylinder049") markerA = node;
    if (node.getName() === "Cylinder050") markerB = node;
  }
  if (!markerA || !markerB) {
    console.error("L4-L5 markers not found (Cylinder049 / Cylinder050)");
    process.exit(1);
  }

  const [ax, ay, az] = markerA.getTranslation();
  const [bx, by, bz] = markerB.getTranslation();

  // L4-L5 gri disk ortası, arkaya
  const tx = (ax + bx) / 2;
  const ty = (ay + by) / 2;
  const tz = (az + bz) / 2 - 0.012;

  const { positions, normals, indices } = buildIcoSphere(0.008, 2);

  const posAcc = doc
    .createAccessor("hernia_pos")
    .setType("VEC3")
    .setArray(positions);
  const normAcc = doc
    .createAccessor("hernia_norm")
    .setType("VEC3")
    .setArray(normals);
  const idxAcc = doc
    .createAccessor("hernia_idx")
    .setType("SCALAR")
    .setArray(indices);

  const mat = doc
    .createMaterial("HerniaDisc_L4L5_mat")
    .setBaseColorFactor([0.62, 0.62, 0.6, 1]) // gri disk tonu
    .setMetallicFactor(0)
    .setRoughnessFactor(0.65);

  const prim = doc
    .createPrimitive()
    .setAttribute("POSITION", posAcc)
    .setAttribute("NORMAL", normAcc)
    .setIndices(idxAcc)
    .setMaterial(mat);

  const mesh = doc.createMesh(DISC_NAME).addPrimitive(prim);
  const node = doc
    .createNode(DISC_NAME)
    .setMesh(mesh)
    .setTranslation([tx, ty, tz])
    // X: posterior view'da sola doğru yayıl; Z: arkaya taşma; Y: disk yüksekliği
    .setScale([2.35, 0.75, 1.35]);

  // Parent under RootNode (same as markers)
  let parent = null;
  for (const n of root.listNodes()) {
    if (n.listChildren().includes(markerA)) parent = n;
  }
  if (parent) {
    parent.addChild(node);
  } else {
    const scene = root.listScenes()[0];
    scene.addChild(node);
  }

  await io.write(DST, doc);
  console.log("Wrote", DST);
  console.log("HerniaDisc (between L4-L5 discs) at", [tx, ty, tz]);
  console.log("Markers", markerA.getName(), [ax, ay, az], markerB.getName(), [bx, by, bz]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
