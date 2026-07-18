import { Camera, Geometry, Mesh, Program, Renderer, Transform } from "ogl";
import { useEffect, useRef } from "react";

import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

interface ParticlesProps {
  className?: string;
  particleCount?: number;
  particleColor?: [number, number, number];
  particleBaseSize?: number;
  speed?: number;
}

const vertex = `
  attribute vec3 position;
  attribute float aScale;
  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uTime;
  uniform float uSize;

  void main() {
    vec3 pos = position;
    pos.y += sin(uTime * 0.2 + pos.x * 4.0) * 0.06;
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = uSize * aScale * (1.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragment = `
  precision highp float;
  uniform vec3 uColor;

  void main() {
    vec2 uv = gl_PointCoord.xy - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.0, d) * 0.5;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

export function Particles({
  className = "",
  particleCount = 180,
  particleColor = [0.545, 0.361, 0.965],
  particleBaseSize = 55,
  speed = 0.3,
}: ParticlesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    const container = containerRef.current;
    if (!container) return;

    let frameId: number | undefined;
    let renderer: Renderer | undefined;
    let cleanupResize: (() => void) | undefined;

    try {
      renderer = new Renderer({ alpha: true, antialias: true, dpr: Math.min(window.devicePixelRatio, 2) });
      const gl = renderer.gl;
      gl.canvas.style.position = "absolute";
      gl.canvas.style.inset = "0";
      gl.canvas.style.width = "100%";
      gl.canvas.style.height = "100%";
      container.appendChild(gl.canvas);

      const camera = new Camera(gl, { fov: 35 });
      camera.position.set(0, 0, 6);

      const scene = new Transform();

      const positions = new Float32Array(particleCount * 3);
      const scales = new Float32Array(particleCount);
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3 + 0] = (Math.random() - 0.5) * 10;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
        scales[i] = Math.random() * 0.6 + 0.4;
      }

      const geometry = new Geometry(gl, {
        position: { size: 3, data: positions },
        aScale: { size: 1, data: scales },
      });

      const program = new Program(gl, {
        vertex,
        fragment,
        uniforms: {
          uTime: { value: 0 },
          uSize: { value: particleBaseSize },
          uColor: { value: particleColor },
        },
        transparent: true,
        depthTest: false,
      });

      const points = new Mesh(gl, { mode: gl.POINTS, geometry, program });
      points.setParent(scene);

      const resize = () => {
        const { clientWidth, clientHeight } = container;
        if (clientWidth === 0 || clientHeight === 0 || !renderer) return;
        renderer.setSize(clientWidth, clientHeight);
        camera.perspective({ aspect: clientWidth / clientHeight });
      };
      resize();
      window.addEventListener("resize", resize);
      cleanupResize = () => window.removeEventListener("resize", resize);

      let time = 0;
      const update = () => {
        frameId = requestAnimationFrame(update);
        time += speed * 0.016;
        program.uniforms.uTime.value = time;
        points.rotation.y += 0.0006;
        renderer!.render({ scene, camera });
      };
      frameId = requestAnimationFrame(update);
    } catch {
      // WebGL unavailable — fail silently, this is a purely decorative backdrop.
    }

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      cleanupResize?.();
      if (renderer) {
        try {
          container.removeChild(renderer.gl.canvas);
          renderer.gl.getExtension("WEBGL_lose_context")?.loseContext();
        } catch {
          // canvas already removed or context already lost
        }
      }
    };
  }, [reducedMotion, particleCount, particleBaseSize, speed, particleColor]);

  if (reducedMotion) return null;

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    />
  );
}
