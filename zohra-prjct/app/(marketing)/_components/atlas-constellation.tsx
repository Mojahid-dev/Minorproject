"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function AtlasConstellation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 5.5);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const constellation = new THREE.Group();
    constellation.position.set(1.7, -0.1, 0);
    constellation.rotation.set(-0.2, 0.25, 0.05);
    scene.add(constellation);

    const nodePositions: number[] = [];
    const pointCount = 22;
    for (let index = 0; index < pointCount; index += 1) {
      const angle = index * 2.39996;
      const radius = 0.25 + (index % 7) * 0.17;
      nodePositions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, ((index % 4) - 1.5) * 0.16);
    }

    const pointsGeometry = new THREE.BufferGeometry();
    pointsGeometry.setAttribute("position", new THREE.Float32BufferAttribute(nodePositions, 3));
    const points = new THREE.Points(pointsGeometry, new THREE.PointsMaterial({ color: 0xfacc15, size: 0.035, transparent: true, opacity: 0.72, sizeAttenuation: true }));
    constellation.add(points);

    const linePositions: number[] = [];
    for (let index = 0; index < pointCount - 1; index += 1) {
      const source = index * 3;
      const target = ((index + 3) % pointCount) * 3;
      linePositions.push(nodePositions[source], nodePositions[source + 1], nodePositions[source + 2], nodePositions[target], nodePositions[target + 1], nodePositions[target + 2]);
    }
    const linesGeometry = new THREE.BufferGeometry();
    linesGeometry.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
    const lines = new THREE.LineSegments(linesGeometry, new THREE.LineBasicMaterial({ color: 0xeab308, transparent: true, opacity: 0.17 }));
    constellation.add(lines);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.006, 8, 64), new THREE.MeshBasicMaterial({ color: 0xeab308, transparent: true, opacity: 0.24 }));
    ring.rotation.x = 0.8;
    constellation.add(ring);

    const core = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 20), new THREE.MeshBasicMaterial({ color: 0xfde68a, transparent: true, opacity: 0.9 }));
    constellation.add(core);

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frameId = 0;
    const start = performance.now();
    const render = (time: number) => {
      const elapsed = (time - start) * 0.00012;
      constellation.rotation.y = 0.25 + elapsed;
      constellation.rotation.z = 0.05 + Math.sin(elapsed * 2.2) * 0.025;
      ring.rotation.z = -elapsed * 0.7;
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
      core.geometry.dispose();
      (points.material as THREE.Material).dispose();
      (lines.material as THREE.Material).dispose();
      (ring.material as THREE.Material).dispose();
      (core.material as THREE.Material).dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 size-full opacity-70 [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />;
}
