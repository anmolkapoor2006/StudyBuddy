import { useTheme } from "../../context/ThemeContext";

/**
 * StrandDivider: Replaces plain hr / border dividers under Web theme.
 * Renders a 1px strand line with node dots spaced every 120px.
 */
export default function StrandDivider({ className = "" }) {
  const { isWeb } = useTheme();

  if (!isWeb) {
    return <hr className={`border-neutral-800 my-4 ${className}`} />;
  }

  return (
    <div
      role="separator"
      className={`relative w-full h-[3px] my-4 flex items-center overflow-hidden ${className}`}
    >
      {/* 1px Bone strand line */}
      <div className="absolute inset-x-0 top-1/2 h-[1px] -translate-y-1/2 bg-[var(--strand-line)]" />

      {/* Repeating node dots every 120px */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--strand-dot) 1.5px, transparent 1.5px)",
          backgroundSize: "120px 100%",
          backgroundPosition: "center",
          backgroundRepeat: "repeat-x",
        }}
      />
    </div>
  );
}
