"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import * as THREE from "three";

const vertexShader = /* glsl */ `
  varying float vElevation;
  uniform float uTime;
  void main() {
    vec3 pos = position;
    float elevation = sin(pos.x * 0.15 + uTime * 0.4) * cos(pos.z * 0.15 + uTime * 0.3) * 3.5;
    elevation += sin(pos.x * 0.4 - uTime * 0.6) * 0.8;
    pos.y += elevation;
    vElevation = pos.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vElevation;
  void main() {
    float mixStrength = (vElevation + 3.0) / 7.0;
    vec3 colorA = vec3(0.0, 0.55, 0.58); /* clay teal */
    vec3 colorB = vec3(0.91, 0.90, 0.89); /* bone */
    vec3 finalColor = mix(colorB, colorA, mixStrength);
    gl_FragColor = vec4(finalColor, 0.42);
  }
`;

/**
 * Animated wireframe terrain — a drifting clay-on-bone mesh behind the page.
 * Fixed, pointer-transparent, and parked at a single static frame when the
 * visitor prefers reduced motion. Client-only (load via next/dynamic ssr:false).
 */
export function Terrain({
  opacity = 0.5,
  className = "",
}: {
  opacity?: number;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    camera.position.set(0, 8, 18);
    camera.lookAt(0, 1.5, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const geometry = new THREE.PlaneGeometry(80, 80, 100, 100);
    geometry.rotateX(-Math.PI / 2);

    const uniforms = { uTime: { value: 0 } };
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      wireframe: true,
      transparent: true,
    });

    const plane = new THREE.Mesh(geometry, material);
    scene.add(plane);

    const clock = new THREE.Clock();
    let raf = 0;

    // Pointer parallax: camera drifts toward the cursor, eased.
    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;
    const finePointer =
      typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;
    const onPointer = (e: PointerEvent) => {
      targetX = e.clientX / window.innerWidth - 0.5;
      targetY = e.clientY / window.innerHeight - 0.5;
    };

    const animate = () => {
      raf = requestAnimationFrame(animate);
      uniforms.uTime.value = clock.getElapsedTime();
      curX += (targetX - curX) * 0.045;
      curY += (targetY - curY) * 0.045;
      camera.position.x = curX * 6;
      camera.position.y = 8 - curY * 2.5;
      camera.lookAt(0, 1.5, 0);
      plane.rotation.y += 0.0005;
      renderer.render(scene, camera);
    };

    if (prefersReduced) {
      renderer.render(scene, camera);
    } else {
      if (finePointer) window.addEventListener("pointermove", onPointer, { passive: true });
      animate();
    }

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointermove", onPointer);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [prefersReduced]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{ opacity }}
      className={`pointer-events-none fixed inset-0 -z-10 ${className}`}
    />
  );
}
