import { useRef, useCallback } from "react";
import { useCanvasLoop } from "./useCanvasLoop";

const TOKEN_NAMES = [
  "--grid-bg",
  "--grid-line",
  "--grid-pulse-a",
  "--grid-pulse-b",
  "--grid-node-glow",
  "--grid-pulse-opacity",
];

/**
 * CircuitGrid: Animated background for Basic skin.
 * - Square grid (~96px spacing), 1px lines in --grid-line
 * - Pulses traveling along lines at 40-140 px/s with 40-120px gradient tail and ~3px head dot
 * - Alternating --grid-pulse-a (~60%) and --grid-pulse-b (~40%)
 * - Soft radial node glow at intersections decaying in ~600ms
 * - 0 raw colors in code; all colors read at runtime via CSS tokens
 */
export default function CircuitGrid({
  spacing = 96,
  pulseCount,
  animated = true,
  className = "",
}) {
  const canvasRef = useRef(null);
  const offscreenGridRef = useRef(null);
  const pulsesRef = useRef([]);
  const glowsRef = useRef([]);

  // Initialize or respawn a pulse
  const createPulse = useCallback(
    (width, height, isInitial = false) => {
      const numCols = Math.max(1, Math.floor(width / spacing));
      const numRows = Math.max(1, Math.floor(height / spacing));

      const isHorizontal = Math.random() > 0.5;
      const isTypeA = Math.random() < 0.6; // ~60% pulse A, ~40% pulse B

      const speed = 40 + Math.random() * 100; // 40-140 px/s
      const tailLength = 40 + Math.random() * 80; // 40-120px
      const cellSpan = 2 + Math.random() * 4; // 2-6 cells
      const maxDistance = cellSpan * spacing;
      const dir = Math.random() > 0.5 ? 1 : -1;

      let x, y;
      if (isHorizontal) {
        const row = Math.floor(Math.random() * (numRows + 1));
        y = row * spacing;
        x = isInitial
          ? Math.random() * width
          : dir === 1
          ? -tailLength
          : width + tailLength;
      } else {
        const col = Math.floor(Math.random() * (numCols + 1));
        x = col * spacing;
        y = isInitial
          ? Math.random() * height
          : dir === 1
          ? -tailLength
          : height + tailLength;
      }

      return {
        isHorizontal,
        isTypeA,
        x,
        y,
        prevX: x,
        prevY: y,
        dir,
        speed,
        tailLength,
        distanceTraveled: isInitial ? Math.random() * maxDistance : 0,
        maxDistance,
        delay: isInitial ? 0 : Math.random() * 2, // 0-2s respawn delay
      };
    },
    [spacing]
  );

  // Resize handler: Pre-render static grid on an offscreen canvas for max performance
  const handleResize = useCallback(
    (width, height) => {
      // Setup offscreen canvas for static grid
      const offCanvas = document.createElement("canvas");
      offCanvas.width = width;
      offCanvas.height = height;
      const offCtx = offCanvas.getContext("2d");

      if (offCtx) {
        // Will be drawn with current line color on demand
        offscreenGridRef.current = { canvas: offCanvas, width, height, dirty: true };
      }

      // Initialize pulse pool
      const count =
        typeof pulseCount === "number"
          ? pulseCount
          : width < 640
          ? 8
          : width < 1024
          ? 16
          : 28;

      const newPulses = [];
      for (let i = 0; i < count; i++) {
        newPulses.push(createPulse(width, height, true));
      }
      pulsesRef.current = newPulses;
      glowsRef.current = [];
    },
    [pulseCount, createPulse]
  );

  // Frame render callback
  const handleFrame = useCallback(
    (ctx, width, height, dt, time, colors, isMotion) => {
      ctx.clearRect(0, 0, width, height);

      // Optional background fill if specified in token
      const bgToken = colors["--grid-bg"];
      if (bgToken && bgToken !== "transparent") {
        ctx.fillStyle = bgToken;
        ctx.fillRect(0, 0, width, height);
      }

      const lineColor = colors["--grid-line"] || "";
      const pulseColorA = colors["--grid-pulse-a"] || "";
      const pulseColorB = colors["--grid-pulse-b"] || "";
      const glowColor = colors["--grid-node-glow"] || "";
      const opacityMultiplier = parseFloat(colors["--grid-pulse-opacity"] || "0.85");

      // 1. Draw Static Grid Lines (1px lines)
      ctx.save();
      ctx.beginPath();
      ctx.lineWidth = 1;
      ctx.strokeStyle = lineColor;

      // Vertical lines
      for (let x = 0; x <= width + spacing; x += spacing) {
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, height);
      }

      // Horizontal lines
      for (let y = 0; y <= height + spacing; y += spacing) {
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(width, y + 0.5);
      }
      ctx.stroke();
      ctx.restore();

      // If static / reduced-motion mode, skip pulses and node glows
      if (!isMotion) {
        return;
      }

      // 2. Update and Draw Node Glows (decay in ~600ms = 0.6s)
      const activeGlows = [];
      for (let i = 0; i < glowsRef.current.length; i++) {
        const glow = glowsRef.current[i];
        glow.age += dt;
        if (glow.age < glow.maxAge) {
          activeGlows.push(glow);

          const progress = glow.age / glow.maxAge;
          const alpha = (1 - progress) * opacityMultiplier;
          const radius = 6 + progress * 6; // soft expansion 6px -> 12px

          // Soft radial glow without shadowBlur
          const grad = ctx.createRadialGradient(glow.x, glow.y, 0, glow.x, glow.y, radius);
          grad.addColorStop(0, glowColor);
          grad.addColorStop(1, "transparent");

          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(glow.x, glow.y, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
      glowsRef.current = activeGlows;

      // 3. Update and Draw Pulses
      const pulses = pulsesRef.current;
      for (let i = 0; i < pulses.length; i++) {
        const p = pulses[i];

        if (p.delay > 0) {
          p.delay -= dt;
          continue;
        }

        const step = p.speed * dt;
        p.prevX = p.x;
        p.prevY = p.y;
        p.distanceTraveled += step;

        if (p.isHorizontal) {
          p.x += step * p.dir;

          // Check if crossed any grid line intersection
          const startX = Math.min(p.prevX, p.x);
          const endX = Math.max(p.prevX, p.x);
          const firstCol = Math.ceil(startX / spacing);
          const lastCol = Math.floor(endX / spacing);

          for (let col = firstCol; col <= lastCol; col++) {
            const crossX = col * spacing;
            if (crossX >= 0 && crossX <= width) {
              glowsRef.current.push({
                x: crossX,
                y: p.y,
                age: 0,
                maxAge: 0.6,
              });
            }
          }
        } else {
          p.y += step * p.dir;

          // Check if crossed any grid line intersection
          const startY = Math.min(p.prevY, p.y);
          const endY = Math.max(p.prevY, p.y);
          const firstRow = Math.ceil(startY / spacing);
          const lastRow = Math.floor(endY / spacing);

          for (let row = firstRow; row <= lastRow; row++) {
            const crossY = row * spacing;
            if (crossY >= 0 && crossY <= height) {
              glowsRef.current.push({
                x: p.x,
                y: crossY,
                age: 0,
                maxAge: 0.6,
              });
            }
          }
        }

        // Calculate opacity based on lifecycle (fade in at start, fade out at end)
        const lifeFrac = p.distanceTraveled / p.maxDistance;
        let pulseAlpha = 1;
        if (lifeFrac < 0.2) {
          pulseAlpha = lifeFrac / 0.2;
        } else if (lifeFrac > 0.7) {
          pulseAlpha = (1 - lifeFrac) / 0.3;
        }
        pulseAlpha = Math.max(0, Math.min(1, pulseAlpha)) * opacityMultiplier;

        const mainColor = p.isTypeA ? pulseColorA : pulseColorB;

        // Draw gradient tail + head dot
        ctx.save();
        ctx.globalAlpha = pulseAlpha;

        const tailX = p.isHorizontal ? p.x - p.tailLength * p.dir : p.x;
        const tailY = p.isHorizontal ? p.y : p.y - p.tailLength * p.dir;

        const grad = ctx.createLinearGradient(tailX, tailY, p.x, p.y);
        grad.addColorStop(0, "transparent");
        grad.addColorStop(1, mainColor);

        // Tail stroke
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = grad;
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        // Round head dot (~3px radius)
        ctx.fillStyle = mainColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();

        // Faux glow around head without shadowBlur
        ctx.beginPath();
        ctx.fillStyle = mainColor;
        ctx.globalAlpha = pulseAlpha * 0.35;
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Check if pulse has expired
        const isOutOfBounds =
          p.x < -p.tailLength - 50 ||
          p.x > width + p.tailLength + 50 ||
          p.y < -p.tailLength - 50 ||
          p.y > height + p.tailLength + 50;

        if (p.distanceTraveled >= p.maxDistance || isOutOfBounds) {
          pulses[i] = createPulse(width, height, false);
        }
      }
    },
    [spacing, createPulse]
  );

  useCanvasLoop({
    canvasRef,
    onFrame: handleFrame,
    onResize: handleResize,
    tokenNames: TOKEN_NAMES,
    animated,
  });

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none select-none ${className}`}
      aria-hidden="true"
    />
  );
}
