/**
 * Lava Chasm Shader Material
 *
 * Uses @react-three/drei's `shaderMaterial` utility to produce a time-driven,
 * GPU-computed lava surface with:
 *   - Vertex displacement (bubbling geometry via simplex noise)
 *   - Fragment color bands (crimson → orange → white-hot emissive) keyed to
 *     noise value and displaced height
 *
 * Usage:
 *   extend({ LavaMaterial })
 *   <mesh>
 *     <planeGeometry args={[2.2, 14, 32, 32]} />
 *     <lavaMaterial ref={matRef} />
 *   </mesh>
 */

import { shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'

// ── Shared GLSL Simplex Noise (2D + 3D mod333 implementation) ────────────────
const GLSL_SIMPLEX_NOISE = /* glsl */ `
// ---- simplex noise helpers -------------------------------------------------
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g  = step(x0.yzx, x0.xyz);
  vec3 l  = 1.0 - g;
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
  vec3  ns = n_ * D.wyz - D.xzx;

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
`

// ── Vertex Shader ─────────────────────────────────────────────────────────────
// Displaces Y-axis vertices using layered simplex noise driven by uTime,
// creating physical bubbling geometry. Passes the raw noise value and displaced
// height to the fragment stage for colour mapping.
const vertexShader = /* glsl */ `
${GLSL_SIMPLEX_NOISE}

uniform float uTime;
varying float vNoise;
varying float vHeight;

void main() {
  vec3 pos = position;

  // Use pos.xy for noise coordinates (PlaneGeometry is on the XY plane locally)
  float n1 = snoise(vec3(pos.x * 1.2, pos.y * 1.2, uTime * 0.38));
  float n2 = snoise(vec3(pos.x * 2.6 + 4.1, pos.y * 2.6 - 2.3, uTime * 0.72)) * 0.45;
  float n  = n1 + n2;

  // Displace vertex along local Z (which becomes world Y after rotation)
  pos.z += n * 0.28;

  vNoise  = n;
  vHeight = pos.z;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`

// ── Fragment Shader ───────────────────────────────────────────────────────────
// Blends dark crimson → molten orange → white-hot emissive based on noise value
// and displaced height. Lower troughs cool into hardened lava; peaks glow white.
const fragmentShader = /* glsl */ `
uniform float uTime;
varying float vNoise;
varying float vHeight;

void main() {
  // Normalise noise+height composite into 0..1
  float t = clamp((vNoise * 0.5 + 0.5) + vHeight * 0.6, 0.0, 1.0);

  // Colour palette: cold crust → deep crimson → molten orange → white-hot
  vec3 crust   = vec3(0.06, 0.01, 0.01);   // near-black cooled rock
  vec3 crimson = vec3(0.55, 0.04, 0.01);   // deep red lava body
  vec3 orange  = vec3(1.00, 0.35, 0.02);   // bright molten orange
  vec3 hot     = vec3(1.00, 0.92, 0.72);   // white-hot bubble peak

  vec3 col;
  col  = mix(crust,   crimson, smoothstep(0.0, 0.3, t));
  col  = mix(col,     orange,  smoothstep(0.3, 0.65, t));
  col  = mix(col,     hot,     smoothstep(0.65, 1.0, t));

  // High emissive to make lava self-illuminating
  float emissive = smoothstep(0.2, 1.0, t) * 3.2;
  vec3 finalColor = col * (1.0 + emissive);

  gl_FragColor = vec4(finalColor, 1.0);
}
`

// ── Compiled ShaderMaterial ───────────────────────────────────────────────────
export const LavaMaterial = shaderMaterial(
  {
    uTime: 0.0,
  },
  vertexShader,
  fragmentShader,
)

// TypeScript module augmentation so <lavaMaterial /> is recognised by R3F JSX
declare module '@react-three/fiber' {
  interface ThreeElements {
    lavaMaterial: THREE.ShaderMaterial & { uTime: number }
  }
}
