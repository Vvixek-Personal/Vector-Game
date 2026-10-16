import React, { useRef, useEffect } from "react";
import { SPIN_SLICES, type SpinReward } from "../../game/spin";

interface CanvasWheelProps {
  rotation: number;
  highlightedIndex?: number | null;
  size?: number;
}

export const CanvasSpinWheel: React.FC<CanvasWheelProps> = ({
  rotation,
  highlightedIndex = null,
  size = 360,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Support High-DPI screens without pixelation or lag
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const center = size / 2;
    const radius = center - 8;
    const numSlices = SPIN_SLICES.length;
    const sliceAngle = (2 * Math.PI) / numSlices;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.translate(center, center);
    // Convert degrees to radians
    ctx.rotate((rotation * Math.PI) / 180);

    // Draw Wheel Sectors
    for (let i = 0; i < numSlices; i++) {
      const slice = SPIN_SLICES[i];
      const startAngle = i * sliceAngle - Math.PI / 2;
      const endAngle = startAngle + sliceAngle;
      const isWinner = highlightedIndex === i;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();

      // Sector Gradient
      const grad = ctx.createRadialGradient(0, 0, 15, 0, 0, radius);
      if (isWinner) {
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(0.3, slice.accent);
        grad.addColorStop(1, slice.color);
      } else {
        grad.addColorStop(0, slice.accent);
        grad.addColorStop(0.4, slice.color);
        grad.addColorStop(1, "#090d16");
      }
      ctx.fillStyle = grad;
      ctx.fill();

      // Wedge Border separator
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
      ctx.stroke();

      // Draw Sector Label & Icon
      ctx.save();
      const midAngle = startAngle + sliceAngle / 2;
      ctx.rotate(midAngle);

      // Radial position for text
      const textDist = radius * 0.68;
      ctx.translate(textDist, 0);
      ctx.rotate(Math.PI / 2); // Orient upright outward

      // Main Label
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 13px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
      ctx.shadowBlur = 4;
      ctx.fillText(slice.label, 0, -5);

      // Sublabel
      ctx.fillStyle = slice.accent || "#93c5fd";
      ctx.font = "700 8.5px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif";
      ctx.shadowBlur = 2;
      ctx.fillText(slice.sublabel.toUpperCase(), 0, 8);

      ctx.restore();
    }

    // Outer Rim Glow within canvas
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(251, 191, 36, 0.4)";
    ctx.stroke();

    ctx.restore();

    // Center Hub (non-rotating or static center)
    ctx.save();
    ctx.translate(center, center);

    // Hub Outer Shadow ring
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.fillStyle = "#0f172a";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#f59e0b";
    ctx.shadowColor = "rgba(245, 158, 11, 0.6)";
    ctx.shadowBlur = 12;
    ctx.stroke();

    // Inner glowing core
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    const coreGrad = ctx.createLinearGradient(-18, -18, 18, 18);
    coreGrad.addColorStop(0, "#fbbf24");
    coreGrad.addColorStop(1, "#f59e0b");
    ctx.fillStyle = coreGrad;
    ctx.shadowBlur = 0;
    ctx.fill();

    // Core symbol ✦
    ctx.fillStyle = "#18181b";
    ctx.font = "900 13px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✦", 0, 1);

    ctx.restore();
  }, [rotation, highlightedIndex, size]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: "block",
      }}
      className="spin-canvas-container"
    />
  );
};
