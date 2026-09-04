"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { WebGLQualityTier } from "@/lib/motion/quality";
import type { HeroThemeColors } from "./use-theme-uniforms";

export interface HeroSceneProps {
  /** Normalised scroll progress 0–1 (hero start → end). */
  scrollProgressRef: React.MutableRefObject<number>;
  /** Normalised pointer −1…1; ignored when pointerEnabled is false. */
  pointerRef: React.MutableRefObject<{ x: number; y: number }>;
  pointerEnabled: boolean;
  tier: Exclude<WebGLQualityTier, "off">;
  colors: HeroThemeColors;
}

function PlaneCut({
  position,
  rotation,
  size,
  color,
  opacity,
  metalness,
  roughness,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number];
  color: string;
  opacity: number;
  metalness: number;
  roughness: number;
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity}
        metalness={metalness}
        roughness={roughness}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * Angular depth field: planes / light cuts / geometric mass.
 * Brand primary + mono tones; scroll and pointer intensify presence.
 */
export function HeroScene({
  scrollProgressRef,
  pointerRef,
  pointerEnabled,
  tier,
  colors,
}: HeroSceneProps) {
  const rootRef = useRef<THREE.Group>(null);
  const massRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const rimRef = useRef<THREE.DirectionalLight>(null);

  const planeCount = tier === "low" ? 3 : tier === "medium" ? 5 : 7;

  const planes = useMemo(
    () =>
      [
        {
          position: [-2.2, 0.8, -1.2] as [number, number, number],
          rotation: [0.55, 0.35, Math.PI / 4] as [number, number, number],
          size: [3.2, 3.2] as [number, number],
          opacity: 0.12,
          usePrimary: true,
        },
        {
          position: [2.4, -0.4, -2.0] as [number, number, number],
          rotation: [-0.4, -0.5, -Math.PI / 5] as [number, number, number],
          size: [2.6, 2.6] as [number, number],
          opacity: 0.1,
          usePrimary: false,
        },
        {
          position: [-0.6, -1.4, -0.6] as [number, number, number],
          rotation: [1.1, 0.2, 0.4] as [number, number, number],
          size: [2.0, 2.0] as [number, number],
          opacity: 0.14,
          usePrimary: true,
        },
        {
          position: [1.2, 1.6, -2.8] as [number, number, number],
          rotation: [0.2, 0.8, Math.PI / 6] as [number, number, number],
          size: [4.0, 1.2] as [number, number],
          opacity: 0.08,
          usePrimary: false,
        },
        {
          position: [-2.8, -0.2, -3.2] as [number, number, number],
          rotation: [0.9, -0.3, -0.6] as [number, number, number],
          size: [2.4, 2.4] as [number, number],
          opacity: 0.09,
          usePrimary: true,
        },
        {
          position: [0.4, 0.2, -4.0] as [number, number, number],
          rotation: [0.15, 0.15, Math.PI / 3] as [number, number, number],
          size: [5.0, 5.0] as [number, number],
          opacity: 0.05,
          usePrimary: false,
        },
        {
          position: [2.8, 1.0, -1.6] as [number, number, number],
          rotation: [-0.7, 0.4, 0.25] as [number, number, number],
          size: [1.4, 1.4] as [number, number],
          opacity: 0.16,
          usePrimary: true,
        },
      ].slice(0, planeCount),
    [planeCount],
  );

  useFrame((state) => {
    const scroll = scrollProgressRef.current ?? 0;
    const t = state.clock.elapsedTime;
    const pointerX = pointerEnabled ? pointerRef.current.x : 0;
    const pointerY = pointerEnabled ? pointerRef.current.y : 0;

    // Idle drift; scroll intensifies depth / rotation.
    if (rootRef.current) {
      rootRef.current.rotation.y =
        Math.sin(t * 0.12) * 0.06 + scroll * 0.45 + pointerX * 0.12;
      rootRef.current.rotation.x =
        Math.cos(t * 0.1) * 0.04 + scroll * 0.22 + pointerY * 0.08;
      rootRef.current.position.z = -scroll * 1.8;
      rootRef.current.position.x = pointerX * 0.25;
      rootRef.current.position.y = pointerY * 0.15;
    }

    if (massRef.current) {
      massRef.current.rotation.x = t * 0.08 + scroll * 0.6;
      massRef.current.rotation.y = t * 0.06 + scroll * 0.4;
      massRef.current.position.z = -1.2 - scroll * 0.8;
    }

    if (lightRef.current) {
      lightRef.current.position.set(
        4 + scroll * 2 + pointerX,
        3 - scroll * 1.5,
        2 + scroll,
      );
      lightRef.current.intensity = 1.1 + scroll * 0.7;
    }

    if (rimRef.current) {
      rimRef.current.position.set(-3 - scroll, 1 + pointerY, -2 - scroll);
      rimRef.current.intensity = 0.45 + scroll * 0.55;
    }
  });

  return (
    <>
      <color attach="background" args={[colors.background]} />
      <fog attach="fog" args={[colors.background, 6, 16]} />

      <ambientLight intensity={0.35} color={colors.foreground} />
      <directionalLight
        ref={lightRef}
        color={colors.primary}
        intensity={1.2}
        position={[4, 3, 2]}
      />
      <directionalLight
        ref={rimRef}
        color={colors.foreground}
        intensity={0.5}
        position={[-3, 1, -2]}
      />

      <group ref={rootRef}>
        {planes.map((plane, index) => (
          <PlaneCut
            key={index}
            position={plane.position}
            rotation={plane.rotation}
            size={plane.size}
            color={plane.usePrimary ? colors.primary : colors.foreground}
            opacity={plane.opacity}
            metalness={tier === "high" ? 0.35 : 0.15}
            roughness={tier === "high" ? 0.45 : 0.7}
          />
        ))}

        {/* Geometric mass — solid angular block */}
        <mesh ref={massRef} position={[0.2, 0.1, -1.2]} rotation={[0.6, 0.8, 0.3]}>
          <boxGeometry args={[1.1, 1.1, 1.1]} />
          <meshStandardMaterial
            color={colors.primary}
            metalness={0.55}
            roughness={0.35}
            transparent
            opacity={0.55}
          />
        </mesh>

        {tier !== "low" && (
          <mesh position={[-1.4, 0.9, -0.4]} rotation={[0.2, -0.4, Math.PI / 4]}>
            <boxGeometry args={[0.35, 0.35, 0.35]} />
            <meshStandardMaterial
              color={colors.foreground}
              metalness={0.2}
              roughness={0.6}
              transparent
              opacity={0.25}
            />
          </mesh>
        )}
      </group>
    </>
  );
}
