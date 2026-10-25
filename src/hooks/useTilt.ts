import { useState, useRef, useCallback, type MouseEvent, type TouchEvent } from "react";

interface TiltOptions {
  maxTilt?: number; // max tilt degrees (default 10)
  perspective?: number; // CSS perspective in px (default 800)
  scale?: number; // scale on hover (default 1.02)
  disabled?: boolean;
}

export function useTilt({ maxTilt = 10, perspective = 800, scale = 1.02, disabled = false }: TiltOptions = {}) {
  const [transform, setTransform] = useState<string>("perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
  const [glare, setGlare] = useState<{ x: number; y: number; opacity: number }>({ x: 50, y: 50, opacity: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const handlePointerMove = useCallback(
    (e: MouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>) => {
      if (disabled || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const px = Math.min(1, Math.max(0, x / rect.width));
      const py = Math.min(1, Math.max(0, y / rect.height));

      // Calculate tilt angles: tilt around X is driven by Y coordinate, around Y by X coordinate
      const rotX = (0.5 - py) * (maxTilt * 2);
      const rotY = (px - 0.5) * (maxTilt * 2);

      setTransform(
        `perspective(${perspective}px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale3d(${scale}, ${scale}, 1)`
      );
      setGlare({
        x: Math.round(px * 100),
        y: Math.round(py * 100),
        opacity: 0.18,
      });
    },
    [disabled, maxTilt, perspective, scale]
  );

  const handlePointerLeave = useCallback(() => {
    if (disabled) return;
    setTransform(`perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`);
    setGlare((prev) => ({ ...prev, opacity: 0 }));
  }, [disabled, perspective]);

  return {
    ref,
    tiltProps: {
      onMouseMove: handlePointerMove,
      onMouseLeave: handlePointerLeave,
      onTouchMove: handlePointerMove,
      onTouchEnd: handlePointerLeave,
      onTouchCancel: handlePointerLeave,
      style: {
        transform,
        transformStyle: "preserve-3d" as const,
        transition: "transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.18s ease",
        willChange: "transform",
      },
    },
    glareStyle: {
      background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255, 255, 255, ${glare.opacity}) 0%, transparent 60%)`,
      pointerEvents: "none" as const,
      transition: "opacity 0.22s ease",
    },
  };
}
