import { useRef, useCallback } from "react";
import { useCanvasLoop } from "./useCanvasLoop";

const TOKEN_NAMES = [
  "--web-bg-strand",
  "--web-bg-strand-opacity",
  "--web-bg-strand-opacity-outer",
  "--web-bg-strand-glow",
  "--strand-dot",
  "--web-pulse-a",
  "--web-pulse-b",
  "--web-dew",
  "--web-ripple",
  "--web-strand-color",
  "--strand-line",
];

/**
 * WebStrands: Living spider-web background for Web skin.
 * Features:
 * - Refined geometric orb web anchored at top-right (main) and bottom-left (secondary)
 * - Defined spoke vs ring hierarchy (spokes ~1.1px, rings ~0.8px; defined edge & center)
 * - Corner anchor radial falloff (emerges from corner, remains visible at outer edge)
 * - Subtle low-opacity halo stroke near anchor (dark mode only)
 * - Calm zone central radial mask to preserve 100% headline & text contrast
 * - Tiny node dots at strand crossings
 * - Traveling pulses, breathing sway, twinkling dew glints, vibration ripple
 * - 0 raw colors in code; all colors read at runtime via CSS tokens
 */
export default function WebStrands({
  mainRadiusFraction = 0.52,
  secondaryRadiusFraction = 0.28,
  pulseCount,
  strandOpacity = 1,
  spokeWidth = 1.1,
  ringWidth = 0.8,
  glowWidth = 3.5,
  centerDimStrength = 0.6,
  rippleIntervalMin = 8,
  rippleIntervalMax = 14,
  animated = true,
  className = "",
}) {
  const canvasRef = useRef(null);
  const websRef = useRef([]);
  const pulsesRef = useRef([]);
  const dewDropsRef = useRef([]);
  const rippleStateRef = useRef({
    active: false,
    webIndex: 0,
    elapsed: 0,
    duration: 1.5,
    nextTriggerTime: 8,
  });

  // Generate web geometry (computed once per resize)
  const generateWeb = useCallback((anchorX, anchorY, startAngleDeg, endAngleDeg, maxRadius, numSpokes, numRings) => {
    const spokes = [];
    const angleStep = (endAngleDeg - startAngleDeg) / (numSpokes - 1);

    for (let i = 0; i < numSpokes; i++) {
      // Small irregular angle variation for organic look
      const jitter = (Math.random() - 0.5) * (angleStep * 0.15);
      const angleDeg = startAngleDeg + i * angleStep + jitter;
      const angleRad = (angleDeg * Math.PI) / 180;
      spokes.push({
        index: i,
        angleRad,
        cos: Math.cos(angleRad),
        sin: Math.sin(angleRad),
      });
    }

    // Rings with natural spacing (closer near anchor, wider outward)
    const rings = [];
    const ringRadii = [];
    for (let r = 0; r < numRings; r++) {
      const frac = Math.pow((r + 1) / numRings, 1.25);
      const radius = maxRadius * frac;
      ringRadii.push(radius);

      const nodes = spokes.map((spoke) => {
        return {
          spokeIndex: spoke.index,
          baseRadius: radius,
          phase: Math.random() * Math.PI * 2,
          period: 6 + Math.random() * 6, // 6-12s drift period
          sagFactor: 0.05 + Math.random() * 0.04, // 5-9% inward sag
        };
      });

      rings.push({
        ringIndex: r,
        radius,
        nodes,
      });
    }

    return {
      anchorX,
      anchorY,
      maxRadius,
      spokes,
      rings,
      ringRadii,
    };
  }, []);

  // Initialize or respawn a pulse
  const createPulse = useCallback((webs, isInitial = false) => {
    if (!webs.length) return null;
    const webIndex = Math.random() < 0.75 ? 0 : 1; // 75% on main web
    const web = webs[webIndex] || webs[0];

    const isSpoke = Math.random() < 0.65; // 65% travel along radial spokes
    const isTypeA = Math.random() < 0.65; // ~65% pulse A, ~35% pulse B
    const speed = 30 + Math.random() * 60; // 30-90 px/s
    const tailLength = 20 + Math.random() * 25; // 20-45px tail

    if (isSpoke) {
      const spoke = web.spokes[Math.floor(Math.random() * web.spokes.length)];
      return {
        webIndex,
        isSpoke: true,
        spokeIndex: spoke.index,
        currentDist: isInitial ? Math.random() * web.maxRadius : 0,
        maxDist: web.maxRadius,
        speed,
        tailLength,
        isTypeA,
        delay: isInitial ? 0 : Math.random() * 2,
      };
    } else {
      const ring = web.rings[Math.floor(Math.random() * web.rings.length)];
      const direction = Math.random() > 0.5 ? 1 : -1;
      return {
        webIndex,
        isSpoke: false,
        ringIndex: ring.ringIndex,
        currentSpokeProgress: isInitial ? Math.random() * (web.spokes.length - 1) : (direction === 1 ? 0 : web.spokes.length - 1),
        maxSpokeIndex: web.spokes.length - 1,
        direction,
        speed: speed * 0.02, // spoke index per second
        tailLength,
        isTypeA,
        delay: isInitial ? 0 : Math.random() * 2,
      };
    }
  }, []);

  // Handle Resize: regenerate web structures
  const handleResize = useCallback((width, height) => {
    const webs = [];

    // 1. Main Web: Top-Right Corner
    const mainAnchorX = width + 5;
    const mainAnchorY = -5;
    const mainRadius = Math.max(width, height) * mainRadiusFraction;
    webs.push(generateWeb(mainAnchorX, mainAnchorY, 90, 180, mainRadius, 14, 10));

    // 2. Secondary Web: Bottom-Left Corner
    const secAnchorX = -5;
    const secAnchorY = height + 5;
    const secRadius = Math.max(width, height) * secondaryRadiusFraction;
    webs.push(generateWeb(secAnchorX, secAnchorY, 270, 360, secRadius, 12, 8));

    // 3. Optional Third Web on extra-wide screens (>1600px)
    if (width > 1600) {
      const thirdAnchorX = -5;
      const thirdAnchorY = -5;
      const thirdRadius = width * 0.22;
      webs.push(generateWeb(thirdAnchorX, thirdAnchorY, 0, 90, thirdRadius, 10, 7));
    }

    websRef.current = webs;

    // Pulse pool
    const count =
      typeof pulseCount === "number"
        ? pulseCount
        : width < 640
        ? 4
        : width < 1024
        ? 8
        : 14;

    const pulses = [];
    for (let i = 0; i < count; i++) {
      pulses.push(createPulse(webs, true));
    }
    pulsesRef.current = pulses.filter(Boolean);

    // Dew drops placed on strand crossings (~10-16 drops total)
    const dew = [];
    const numDew = width < 640 ? 8 : 14;
    for (let i = 0; i < numDew; i++) {
      const webIdx = Math.random() < 0.75 ? 0 : 1;
      const targetWeb = webs[webIdx] || webs[0];
      const spokeIdx = Math.floor(Math.random() * targetWeb.spokes.length);
      const ringIdx = 1 + Math.floor(Math.random() * (targetWeb.rings.length - 2));

      dew.push({
        webIndex: webIdx,
        spokeIndex: spokeIdx,
        ringIndex: ringIdx,
        size: 1.5 + Math.random() * 1.5, // 1.5 - 3px
        interval: 2 + Math.random() * 5, // 2-7s twinkle interval
        timer: Math.random() * 4,
        flashDuration: 0.8,
      });
    }
    dewDropsRef.current = dew;

    rippleStateRef.current = {
      active: false,
      webIndex: 0,
      elapsed: 0,
      duration: 1.5,
      nextTriggerTime: 8 + Math.random() * 4,
    };
  }, [mainRadiusFraction, secondaryRadiusFraction, pulseCount, generateWeb, createPulse]);

  // Frame render callback
  const handleFrame = useCallback((ctx, width, height, dt, time, colors, isMotion) => {
    ctx.clearRect(0, 0, width, height);

    const webs = websRef.current;
    if (!webs.length) return;

    const strandColor = colors["--web-bg-strand"] || colors["--strand-line"] || "";
    const baseOpacityInner = parseFloat(colors["--web-bg-strand-opacity"] || "0.32");
    const baseOpacityOuter = parseFloat(colors["--web-bg-strand-opacity-outer"] || "0.14");
    const glowColor = colors["--web-bg-strand-glow"] || "";
    const dotColor = colors["--strand-dot"] || colors["--web-bg-strand"] || "";
    const pulseColorA = colors["--web-pulse-a"] || "";
    const pulseColorB = colors["--web-pulse-b"] || "";
    const dewColor = colors["--web-dew"] || "";
    const rippleColor = colors["--web-ripple"] || "";

    // Update Ripple State
    const ripple = rippleStateRef.current;
    if (isMotion) {
      if (!ripple.active) {
        ripple.nextTriggerTime -= dt;
        if (ripple.nextTriggerTime <= 0) {
          ripple.active = true;
          ripple.webIndex = 0; // Trigger on main web
          ripple.elapsed = 0;
          ripple.nextTriggerTime = rippleIntervalMin + Math.random() * (rippleIntervalMax - rippleIntervalMin);
        }
      } else {
        ripple.elapsed += dt;
        if (ripple.elapsed >= ripple.duration) {
          ripple.active = false;
        }
      }
    }

    // Ripple wave fraction (0 -> 1 over 1.5s)
    const rippleFrac = ripple.active ? ripple.elapsed / ripple.duration : -1;

    // Helper: calculate displaced node position (sway + ripple)
    const getNodePos = (web, ring, spokeIndex, isSwayEnabled) => {
      const spoke = web.spokes[spokeIndex];
      const node = ring.nodes[spokeIndex];
      const r = ring.radius;

      let dr = 0;
      let dAngle = 0;

      if (isSwayEnabled) {
        // Breathing sway: 1-3px amplitude, 6-12s period
        const radiusFraction = r / web.maxRadius;
        const swayAmp = 0.5 + radiusFraction * 2.2; // 0 at anchor, up to ~2.7px outer
        dr = Math.sin(time * (Math.PI * 2 / node.period) + node.phase) * swayAmp;
        dAngle = Math.cos(time * (Math.PI * 2 / node.period) + node.phase) * 0.004;

        // Ripple displacement: +1.5px outward as ripple wave passes
        if (ripple.active && webs.indexOf(web) === ripple.webIndex) {
          const ringFrac = r / web.maxRadius;
          const distToWave = Math.abs(ringFrac - rippleFrac);
          if (distToWave < 0.1) {
            const rippleAmp = (1 - distToWave / 0.1) * 1.8;
            dr += rippleAmp;
          }
        }
      }

      const totalR = r + dr;
      const totalAngle = spoke.angleRad + dAngle;
      return {
        x: web.anchorX + totalR * Math.cos(totalAngle),
        y: web.anchorY + totalR * Math.sin(totalAngle),
      };
    };

    // 1. Draw Webs (Glow, Spokes, Rings, Node Dots)
    webs.forEach((web) => {
      // A. Subtle low-opacity halo stroke near anchor (dark mode only)
      if (glowColor && glowColor !== "transparent" && glowWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.lineWidth = glowWidth;
        ctx.strokeStyle = glowColor;
        ctx.globalAlpha = baseOpacityInner * 0.65 * strandOpacity;

        // Innermost spoke segments
        const innerSpokeRing = web.rings[Math.min(2, web.rings.length - 1)];
        web.spokes.forEach((spoke) => {
          const innerNode = getNodePos(web, innerSpokeRing, spoke.index, isMotion);
          ctx.moveTo(web.anchorX, web.anchorY);
          ctx.lineTo(innerNode.x, innerNode.y);
        });

        // Innermost 2 rings
        for (let r = 0; r < Math.min(2, web.rings.length); r++) {
          const ring = web.rings[r];
          for (let s = 0; s < web.spokes.length - 1; s++) {
            const ptA = getNodePos(web, ring, s, isMotion);
            const ptB = getNodePos(web, ring, s + 1, isMotion);
            const midX = (ptA.x + ptB.x) / 2;
            const midY = (ptA.y + ptB.y) / 2;
            const sag = ring.nodes[s].sagFactor;
            const ctrlX = midX + (web.anchorX - midX) * sag;
            const ctrlY = midY + (web.anchorY - midY) * sag;
            ctx.moveTo(ptA.x, ptA.y);
            ctx.quadraticCurveTo(ctrlX, ctrlY, ptB.x, ptB.y);
          }
        }
        ctx.stroke();
        ctx.restore();
      }

      // B. Radial Spokes (slightly thicker ~1.1px and brighter than rings)
      ctx.save();
      ctx.beginPath();
      ctx.lineWidth = spokeWidth;
      ctx.strokeStyle = strandColor;
      const avgSpokeAlpha = ((baseOpacityInner * 0.6 + baseOpacityOuter * 0.4)) * 1.15 * strandOpacity;
      ctx.globalAlpha = Math.min(1, avgSpokeAlpha);

      const outerRing = web.rings[web.rings.length - 1];
      web.spokes.forEach((spoke) => {
        const outerNode = getNodePos(web, outerRing, spoke.index, isMotion);
        ctx.moveTo(web.anchorX, web.anchorY);
        ctx.lineTo(outerNode.x, outerNode.y);
      });
      ctx.stroke();
      ctx.restore();

      // C. Concentric Sagging Rings (spoke/ring hierarchy + defined center and edge)
      web.rings.forEach((ring, rIdx) => {
        const frac = ring.radius / web.maxRadius;
        // Radial falloff: strongest at anchor (baseOpacityInner) fading to outer edge (baseOpacityOuter)
        let alpha = (baseOpacityInner * (1 - frac) + baseOpacityOuter * frac) * strandOpacity;
        let strokeW = ringWidth;

        // Outermost ring and 2-3 rings nearest anchor are slightly brighter for defined structure
        if (rIdx < 3) {
          alpha *= 1.25;
          strokeW = ringWidth * 1.15;
        } else if (rIdx === web.rings.length - 1) {
          alpha *= 1.20;
          strokeW = ringWidth * 1.18;
        }

        ctx.save();
        ctx.beginPath();
        ctx.lineWidth = strokeW;
        ctx.strokeStyle = strandColor;
        ctx.globalAlpha = Math.min(1, alpha);

        for (let s = 0; s < web.spokes.length - 1; s++) {
          const ptA = getNodePos(web, ring, s, isMotion);
          const ptB = getNodePos(web, ring, s + 1, isMotion);

          // Control point with gentle inward sag towards anchor
          const midX = (ptA.x + ptB.x) / 2;
          const midY = (ptA.y + ptB.y) / 2;
          const sag = ring.nodes[s].sagFactor;
          const ctrlX = midX + (web.anchorX - midX) * sag;
          const ctrlY = midY + (web.anchorY - midY) * sag;

          ctx.moveTo(ptA.x, ptA.y);
          ctx.quadraticCurveTo(ctrlX, ctrlY, ptB.x, ptB.y);
        }
        ctx.stroke();
        ctx.restore();
      });

      // D. Node Dots at Crossing Points (1.5-2px, brighter near anchor)
      if (dotColor) {
        ctx.save();
        ctx.fillStyle = dotColor;

        web.rings.forEach((ring) => {
          const frac = ring.radius / web.maxRadius;
          const dotAlpha = (baseOpacityInner * (1 - frac) + baseOpacityOuter * frac) * 1.35 * strandOpacity;
          const dotRadius = 1.8 * (1 - frac) + 1.1 * frac; // 1.8px near anchor down to 1.1px outer
          ctx.globalAlpha = Math.min(1, dotAlpha);

          for (let s = 0; s < web.spokes.length; s++) {
            const pos = getNodePos(web, ring, s, isMotion);
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, dotRadius, 0, Math.PI * 2);
            ctx.fill();
          }
        });
        ctx.restore();
      }

      // E. Ripple Wave Glow Highlight
      if (isMotion && ripple.active && webs.indexOf(web) === ripple.webIndex) {
        const activeRingIndex = Math.floor(rippleFrac * web.rings.length);
        const ring = web.rings[activeRingIndex];
        if (ring) {
          ctx.save();
          ctx.beginPath();
          ctx.lineWidth = ringWidth * 1.6;
          ctx.strokeStyle = rippleColor;
          ctx.globalAlpha = 0.55 * (1 - Math.abs(rippleFrac - 0.5) * 2);

          for (let s = 0; s < web.spokes.length - 1; s++) {
            const ptA = getNodePos(web, ring, s, true);
            const ptB = getNodePos(web, ring, s + 1, true);
            const midX = (ptA.x + ptB.x) / 2;
            const midY = (ptA.y + ptB.y) / 2;
            const sag = ring.nodes[s].sagFactor;
            const ctrlX = midX + (web.anchorX - midX) * sag;
            const ctrlY = midY + (web.anchorY - midY) * sag;
            ctx.moveTo(ptA.x, ptA.y);
            ctx.quadraticCurveTo(ctrlX, ctrlY, ptB.x, ptB.y);
          }
          ctx.stroke();
          ctx.restore();
        }
      }
    });

    // 2. Calm Zone: Soft Radial Dimming over Central Headline & Copy Area
    if (centerDimStrength > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      const centerX = width * 0.5;
      const centerY = height * 0.38;
      const dimRadius = Math.min(width, height) * 0.44;
      ctx.globalAlpha = centerDimStrength * 0.75;
      const dimGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, dimRadius);
      dimGrad.addColorStop(0, "black");
      dimGrad.addColorStop(0.55, "black");
      dimGrad.addColorStop(1, "transparent");
      ctx.fillStyle = dimGrad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // If static / reduced-motion mode, skip pulses, dew flashes, and ripples
    if (!isMotion) {
      return;
    }

    // 3. Dew Drops & Twinkling Glints
    const dews = dewDropsRef.current;
    dews.forEach((dew) => {
      dew.timer += dt;
      if (dew.timer >= dew.interval + dew.flashDuration) {
        dew.timer = 0;
      }

      const web = webs[dew.webIndex] || webs[0];
      const ring = web.rings[dew.ringIndex];
      if (!ring) return;

      const pos = getNodePos(web, ring, dew.spokeIndex, true);

      // Base dew drop
      ctx.save();
      ctx.fillStyle = strandColor;
      ctx.globalAlpha = baseOpacityInner * 1.2;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 1.3, 0, Math.PI * 2);
      ctx.fill();

      // Twinkle flash
      if (dew.timer > dew.interval) {
        const flashAge = dew.timer - dew.interval;
        const flashProgress = flashAge / dew.flashDuration;
        const flashAlpha = Math.sin(flashProgress * Math.PI); // 0 -> 1 -> 0

        const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, dew.size * 2);
        grad.addColorStop(0, dewColor);
        grad.addColorStop(1, "transparent");

        ctx.globalAlpha = flashAlpha * 0.95;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, dew.size * 2, 0, Math.PI * 2);
        ctx.fill();

        // Pinpoint bright center
        ctx.fillStyle = dewColor;
        ctx.globalAlpha = flashAlpha;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    // 4. Strand Pulses (traveling strictly along spokes or around sagging rings)
    const pulses = pulsesRef.current;
    pulses.forEach((p, idx) => {
      if (p.delay > 0) {
        p.delay -= dt;
        return;
      }

      const web = webs[p.webIndex] || webs[0];
      const mainColor = p.isTypeA ? pulseColorA : pulseColorB;

      if (p.isSpoke) {
        p.currentDist += p.speed * dt;
        const spoke = web.spokes[p.spokeIndex];
        if (!spoke) return;

        const headX = web.anchorX + p.currentDist * spoke.cos;
        const headY = web.anchorY + p.currentDist * spoke.sin;
        const tailDist = Math.max(0, p.currentDist - p.tailLength);
        const tailX = web.anchorX + tailDist * spoke.cos;
        const tailY = web.anchorY + tailDist * spoke.sin;

        const lifeFrac = p.currentDist / p.maxDist;
        const alpha = lifeFrac < 0.2 ? lifeFrac / 0.2 : lifeFrac > 0.8 ? (1 - lifeFrac) / 0.2 : 1;

        // Pulses are rendered at higher alpha (0.95) to remain distinctly noticeable over strands
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha)) * 0.95;

        const grad = ctx.createLinearGradient(tailX, tailY, headX, headY);
        grad.addColorStop(0, "transparent");
        grad.addColorStop(1, mainColor);

        ctx.beginPath();
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = grad;
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(headX, headY);
        ctx.stroke();

        ctx.fillStyle = mainColor;
        ctx.beginPath();
        ctx.arc(headX, headY, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (p.currentDist >= p.maxDist) {
          pulses[idx] = createPulse(webs, false);
        }
      } else {
        p.currentSpokeProgress += p.speed * p.direction * dt;
        const ring = web.rings[p.ringIndex];
        if (!ring) return;

        const currIndex = Math.floor(p.currentSpokeProgress);
        const nextIndex = Math.min(web.spokes.length - 1, Math.max(0, currIndex + 1));
        const frac = p.currentSpokeProgress - currIndex;

        if (currIndex >= 0 && currIndex < web.spokes.length) {
          const ptA = getNodePos(web, ring, currIndex, true);
          const ptB = getNodePos(web, ring, nextIndex, true);
          const headX = ptA.x + (ptB.x - ptA.x) * frac;
          const headY = ptA.y + (ptB.y - ptA.y) * frac;

          ctx.save();
          ctx.globalAlpha = 0.95;
          ctx.fillStyle = mainColor;
          ctx.beginPath();
          ctx.arc(headX, headY, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        if (p.currentSpokeProgress <= 0 || p.currentSpokeProgress >= p.maxSpokeIndex) {
          pulses[idx] = createPulse(webs, false);
        }
      }
    });
  }, [
    strandOpacity,
    spokeWidth,
    ringWidth,
    glowWidth,
    centerDimStrength,
    rippleIntervalMin,
    rippleIntervalMax,
    createPulse,
  ]);

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
