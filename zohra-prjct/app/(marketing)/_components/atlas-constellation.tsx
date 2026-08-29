"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function AtlasConstellation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050505, 0.03);

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 5.5);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x00000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const constellation = new THREE.Group();
    constellation.position.set(1.7, -0.1, 0);
    constellation.rotation.set(-0.2, -0.4, 0.05);
    scene.add(constellation);

    const ambientLight = new THREE.AmbientLight(0xfff3b0, 0.4);
    const directionalLight = new THREE.DirectionalLight(0xffe8a0, 1.6);
    directionalLight.position.set(2.4, 1.2, 3.4);
    const pointLight = new THREE.PointLight(0xfacc15, 22, 8, 2);
    pointLight.position.set(0.8, 0.4, 2.5);
    scene.add(ambientLight, directionalLight, pointLight);

    const nodePositions: number[] = [];
    const pointCount = 24;
    for (let index = 0; index < pointCount; index += 1) {
      const angle = index * 2.39996;
      const radius = 0.22 + (index % 8) * 0.16;
      nodePositions.push(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        ((index % 5) - 2) * 0.16,
      );
    }

    const pointsGeometry = new THREE.BufferGeometry();
    pointsGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(nodePositions, 3),
    );
    const pointsMaterial = new THREE.PointsMaterial({
      color: 0xfacc15,
      size: 0.038,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      depthWrite: false,
    });
    const points = new THREE.Points(pointsGeometry, pointsMaterial);
    constellation.add(points);

    const linePositions: number[] = [];
    for (let index = 0; index < pointCount - 1; index += 1) {
      const source = index * 3;
      const target = ((index + 3) % pointCount) * 3;
      linePositions.push(
        nodePositions[source],
        nodePositions[source + 1],
        nodePositions[source + 2],
        nodePositions[target],
        nodePositions[target + 1],
        nodePositions[target + 2],
      );
    }
    const linesGeometry = new THREE.BufferGeometry();
    linesGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(linePositions, 3),
    );
    const lines = new THREE.LineSegments(
      linesGeometry,
      new THREE.LineBasicMaterial({
        color: 0xeab308,
        transparent: true,
        opacity: 0.2,
      }),
    );
    constellation.add(lines);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.15, 0.0065, 8, 128),
      new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.24,
      }),
    );
    ring.rotation.x = 0.8;
    constellation.add(ring);

    const halo = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.9, 0.17, 128, 16),
      new THREE.MeshPhysicalMaterial({
        color: 0xfde68a,
        emissive: 0x3f2b00,
        emissiveIntensity: 0.5,
        roughness: 0.28,
        metalness: 0.14,
        transparent: true,
        opacity: 0.7,
        wireframe: true,
      }),
    );
    halo.rotation.x = 0.85;
    halo.rotation.y = 0.6;
    constellation.add(halo);

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 24, 24),
      new THREE.MeshStandardMaterial({
        color: 0xfff7cc,
        emissive: 0x664400,
        emissiveIntensity: 0.75,
        roughness: 0.2,
        metalness: 0.1,
      }),
    );
    constellation.add(core);

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let frameId = 0;
    const start = performance.now();
    const render = (time: number) => {
      const elapsed = (time - start) * 0.00014;
      constellation.rotation.y = -0.4 + elapsed * 0.8;
      constellation.rotation.z = 0.05 + Math.sin(elapsed * 1.7) * 0.025;
      ring.rotation.z = -elapsed * 0.8;
      halo.rotation.x = 0.85 + Math.sin(elapsed * 1.2) * 0.16;
      halo.rotation.y = 0.6 + elapsed * 0.35;
      core.scale.setScalar(1 + Math.sin(elapsed * 3.2) * 0.04);
      pointLight.intensity = 18 + Math.sin(elapsed * 2.4) * 2.2;
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(render);
    };

    resize();
    if (reducedMotion) renderer.render(scene, camera);
    else frameId = window.requestAnimationFrame(render);
    window.addEventListener("resize", resize);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      pointsGeometry.dispose();
      linesGeometry.dispose();
      ring.geometry.dispose();
      halo.geometry.dispose();
      core.geometry.dispose();
      (points.material as THREE.Material).dispose();
      (lines.material as THREE.Material).dispose();
      (ring.material as THREE.Material).dispose();
      (halo.material as THREE.Material).dispose();
      (core.material as THREE.Material).dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 size-full opacity-70 [mask-image:linear-gradient(to_bottom,black,transparent_78%)]"
    />
  );
}
