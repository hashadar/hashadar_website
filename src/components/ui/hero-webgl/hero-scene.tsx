"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { WebGLQualityTier } from "@/lib/motion/quality";
import type { HeroThemeColors } from "./use-theme-uniforms";

export interface HeroSceneProps {
  /** Normalised scroll progress 0–1 (hero start → end). */
  scrollProgressRef: React.MutableRefObject<number>;
  tier: Exclude<WebGLQualityTier, "off">;
  colors: HeroThemeColors;
}

function lerp(current: number, target: number, alpha: number) {
  return current + (target - current) * alpha;
}

/** Fullscreen photographic grain — high/medium only. */
function GrainOverlay({ opacity }: { opacity: number }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  useFrame((state) => {
    const material = materialRef.current;
    if (!material) return;
    material.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh renderOrder={10} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        transparent
        depthTest={false}
        depthWrite={false}
        uniforms={{
          uTime: { value: 0 },
          uOpacity: { value: opacity },
        }}
        vertexShader={/* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position.xy, 0.0, 1.0);
          }
        `}
        fragmentShader={/* glsl */ `
          uniform float uTime;
          uniform float uOpacity;
          varying vec2 vUv;

          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
          }

          void main() {
            float n = hash(vUv * vec2(960.0, 540.0) + uTime * 12.0);
            float grain = (n - 0.5) * 2.0;
            gl_FragColor = vec4(vec3(grain), uOpacity);
          }
        `}
      />
    </mesh>
  );
}

/**
 * Signature angular depth field: masses, light cuts, scroll + idle.
 * No pointer parallax — presence never snaps when the cursor leaves.
 */
export function HeroScene({ scrollProgressRef, tier, colors }: HeroSceneProps) {
  const rootRef = useRef<THREE.Group>(null);
  const massRef = useRef<THREE.Group>(null);
  const cutsRef = useRef<THREE.Group>(null);
  const keyLightRef = useRef<THREE.DirectionalLight>(null);
  const rimLightRef = useRef<THREE.DirectionalLight>(null);
  const fillLightRef = useRef<THREE.DirectionalLight>(null);
  const scrollSmooth = useRef(0);

  const showCuts = tier !== "low";
  const showGrain = tier === "high" || tier === "medium";
  const grainOpacity = tier === "high" ? 0.045 : 0.03;

  const structuralPlanes = useMemo(
    () => [
      {
        position: [-2.6, 0.4, -2.4] as [number, number, number],
        rotation: [0.35, 0.55, Math.PI / 4] as [number, number, number],
        size: [4.2, 4.2] as [number, number],
        opacity: 0.11,
        primary: true,
      },
      {
        position: [2.8, -0.6, -3.2] as [number, number, number],
        rotation: [-0.45, -0.35, -0.55] as [number, number, number],
        size: [3.6, 3.6] as [number, number],
        opacity: 0.09,
        primary: false,
      },
      {
        position: [0.2, 1.8, -4.5] as [number, number, number],
        rotation: [0.15, 0.2, Math.PI / 5] as [number, number, number],
        size: [6.5, 2.2] as [number, number],
        opacity: 0.07,
        primary: false,
      },
    ],
    [],
  );

  const lightCuts = useMemo(
    () => [
      {
        position: [-0.2, 0.3, -0.4] as [number, number, number],
        rotation: [0.2, 0.15, -0.85] as [number, number, number],
        size: [0.045, 5.5, 0.045] as [number, number, number],
        emissiveIntensity: 2.4,
      },
      {
        position: [1.1, -0.5, 0.2] as [number, number, number],
        rotation: [-0.35, 0.4, 1.1] as [number, number, number],
        size: [0.03, 3.8, 0.03] as [number, number, number],
        emissiveIntensity: 1.6,
      },
      {
        position: [-1.6, 0.9, -1.0] as [number, number, number],
        rotation: [0.6, -0.2, 0.35] as [number, number, number],
        size: [0.025, 2.8, 0.025] as [number, number, number],
        emissiveIntensity: 1.2,
      },
    ],
    [],
  );

  useFrame((state, delta) => {
    const targetScroll = scrollProgressRef.current ?? 0;
    const alpha = 1 - Math.exp(-delta * 4.2);
    scrollSmooth.current = lerp(scrollSmooth.current, targetScroll, alpha);
    const scroll = scrollSmooth.current;
    const t = state.clock.elapsedTime;

    // Idle drift + scroll intensification
    if (rootRef.current) {
      const idleY = Math.sin(t * 0.11) * 0.07;
      const idleX = Math.cos(t * 0.09) * 0.045;
      rootRef.current.rotation.y = idleY + scroll * 0.55;
      rootRef.current.rotation.x = idleX + scroll * 0.28;
      rootRef.current.position.z = -scroll * 2.4;
      rootRef.current.position.y = scroll * -0.35;
    }

    if (massRef.current) {
      massRef.current.rotation.y = t * 0.07 + scroll * 0.5;
      massRef.current.rotation.x = t * 0.045 + scroll * 0.35;
      massRef.current.position.z = -0.6 - scroll * 1.1;
      const scale = 1 + scroll * 0.18;
      massRef.current.scale.setScalar(scale);
    }

    if (cutsRef.current) {
      cutsRef.current.rotation.z = Math.sin(t * 0.08) * 0.04 + scroll * 0.2;
      cutsRef.current.rotation.y = scroll * 0.25;
    }

    // Camera push-in on scroll
    state.camera.position.z = lerp(state.camera.position.z, 5.2 - scroll * 1.6, alpha);
    state.camera.position.y = lerp(state.camera.position.y, 0.15 + scroll * 0.35, alpha);
    state.camera.lookAt(0, scroll * -0.2, -1);

    if (keyLightRef.current) {
      keyLightRef.current.position.set(
        3.5 + Math.sin(t * 0.15) * 0.4 + scroll * 2.2,
        2.8 - scroll * 1.8,
        2.5 + scroll * 0.8,
      );
      keyLightRef.current.intensity = 1.35 + scroll * 1.1;
    }

    if (rimLightRef.current) {
      rimLightRef.current.position.set(
        -3.2 - scroll * 0.8,
        1.2 + Math.cos(t * 0.12) * 0.3,
        -2.2 - scroll,
      );
      rimLightRef.current.intensity = 0.55 + scroll * 0.85;
    }

    if (fillLightRef.current) {
      fillLightRef.current.intensity = 0.35 + scroll * 0.25;
    }
  });

  return (
    <>
      <color attach="background" args={[colors.background]} />
      <fog attach="fog" args={[colors.background, 4.5, 14]} />

      <ambientLight intensity={0.22} color={colors.foreground} />
      <directionalLight
        ref={keyLightRef}
        color={colors.primary}
        intensity={1.4}
        position={[3.5, 2.8, 2.5]}
      />
      <directionalLight
        ref={rimLightRef}
        color={colors.foreground}
        intensity={0.55}
        position={[-3.2, 1.2, -2.2]}
      />
      <directionalLight
        ref={fillLightRef}
        color={colors.primary}
        intensity={0.35}
        position={[0, -2.5, 1.5]}
      />

      <group ref={rootRef}>
        {/* Structural depth planes */}
        {structuralPlanes.map((plane, index) => (
          <mesh
            key={`plane-${index}`}
            position={plane.position}
            rotation={plane.rotation}
          >
            <planeGeometry args={plane.size} />
            <meshStandardMaterial
              color={plane.primary ? colors.primary : colors.foreground}
              transparent
              opacity={plane.opacity}
              metalness={tier === "high" ? 0.4 : 0.2}
              roughness={tier === "high" ? 0.4 : 0.65}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        ))}

        {/* Primary angular mass cluster */}
        <group ref={massRef} position={[0.35, 0.05, -0.8]}>
          <mesh rotation={[0.55, 0.75, 0.25]}>
            <boxGeometry args={[1.55, 1.55, 1.55]} />
            <meshStandardMaterial
              color={colors.primary}
              metalness={0.62}
              roughness={0.28}
              transparent
              opacity={0.72}
            />
          </mesh>
          <mesh position={[0.95, -0.55, 0.35]} rotation={[-0.4, 0.3, 0.8]}>
            <boxGeometry args={[0.85, 0.85, 0.85]} />
            <meshStandardMaterial
              color={colors.primary}
              metalness={0.5}
              roughness={0.35}
              transparent
              opacity={0.55}
            />
          </mesh>
          <mesh position={[-0.85, 0.7, -0.45]} rotation={[0.3, -0.6, -0.35]}>
            <boxGeometry args={[0.55, 1.4, 0.35]} />
            <meshStandardMaterial
              color={colors.foreground}
              metalness={0.25}
              roughness={0.55}
              transparent
              opacity={0.35}
            />
          </mesh>
          <mesh position={[0.15, 1.05, 0.55]} rotation={[0.9, 0.2, 0.15]}>
            <boxGeometry args={[1.2, 0.12, 0.7]} />
            <meshStandardMaterial
              color={colors.primary}
              metalness={0.7}
              roughness={0.2}
              transparent
              opacity={0.65}
              emissive={colors.primary}
              emissiveIntensity={0.25}
            />
          </mesh>
        </group>

        {/* Secondary mono mass */}
        <mesh position={[-2.1, -0.9, -1.6]} rotation={[0.4, -0.5, 0.7]}>
          <boxGeometry args={[0.9, 0.9, 0.9]} />
          <meshStandardMaterial
            color={colors.foreground}
            metalness={0.3}
            roughness={0.5}
            transparent
            opacity={0.28}
          />
        </mesh>

        {/* Primary light-cut blades */}
        {showCuts && (
          <group ref={cutsRef}>
            {lightCuts.map((cut, index) => (
              <mesh
                key={`cut-${index}`}
                position={cut.position}
                rotation={cut.rotation}
              >
                <boxGeometry args={cut.size} />
                <meshStandardMaterial
                  color={colors.primary}
                  emissive={colors.primary}
                  emissiveIntensity={cut.emissiveIntensity}
                  metalness={0.8}
                  roughness={0.15}
                  transparent
                  opacity={0.9}
                />
              </mesh>
            ))}
          </group>
        )}
      </group>

      {showGrain && <GrainOverlay opacity={grainOpacity} />}
    </>
  );
}
