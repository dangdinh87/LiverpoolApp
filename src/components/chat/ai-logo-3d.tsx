"use client";

import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";

// ── GLSL Shaders ──────────────────────────────────────────────

// Smooth glass-like core with subtle noise distortion
const coreVertexShader = `
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying float vNoise;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;

    // Very subtle displacement — smooth organic movement
    float noise = snoise(position * 1.5 + uTime * 0.15);
    vNoise = noise;
    float displacement = noise * 0.06;

    vec3 newPosition = position + normal * displacement;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

// Elegant dark glass with red rim lighting
const coreFragmentShader = `
  uniform float uTime;
  uniform vec3 uColorPrimary;   // LFC Red
  uniform vec3 uColorAccent;    // Gold
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying float vNoise;

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 2.5);

    // Gentle pulse
    float pulse = sin(uTime * 0.8) * 0.08 + 0.92;

    // Dark glass base with red tint
    vec3 baseColor = vec3(0.08, 0.01, 0.02);

    // Subtle inner energy veins
    float veins = sin(vWorldPos.x * 6.0 + uTime * 0.8) *
                  sin(vWorldPos.y * 6.0 + uTime * 0.6) *
                  sin(vWorldPos.z * 6.0 + uTime * 0.7);
    veins = smoothstep(0.3, 0.8, veins);

    // Build color: dark base + subtle veins + red rim
    vec3 color = baseColor;
    color += uColorPrimary * veins * 0.15;
    color += uColorPrimary * fresnel * 0.6 * pulse;

    // Thin gold highlight on strongest edges
    color += uColorAccent * pow(fresnel, 5.0) * 0.2;

    float alpha = 0.85 + fresnel * 0.15;
    gl_FragColor = vec4(color, alpha);
  }
`;

// Particle shaders
const particleVertexShader = `
  attribute float aSize;
  attribute float aAlpha;
  varying float vAlpha;

  void main() {
    vAlpha = aAlpha;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (150.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const particleFragmentShader = `
  uniform vec3 uColor;
  varying float vAlpha;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    // Soft fade from center
    float alpha = smoothstep(0.5, 0.0, dist) * vAlpha;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

// ── Constants ─────────────────────────────────────────────────

const LFC_RED = new THREE.Color(0xc8102e);
const LFC_RED_DIM = new THREE.Color(0x8a0b1f);
const LFC_GOLD = new THREE.Color(0xf6eb61);
const ORBIT_COUNT = 60;
const AMBIENT_COUNT = 40;

interface AiLogo3DProps {
  size?: number;
  className?: string;
}

export function AiLogo3D({ size = 280, className = "" }: AiLogo3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    core: THREE.Mesh;
    wireframe: THREE.Mesh;
    rings: THREE.Group;
    orbitParticles: THREE.Points;
    ambientParticles: THREE.Points;
    neuralLines: THREE.LineSegments;
    clock: THREE.Clock;
    mouse: THREE.Vector2;
    animId: number;
  } | null>(null);

  const initScene = useCallback((container: HTMLDivElement) => {
    const w = size;
    const h = size;

    // Renderer — no tone mapping to keep colors controlled
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 50);
    camera.position.z = 4.5;

    // ── Core — dark glass icosahedron ───────────────────────
    const coreGeo = new THREE.IcosahedronGeometry(0.75, 5);
    const coreMat = new THREE.ShaderMaterial({
      vertexShader: coreVertexShader,
      fragmentShader: coreFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColorPrimary: { value: LFC_RED },
        uColorAccent: { value: LFC_GOLD },
      },
      transparent: true,
      side: THREE.FrontSide,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    scene.add(core);

    // ── Wireframe overlay — low-poly geometric look ─────────
    const wireGeo = new THREE.IcosahedronGeometry(0.78, 1);
    const wireMat = new THREE.MeshBasicMaterial({
      color: LFC_RED,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    });
    const wireframe = new THREE.Mesh(wireGeo, wireMat);
    core.add(wireframe);

    // ── Orbital Rings ───────────────────────────────────────
    const rings = new THREE.Group();
    scene.add(rings);

    // Ring 1 — main red ring
    const r1Geo = new THREE.TorusGeometry(1.25, 0.008, 16, 128);
    const r1Mat = new THREE.MeshBasicMaterial({
      color: LFC_RED,
      transparent: true,
      opacity: 0.35,
    });
    const ring1 = new THREE.Mesh(r1Geo, r1Mat);
    ring1.rotation.x = Math.PI * 0.5;
    rings.add(ring1);

    // Ring 2 — tilted gold ring
    const r2Geo = new THREE.TorusGeometry(1.45, 0.005, 16, 128);
    const r2Mat = new THREE.MeshBasicMaterial({
      color: LFC_GOLD,
      transparent: true,
      opacity: 0.15,
    });
    const ring2 = new THREE.Mesh(r2Geo, r2Mat);
    ring2.rotation.x = Math.PI * 0.4;
    ring2.rotation.z = Math.PI * 0.12;
    rings.add(ring2);

    // Ring 3 — another red tilted ring for depth
    const r3Geo = new THREE.TorusGeometry(1.35, 0.006, 16, 128);
    const r3Mat = new THREE.MeshBasicMaterial({
      color: LFC_RED_DIM,
      transparent: true,
      opacity: 0.2,
    });
    const ring3 = new THREE.Mesh(r3Geo, r3Mat);
    ring3.rotation.x = Math.PI * 0.6;
    ring3.rotation.y = Math.PI * 0.25;
    rings.add(ring3);

    // ── Orbit Particles — sparse, elegant ───────────────────
    const oPos = new Float32Array(ORBIT_COUNT * 3);
    const oSizes = new Float32Array(ORBIT_COUNT);
    const oAlphas = new Float32Array(ORBIT_COUNT);

    for (let i = 0; i < ORBIT_COUNT; i++) {
      const angle = (i / ORBIT_COUNT) * Math.PI * 2;
      const radius = 1.2 + Math.random() * 0.35;
      oPos[i * 3] = Math.cos(angle) * radius;
      oPos[i * 3 + 1] = (Math.random() - 0.5) * 0.3;
      oPos[i * 3 + 2] = Math.sin(angle) * radius;
      oSizes[i] = 1.0 + Math.random() * 2.0;
      oAlphas[i] = 0.15 + Math.random() * 0.4;
    }

    const oGeo = new THREE.BufferGeometry();
    oGeo.setAttribute("position", new THREE.BufferAttribute(oPos, 3));
    oGeo.setAttribute("aSize", new THREE.BufferAttribute(oSizes, 1));
    oGeo.setAttribute("aAlpha", new THREE.BufferAttribute(oAlphas, 1));

    const oMat = new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      uniforms: { uColor: { value: LFC_GOLD } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const orbitParticles = new THREE.Points(oGeo, oMat);
    scene.add(orbitParticles);

    // ── Ambient Particles — subtle floating dust ────────────
    const aPos = new Float32Array(AMBIENT_COUNT * 3);
    const aSizes = new Float32Array(AMBIENT_COUNT);
    const aAlphas = new Float32Array(AMBIENT_COUNT);

    for (let i = 0; i < AMBIENT_COUNT; i++) {
      aPos[i * 3] = (Math.random() - 0.5) * 4;
      aPos[i * 3 + 1] = (Math.random() - 0.5) * 4;
      aPos[i * 3 + 2] = (Math.random() - 0.5) * 2.5;
      aSizes[i] = 0.4 + Math.random() * 1.2;
      aAlphas[i] = 0.05 + Math.random() * 0.15;
    }

    const aGeo = new THREE.BufferGeometry();
    aGeo.setAttribute("position", new THREE.BufferAttribute(aPos, 3));
    aGeo.setAttribute("aSize", new THREE.BufferAttribute(aSizes, 1));
    aGeo.setAttribute("aAlpha", new THREE.BufferAttribute(aAlphas, 1));

    const aMat = new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      uniforms: { uColor: { value: LFC_RED } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const ambientParticles = new THREE.Points(aGeo, aMat);
    scene.add(ambientParticles);

    // ── Neural Lines — subtle connections ────────────────────
    const lineCount = 10;
    const lPos = new Float32Array(lineCount * 6);
    const lGeo = new THREE.BufferGeometry();
    lGeo.setAttribute("position", new THREE.BufferAttribute(lPos, 3));

    const lMat = new THREE.LineBasicMaterial({
      color: LFC_RED,
      transparent: true,
      opacity: 0.08,
    });
    const neuralLines = new THREE.LineSegments(lGeo, lMat);
    scene.add(neuralLines);

    sceneRef.current = {
      renderer,
      scene,
      camera,
      core,
      wireframe,
      rings,
      orbitParticles,
      ambientParticles,
      neuralLines,
      clock: new THREE.Clock(),
      mouse: new THREE.Vector2(0, 0),
      animId: 0,
    };
  }, [size]);

  const animate = useCallback(() => {
    const s = sceneRef.current;
    if (!s) return;

    const t = s.clock.getElapsedTime();

    // Core shader time
    (s.core.material as THREE.ShaderMaterial).uniforms.uTime.value = t;

    // Smooth slow rotation
    s.core.rotation.y = t * 0.12 + s.mouse.x * 0.2;
    s.core.rotation.x = Math.sin(t * 0.08) * 0.05 + s.mouse.y * 0.15;

    // Ring rotations — slow, elegant
    s.rings.children[0].rotation.z = t * 0.15;
    s.rings.children[1].rotation.z = -t * 0.1;
    s.rings.children[2].rotation.z = t * 0.08;

    // Orbit particles — smooth circular motion
    const oPos = s.orbitParticles.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < ORBIT_COUNT; i++) {
      const base = (i / ORBIT_COUNT) * Math.PI * 2;
      const speed = 0.12 + (i % 3) * 0.03;
      const angle = base + t * speed;
      const r = 1.2 + Math.sin(t * 0.3 + i * 0.8) * 0.1;
      const elev = Math.sin(t * 0.4 + i * 0.6) * 0.2;
      oPos.array[i * 3] = Math.cos(angle) * r;
      oPos.array[i * 3 + 1] = elev;
      oPos.array[i * 3 + 2] = Math.sin(angle) * r;
    }
    oPos.needsUpdate = true;

    // Ambient — gentle drift
    const aPos = s.ambientParticles.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < AMBIENT_COUNT; i++) {
      aPos.array[i * 3 + 1] += Math.sin(t * 0.5 + i) * 0.0005;
      aPos.array[i * 3] += Math.cos(t * 0.3 + i * 0.7) * 0.0003;
    }
    aPos.needsUpdate = true;

    // Neural lines — connect random orbit particles
    const lPos = s.neuralLines.geometry.attributes.position as THREE.BufferAttribute;
    const lineCount = lPos.array.length / 6;
    for (let i = 0; i < lineCount; i++) {
      const a = Math.floor(Math.abs(Math.sin(t * 0.2 + i * 1.7)) * ORBIT_COUNT);
      const b = Math.floor(Math.abs(Math.cos(t * 0.25 + i * 2.3)) * ORBIT_COUNT);
      const idx = i * 6;
      lPos.array[idx] = oPos.array[a * 3];
      lPos.array[idx + 1] = oPos.array[a * 3 + 1];
      lPos.array[idx + 2] = oPos.array[a * 3 + 2];
      lPos.array[idx + 3] = oPos.array[b * 3];
      lPos.array[idx + 4] = oPos.array[b * 3 + 1];
      lPos.array[idx + 5] = oPos.array[b * 3 + 2];
    }
    lPos.needsUpdate = true;

    // Smooth camera parallax
    s.camera.position.x += (s.mouse.x * 0.3 - s.camera.position.x) * 0.03;
    s.camera.position.y += (s.mouse.y * 0.2 - s.camera.position.y) * 0.03;
    s.camera.lookAt(0, 0, 0);

    s.renderer.render(s.scene, s.camera);
    s.animId = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    initScene(container);
    animate();

    const onMouse = (e: MouseEvent) => {
      if (!sceneRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      sceneRef.current.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      sceneRef.current.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onTouch = (e: TouchEvent) => {
      if (!sceneRef.current || !containerRef.current || !e.touches[0]) return;
      const rect = containerRef.current.getBoundingClientRect();
      sceneRef.current.mouse.x = ((e.touches[0].clientX - rect.left) / rect.width) * 2 - 1;
      sceneRef.current.mouse.y = -((e.touches[0].clientY - rect.top) / rect.height) * 2 + 1;
    };

    window.addEventListener("mousemove", onMouse);
    container.addEventListener("touchmove", onTouch, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMouse);
      container.removeEventListener("touchmove", onTouch);
      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.animId);
        sceneRef.current.renderer.dispose();
        sceneRef.current.renderer.domElement.remove();
        sceneRef.current = null;
      }
    };
  }, [initScene, animate]);

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}
