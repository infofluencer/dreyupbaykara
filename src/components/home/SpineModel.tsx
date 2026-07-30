"use client";

import { useEffect, useMemo, useRef } from "react";
import { Center, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Box3, Color, DoubleSide, MathUtils, Vector3 } from "three";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import type {
  Group,
  Material,
  Mesh,
  MeshStandardMaterial,
  Object3D,
} from "three";

const SPINE_GLB = "/hero/spine-hernia.glb?v=13";
const HERNIA_DISC_NAME = "HerniaDisc_L4L5";

const MODEL_SCALE = 3.25;
/** Ortada, biraz aşağı — etiket yazıları kameraya bakacak */
const MODEL_X = 0;
const MODEL_Y = -0.65;
const MODEL_ROT_Y = Math.PI * 0.58;
const MODEL_ROT_X = 0.03;

useGLTF.preload(SPINE_GLB, undefined, undefined, (loader) => {
  loader.setMeshoptDecoder(MeshoptDecoder);
});

function isMesh(obj: Object3D): obj is Mesh {
  return (obj as Mesh).isMesh;
}

function isStandardMaterial(mat: Material): mat is MeshStandardMaterial {
  return (mat as MeshStandardMaterial).isMeshStandardMaterial === true;
}

function tuneMaterial(material: Material | Material[]): void {
  const materials = Array.isArray(material) ? material : [material];
  for (const mat of materials) {
    if ("transparent" in mat && mat.transparent) {
      mat.depthWrite = false;
      mat.side = DoubleSide;
    }
    mat.needsUpdate = true;
  }
}

function findHerniaDisc(root: Object3D): Mesh | null {
  let found: Mesh | null = null;
  root.traverse((obj) => {
    if (!isMesh(obj)) return;
    if (
      obj.name === HERNIA_DISC_NAME ||
      obj.name.startsWith(`${HERNIA_DISC_NAME}_`) ||
      obj.name.startsWith(`${HERNIA_DISC_NAME}.`)
    ) {
      found = obj;
    }
  });
  return found;
}

export default function SpineModel({
  progressRef,
  herniaWorldPosRef,
  herniaReadyRef,
}: {
  progressRef: React.MutableRefObject<number>;
  herniaWorldPosRef: React.MutableRefObject<Vector3>;
  herniaReadyRef: React.MutableRefObject<boolean>;
}) {
  const group = useRef<Group>(null);
  const herniaRef = useRef<Mesh | null>(null);
  const herniaMatRef = useRef<MeshStandardMaterial | null>(null);
  const basePos = useRef(new Vector3());
  const baseScale = useRef(new Vector3(1, 1, 1));
  const discBaseColor = useRef(new Color("#c9b7a3"));
  const herniaColor = useMemo(() => new Color("#ff2d20"), []);

  const { scene } = useGLTF(SPINE_GLB, undefined, undefined, (loader) => {
    loader.setMeshoptDecoder(MeshoptDecoder);
  });

  const prepared = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    herniaRef.current = null;
    herniaMatRef.current = null;
    herniaReadyRef.current = false;

    prepared.traverse((obj) => {
      if (!isMesh(obj)) return;
      obj.visible = true;
      if (obj.material) tuneMaterial(obj.material);
    });

    const disc = findHerniaDisc(prepared);
    if (!disc) {
      console.warn(`❌ ${HERNIA_DISC_NAME} modelde yok`);
      return;
    }

    const source = Array.isArray(disc.material)
      ? disc.material[0]
      : disc.material;
    if (source && isStandardMaterial(source)) {
      const cloned = source.clone();
      cloned.transparent = true;
      disc.material = cloned;
      herniaMatRef.current = cloned;
      discBaseColor.current.copy(cloned.color);
    }

    herniaRef.current = disc;
    basePos.current.copy(disc.position);
    baseScale.current.copy(disc.scale);
    herniaReadyRef.current = true;
  }, [prepared, herniaReadyRef]);

  const modelScale = useMemo(() => {
    const box = new Box3();
    const tmp = new Box3();
    let has = false;
    prepared.traverse((obj) => {
      if (!isMesh(obj) || !obj.visible) return;
      const tag = obj.name.toLowerCase();
      const matName =
        (!Array.isArray(obj.material) ? obj.material?.name : obj.material[0]?.name) ??
        "";
      const mat = matName.toLowerCase();
      if (
        tag.includes("text") ||
        tag.includes("label") ||
        mat.includes("label") ||
        mat.includes("marker") ||
        tag.startsWith("cylinder") ||
        tag.includes("herniadisc")
      ) {
        return;
      }
      tmp.setFromObject(obj);
      if (!has) {
        box.copy(tmp);
        has = true;
      } else {
        box.union(tmp);
      }
    });
    if (!has) box.setFromObject(prepared);
    const size = box.getSize(new Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (!Number.isFinite(maxDim) || maxDim <= 0) return 1.6;
    return MODEL_SCALE / maxDim;
  }, [prepared]);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;

    // Sabit default duruş
    g.position.set(MODEL_X, MODEL_Y, 0);
    g.rotation.set(MODEL_ROT_X, MODEL_ROT_Y, 0);

    const disc = herniaRef.current;
    const mat = herniaMatRef.current;
    if (!disc || !mat) return;

    const p = MathUtils.clamp(progressRef.current, 0, 1);
    // Scroll → fıtık kaybolur
    const hernia = 1 - p;
    const pulse = 0.35 + Math.sin(clock.elapsedTime * 2.8) * 0.1;

    disc.position.set(
      basePos.current.x,
      basePos.current.y,
      basePos.current.z - hernia * 0.006,
    );

    const sx = baseScale.current.x;
    const sy = baseScale.current.y;
    const sz = baseScale.current.z;
    const s = MathUtils.lerp(0.01, 1, hernia);
    disc.scale.set(sx * s, sy * s, sz * s * MathUtils.lerp(1, 1.15, hernia));

    mat.color.copy(discBaseColor.current).lerp(herniaColor, hernia);
    mat.emissive.copy(herniaColor);
    mat.emissiveIntensity = hernia * pulse;
    mat.opacity = MathUtils.lerp(0, 1, hernia);
    mat.transparent = true;
    mat.depthWrite = hernia > 0.35;
    mat.needsUpdate = true;
    disc.visible = hernia > 0.02;

    disc.getWorldPosition(herniaWorldPosRef.current);
    herniaReadyRef.current = true;
  });

  return (
    <group ref={group}>
      <Center>
        <primitive object={prepared} scale={modelScale} />
      </Center>
    </group>
  );
}
