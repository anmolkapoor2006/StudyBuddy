import { useEffect, useRef, useCallback } from "react";

/**
 * useCanvasLoop: Shared canvas lifecycle hook.
 * Handles:
 * - DPR scaling capped at 2
 * - ResizeObserver & canvas buffer sync
 * - Delta-time rAF loop with frame capping (dt <= 0.1s)
 * - Pause on document.hidden (visibilitychange)
 * - Pause when off-screen (IntersectionObserver)
 * - prefers-reduced-motion & animated flag (static draw only when disabled)
 * - MutationObserver on <html> to re-read CSS tokens on theme/skin switch with 0 flash
 * - Comprehensive cleanup on unmount
 */
export function useCanvasLoop({
  canvasRef,
  onFrame,
  onResize,
  tokenNames = [],
  animated = true,
}) {
  const colorsRef = useRef({});
  const dimensionsRef = useRef({ width: 0, height: 0 });
  const isVisibleRef = useRef(true);
  const isIntersectingRef = useRef(true);
  const prefersReducedMotionRef = useRef(false);
  const isMotionAllowedRef = useRef(true);
  const renderStaticFrameRef = useRef(null);
  const rafIdRef = useRef(null);
  const lastTimeRef = useRef(0);
  const totalTimeRef = useRef(0);

  // Helper to read current computed CSS tokens from <html>
  const readTokens = useCallback(() => {
    if (typeof window === "undefined" || !tokenNames.length) return {};
    const cs = getComputedStyle(document.documentElement);
    const next = {};
    for (const name of tokenNames) {
      next[name] = cs.getPropertyValue(name).trim();
    }
    colorsRef.current = next;
    return next;
  }, [tokenNames]);

  // Initial token read and MutationObserver for instant theme/skin color changes
  useEffect(() => {
    readTokens();

    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      readTokens();
      if (!isMotionAllowedRef.current && renderStaticFrameRef.current) {
        renderStaticFrameRef.current();
      }
    });

    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "data-skin"],
    });

    return () => {
      observer.disconnect();
    };
  }, [readTokens]);

  // Track prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotionRef.current = mql.matches;

    const handler = (e) => {
      prefersReducedMotionRef.current = e.matches;
    };

    if (mql.addEventListener) {
      mql.addEventListener("change", handler);
    } else {
      mql.addListener(handler);
    }

    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener("change", handler);
      } else {
        mql.removeListener(handler);
      }
    };
  }, []);

  // Main rendering and animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Trigger single static frame
    const renderStaticFrame = () => {
      const { width, height } = dimensionsRef.current;
      if (width === 0 || height === 0) return;
      if (onFrame) {
        onFrame(ctx, width, height, 0, 0, colorsRef.current, false);
      }
    };

    // Update canvas size with DPR <= 2
    const updateSize = () => {
      const parent = canvas.parentElement || canvas;
      const rect = parent.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width || window.innerWidth));
      const height = Math.max(1, Math.floor(rect.height || window.innerHeight));

      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      dimensionsRef.current = { width, height };

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (onResize) {
        onResize(width, height, dpr);
      }

      // Render static view immediately
      renderStaticFrame();
    };

    updateSize();

    // ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }
    window.addEventListener("resize", updateSize, { passive: true });

    // IntersectionObserver to pause loop off-screen
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        isIntersectingRef.current = Boolean(entry && entry.isIntersecting);
      },
      { threshold: 0 }
    );
    intersectionObserver.observe(canvas);

    // VisibilityChange to pause when tab is hidden
    const handleVisibility = () => {
      isVisibleRef.current = !document.hidden;
      if (isVisibleRef.current) {
        lastTimeRef.current = performance.now();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Delta-time rAF loop
    let running = true;
    const loop = (now) => {
      if (!running) return;

      if (!lastTimeRef.current) {
        lastTimeRef.current = now;
      }

      const rawDt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      // Cap delta time to 100ms to avoid warp jumps on tab resume
      const dt = Math.min(rawDt, 0.1);

      const isMotionAllowed = animated && !prefersReducedMotionRef.current;
      const canRender = isVisibleRef.current && isIntersectingRef.current;

      if (canRender) {
        const { width, height } = dimensionsRef.current;
        if (width > 0 && height > 0 && onFrame) {
          if (isMotionAllowed) {
            totalTimeRef.current += dt;
            onFrame(ctx, width, height, dt, totalTimeRef.current, colorsRef.current, true);
          } else {
            onFrame(ctx, width, height, 0, totalTimeRef.current, colorsRef.current, false);
          }
        }
      }

      // If motion is allowed, keep looping; otherwise draw once
      if (isMotionAllowed) {
        rafIdRef.current = requestAnimationFrame(loop);
      }
    };

    const isMotionAllowed = animated && !prefersReducedMotionRef.current;
    isMotionAllowedRef.current = isMotionAllowed;
    renderStaticFrameRef.current = renderStaticFrame;

    if (isMotionAllowed) {
      lastTimeRef.current = performance.now();
      rafIdRef.current = requestAnimationFrame(loop);
    } else {
      renderStaticFrame();
    }

    return () => {
      running = false;
      renderStaticFrameRef.current = null;
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener("resize", updateSize);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [canvasRef, onFrame, onResize, animated]);

  return { dimensionsRef };
}
