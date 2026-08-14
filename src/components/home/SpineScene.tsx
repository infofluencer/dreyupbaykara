"use client";

import {
  Component,
  Suspense,
  use,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { MathUtils, Vector3, type PerspectiveCamera } from "three";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
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

class SpineErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean; generation: number }
> {
  state = { failed: false, generation: 0 };
  retryTimer = 0;

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    if (this.state.generation >= 1) return;
    this.retryTimer = window.setTimeout(() => {
      this.setState((s) => ({ failed: false, generation: s.generation + 1 }));
    }, 600);
  }

  componentWillUnmount() {
    window.clearTimeout(this.retryTimer);
  }

  render() {
    if (this.state.failed) return null;
    return (
      <div className="h-full w-full" key={this.state.generation}>
        {this.props.children}
      </div>
    );
  }
}

function WaitForMeshopt({ children }: { children: ReactNode }) {
  const ready =
    MeshoptDecoder.supported && MeshoptDecoder.ready
      ? MeshoptDecoder.ready
      : Promise.reject(new Error("MeshoptDecoder unavailable"));
  use(ready);
  return children;
}

function usePreferLowPower() {
  const [lowPower] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 1023px)").matches
      : true,
  );
  return lowPower;
}

function useSceneActive() {
  const [active, setActive] = useState(true);

  useEffect(() => {
    const home = document.getElementById("home");
    let inView = true;
    let pageVisible = document.visibilityState === "visible";
    const sync = () => setActive(inView && pageVisible);

    const io = home
      ? new IntersectionObserver(
          ([entry]) => {
            inView = entry.isIntersecting;
            sync();
          },
          { threshold: 0.02 },
        )
      : null;
    if (home && io) io.observe(home);

    const onVis = () => {
      pageVisible = document.visibilityState === "visible";
      sync();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return active;
}

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
  const lowPower = usePreferLowPower();
  const active = useSceneActive();

  return (
    <div
      className="relative isolate h-full w-full select-none"
      aria-label="3D omurga modeli"
    >
      <SpineErrorBoundary>
        <Canvas
          className="h-full w-full"
          style={{ width: "100%", height: "100%" }}
          camera={{
            position: [CAMERA_X_START, LOOK_Y_START, Z_START],
            fov: 42,
            near: 0.05,
            far: 100,
          }}
          dpr={lowPower ? 1 : [1, 1.5]}
          frameloop={active ? "always" : "never"}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener(
              "webglcontextlost",
              (event) => event.preventDefault(),
              false,
            );
          }}
          gl={{
            antialias: !lowPower,
            alpha: true,
            stencil: false,
            powerPreference: lowPower ? "default" : "high-performance",
            failIfMajorPerformanceCaveat: false,
            preserveDrawingBuffer: false,
          }}
        >
          <ambientLight intensity={0.85} />
          <directionalLight
            position={[3, 4, 5]}
            intensity={1.45}
            color="#ffffff"
          />
          <directionalLight
            position={[-2.5, 2, -2]}
            intensity={0.45}
            color="#fff5eb"
          />
          <hemisphereLight args={["#f0f4ff", "#e8e0d8", 0.35]} />
          <Suspense fallback={null}>
            <WaitForMeshopt>
              <SpineModel
                progressRef={progressRef}
                herniaWorldPosRef={herniaWorldPosRef}
                herniaReadyRef={herniaReadyRef}
              />
            </WaitForMeshopt>
          </Suspense>
          <Rig
            progressRef={progressRef}
            herniaWorldPosRef={herniaWorldPosRef}
            herniaReadyRef={herniaReadyRef}
          />
        </Canvas>
      </SpineErrorBoundary>
    </div>
  );
}
