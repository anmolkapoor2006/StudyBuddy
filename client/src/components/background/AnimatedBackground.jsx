import { useTheme } from "../../context/ThemeContext";
import CircuitGrid from "./CircuitGrid";
import WebStrands from "./WebStrands";

/**
 * AnimatedBackground: Single host for Home/landing route animated backgrounds.
 * - Reads current skin from ThemeContext:
 *   - skin = "basic" -> CircuitGrid
 *   - skin = "web"   -> WebStrands
 * - Reads animatedBg setting from ThemeContext (localStorage, default On)
 *   - When Off, renders static layer only (no pulses, sway, dew, ripple)
 * - Fixed inset-0, z-0, pointer-events-none, aria-hidden
 * - All colors dynamically driven by CSS tokens at runtime
 */
export default function AnimatedBackground({
  gridSpacing = 96,
  pulseCount,
  mainRadiusFraction = 0.52,
  secondaryRadiusFraction = 0.28,
  strandOpacity = 1,
  spokeWidth = 1.1,
  ringWidth = 0.8,
  glowWidth = 3.5,
  centerDimStrength = 0.6,
  rippleIntervalMin = 8,
  rippleIntervalMax = 14,
  className = "",
}) {
  const { skin, animatedBg } = useTheme();

  return (
    <div
      className={`fixed inset-0 pointer-events-none z-0 overflow-hidden select-none ${className}`}
      aria-hidden="true"
    >
      {skin === "web" ? (
        <WebStrands
          mainRadiusFraction={mainRadiusFraction}
          secondaryRadiusFraction={secondaryRadiusFraction}
          pulseCount={pulseCount}
          strandOpacity={strandOpacity}
          spokeWidth={spokeWidth}
          ringWidth={ringWidth}
          glowWidth={glowWidth}
          centerDimStrength={centerDimStrength}
          rippleIntervalMin={rippleIntervalMin}
          rippleIntervalMax={rippleIntervalMax}
          animated={animatedBg}
        />
      ) : (
        <CircuitGrid
          spacing={gridSpacing}
          pulseCount={pulseCount}
          animated={animatedBg}
        />
      )}
    </div>
  );
}
