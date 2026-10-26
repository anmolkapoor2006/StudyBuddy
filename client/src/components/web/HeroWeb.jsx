import { useTheme } from "../../context/ThemeContext";

/**
 * HeroWeb: Signature agency-grade cobweb for the Web theme.
 * - 8 radial strands, 6 sagging concentric rings (quadratic beziers)
 * - 1.25px stroke, bone (#f1e8da) at 28% opacity fading to 0% via radial mask
 * - Top-right (520px) or Bottom-left (240px)
 * - Smooth draw-in over 900ms on load (staggered rings by 60ms)
 * - Pointer-events-none, never blocks controls or text
 */
export default function HeroWeb({ position = "tr", size = 520, className = "" }) {
  const { isWeb } = useTheme();

  if (!isWeb) return null;

  const isTR = position === "tr";
  const opacity = isTR ? 0.28 : 0.18;
  const maskId = `hero-web-mask-${position}`;
  const gradId = `hero-web-grad-${position}`;

  // Dimensions
  const w = size;
  const h = size;

  // For top-right corner: origin is at (w, 0).
  // Strands radiate outward into the box (toward bottom and left).
  // 8 radial strands:
  // Strand 1: down right edge: (w, 0) -> (w, h)
  // Strand 2: (w, 0) -> (w * 0.88, h)
  // Strand 3: (w, 0) -> (w * 0.72, h * 0.95)
  // Strand 4: (w, 0) -> (w * 0.52, h * 0.86)
  // Strand 5: (w, 0) -> (w * 0.34, h * 0.70)
  // Strand 6: (w, 0) -> (w * 0.18, h * 0.50)
  // Strand 7: (w, 0) -> (0, h * 0.28)
  // Strand 8: left top edge: (w, 0) -> (0, 0)

  // 6 Concentric Sagging Rings (radii fractions: 0.18, 0.32, 0.48, 0.64, 0.80, 0.96)
  const ringFactors = [0.18, 0.32, 0.48, 0.64, 0.80, 0.96];

  // Radial angles in radians from 90° (down) to 180° (left)
  // Angles in degrees: 90, 103, 116, 129, 142, 155, 168, 180
  const anglesDeg = [90, 102.8, 115.7, 128.5, 141.4, 154.2, 167.1, 180];
  const anglesRad = anglesDeg.map((d) => (d * Math.PI) / 180);

  // Generate sagging ring path for each ring radius
  // Center is (w, 0)
  const ringPaths = ringFactors.map((rFrac) => {
    const r = w * rFrac;
    // Points along each radial strand for this radius
    const pts = anglesRad.map((a) => {
      // In cartesian where origin is (w, 0):
      // x = w + r * cos(a), y = r * sin(a)
      // Since cos(90..180) is negative, x is < w. sin(90..180) is positive, y is > 0.
      return {
        x: Math.round(w + r * Math.cos(a)),
        y: Math.round(r * Math.sin(a)),
      };
    });

    // Connect with quadratic curves that sag toward center (w, 0)
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      // Midpoint between p1 and p2
      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2;
      // Pull control point slightly toward origin (w, 0) for natural gravitational sag
      const sagAmount = 0.12; // 12% sag toward center
      const cx = mx + (w - mx) * sagAmount;
      const cy = my + (0 - my) * sagAmount;
      d += ` Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${p2.x} ${p2.y}`;
    }
    return d;
  });

  const posClasses = isTR
    ? "top-0 right-0"
    : "bottom-0 left-0 scale-x-[-1] scale-y-[-1]";

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute z-0 select-none overflow-hidden ${posClasses} ${className}`}
      style={{ width: `${w}px`, height: `${h}px` }}
    >
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          {/* Radial gradient mask: bone opacity at origin, fading out toward 0% */}
          <radialGradient
            id={gradId}
            cx={w}
            cy="0"
            r={w}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="white" stopOpacity={opacity} />
            <stop offset="50%" stopColor="white" stopOpacity={opacity * 0.75} />
            <stop offset="80%" stopColor="white" stopOpacity={opacity * 0.3} />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id={maskId}>
            <rect width={w} height={h} fill={`url(#${gradId})`} />
          </mask>
        </defs>

        <g mask={`url(#${maskId})`}>
          {/* 8 Radial Strands */}
          {anglesRad.map((a, i) => {
            const endX = Math.round(w + w * Math.cos(a));
            const endY = Math.round(w * Math.sin(a));
            return (
              <line
                key={`strand-${i}`}
                x1={w}
                y1="0"
                x2={endX}
                y2={endY}
                stroke="var(--web-strand-color)"
                strokeWidth="1.25"
                className="hero-web-strand"
                style={{
                  strokeDasharray: 750,
                  strokeDashoffset: 0,
                  animation: `webStrandDraw 900ms cubic-bezier(0.16, 1, 0.3, 1) forwards`,
                }}
              />
            );
          })}

          {/* 6 Sagging Concentric Rings */}
          {ringPaths.map((pathD, idx) => (
            <path
              key={`ring-${idx}`}
              d={pathD}
              stroke="var(--web-strand-color)"
              strokeWidth="1.25"
              fill="none"
              className="hero-web-ring"
              style={{
                strokeDasharray: 900,
                strokeDashoffset: 0,
                animation: `webRingDraw 900ms cubic-bezier(0.16, 1, 0.3, 1) ${
                  idx * 60
                }ms forwards`,
              }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
