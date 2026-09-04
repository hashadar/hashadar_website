"use client";

import { Canvas } from "@react-three/fiber";
import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
} from "react";
import {
  clampDevicePixelRatio,
  resolveWebGLQuality,
  type WebGLQualityTier,
} from "@/lib/motion/quality";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { HeroFallback } from "./hero-fallback";
import { HeroScene } from "./hero-scene";
import { useThemeUniforms } from "./use-theme-uniforms";

export interface HeroWebGLProps {
  /** Normalised scroll progress 0–1 from the hero section. */
  scrollProgressRef: RefObject<number | null> | MutableRefObject<number>;
}

interface ErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
  onError?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class WebGLErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError?.();
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(pointer: coarse)").matches;
  });

  useEffect(() => {
    const media = window.matchMedia("(pointer: coarse)");
    const onChange = () => setCoarse(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return coarse;
}

function useViewportWidth(): number {
  const [width, setWidth] = useState(() =>
    typeof window === "undefined" ? 1280 : window.innerWidth,
  );

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return width;
}

/**
 * Home-hero WebGL shell: quality tiers, off-screen pause, failure → fallback.
 * Atmosphere only — brand typography stays in the DOM. Scroll + idle; no pointer.
 */
export function HeroWebGL({ scrollProgressRef }: HeroWebGLProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const coarsePointer = useCoarsePointer();
  const viewportWidth = useViewportWidth();
  const colors = useThemeUniforms();
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const [failed, setFailed] = useState(false);

  const tier: WebGLQualityTier = useMemo(
    () =>
      resolveWebGLQuality({
        prefersReducedMotion,
        coarsePointer,
        viewportWidth,
      }),
    [prefersReducedMotion, coarsePointer, viewportWidth],
  );

  const dpr = useMemo(() => {
    if (typeof window === "undefined") return 1;
    return clampDevicePixelRatio(tier, window.devicePixelRatio || 1);
  }, [tier]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.05 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (tier === "off" || failed) {
    return <HeroFallback />;
  }

  const activeTier = tier as Exclude<WebGLQualityTier, "off">;

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0"
      aria-hidden="true"
    >
      <WebGLErrorBoundary fallback={<HeroFallback />} onError={() => setFailed(true)}>
        <Suspense fallback={<HeroFallback />}>
          <Canvas
            dpr={dpr}
            frameloop={inView ? "always" : "never"}
            gl={{
              antialias: activeTier === "high",
              alpha: false,
              powerPreference: activeTier === "low" ? "low-power" : "high-performance",
              failIfMajorPerformanceCaveat: false,
            }}
            camera={{ position: [0, 0.15, 5.2], fov: 42, near: 0.1, far: 40 }}
            style={{ width: "100%", height: "100%" }}
            onCreated={({ gl }) => {
              gl.setClearColor(colors.background, 1);
            }}
          >
            <HeroScene
              scrollProgressRef={scrollProgressRef as MutableRefObject<number>}
              tier={activeTier}
              colors={colors}
            />
          </Canvas>
        </Suspense>
      </WebGLErrorBoundary>
    </div>
  );
}
