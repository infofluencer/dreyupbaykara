"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { MathUtils, Vector3, type PerspectiveCamera } from "three";
import SpineModel from "./SpineModel";

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

const CAMERA_X_START = 0;
const Z_START = 5.4;
const LOOK_Y_START = -0.55;

function Rig({
  progressRef,
  herniaWorldPosRef,
  herniaReadyRef,
}: {
  progressRef: React.MutableRefObject<number>;
  herniaWorldPosRef: React.MutableRefObject<Vector3>;
  herniaReadyRef: React.MutableRefObject<boolean>;
}) {
  const { camera } = useThree();
  const easedRef = useRef(0);
  const startPos = useRef(new Vector3(CAMERA_X_START, LOOK_Y_START, Z_START));
  const endPos = useRef(new Vector3());
  const lookTarget = useRef(new Vector3());

  useFrame((_, delta) => {
    const cam = camera as PerspectiveCamera;
    const targetE = easeInOut(clamp01(progressRef.current));
    const lerpFactor = 1 - Math.exp(-10 * delta);
    easedRef.current += (targetE - easedRef.current) * lerpFactor;
    const e = easedRef.current;

    if (herniaReadyRef.current) {
      const wp = herniaWorldPosRef.current;
      endPos.current.set(wp.x + 0.95, wp.y + 0.08, wp.z + 1.45);
      cam.position.lerpVectors(startPos.current, endPos.current, e);
      lookTarget.current.set(
        MathUtils.lerp(0, wp.x, e),
        MathUtils.lerp(LOOK_Y_START, wp.y, e),
        MathUtils.lerp(0, wp.z, e),
      );
      cam.lookAt(lookTarget.current);
    } else {
      cam.position.set(CAMERA_X_START, LOOK_Y_START, Z_START);
      cam.lookAt(0, LOOK_Y_START, 0);
    }

    cam.fov = MathUtils.lerp(42, 30, e);
    cam.updateProjectionMatrix();
  });

  return null;
}

export default function SpineScene({
  progressRef,
}: {
  progressRef: React.MutableRefObject<number>;
}) {
  const herniaWorldPosRef = useRef(new Vector3());
  const herniaReadyRef = useRef(false);

  return (
    <div
      className="relative isolate h-full w-full select-none"
      aria-label="3D omurga modeli"
    >
      <Canvas
        className="h-full w-full"
        style={{ width: "100%", height: "100%" }}
        camera={{
          position: [CAMERA_X_START, 0, Z_START],
          fov: 42,
          near: 0.05,
          far: 100,
        }}
        dpr={[1, 1.5]}
        frameloop="always"
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          preserveDrawingBuffer: false,
        }}
      >
        <ambientLight intensity={0.85} />
        <directionalLight position={[3, 4, 5]} intensity={1.45} color="#ffffff" />
        <directionalLight position={[-2.5, 2, -2]} intensity={0.45} color="#fff5eb" />
        <hemisphereLight args={["#f0f4ff", "#e8e0d8", 0.35]} />
        <Suspense fallback={null}>
          <SpineModel
            progressRef={progressRef}
            herniaWorldPosRef={herniaWorldPosRef}
            herniaReadyRef={herniaReadyRef}
          />
        </Suspense>
        <Rig
          progressRef={progressRef}
          herniaWorldPosRef={herniaWorldPosRef}
          herniaReadyRef={herniaReadyRef}
        />
      </Canvas>
    </div>
  );
}
