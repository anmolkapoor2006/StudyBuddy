import { Code2 } from "lucide-react";

/**
 * StudyBuddy Official Brand Logo:
 * - Crisp, perfectly proportioned squircle with signature gradient (#BA3C3C -> #E04D4D)
 * - Centered white Code2 (</>) emblem with balanced line weight
 * - Subtle inner ring highlight and rich brand ambient glow
 * - 100% immune to clip-path or chamfer distortion
 */
export default function Logo({
  size = "md",
  className = "",
  showText = false,
  textClassName = "",
  subtitle = false,
}) {
  const sizeMap = {
    xs: { box: "w-6 h-6 rounded-md", icon: "w-3.5 h-3.5", stroke: 2.5 },
    sm: { box: "w-7.5 h-7.5 rounded-lg", icon: "w-4 h-4", stroke: 2.5 },
    md: { box: "w-9 h-9 rounded-xl", icon: "w-5 h-5", stroke: 2.5 },
    lg: { box: "w-12 h-12 rounded-2xl", icon: "w-6.5 h-6.5", stroke: 2.6 },
    xl: { box: "w-14 h-14 rounded-2xl", icon: "w-7.5 h-7.5", stroke: 2.6 },
  };

  const current = sizeMap[size] || sizeMap.md;

  return (
    <div className={`brand-logo flex items-center gap-3 shrink-0 select-none ${className}`}>
      {/* Official Emblem Container */}
      <div
        data-logo="true"
        className={`brand-logo relative ${current.box} bg-gradient-to-br from-[#BA3C3C] via-[#CD4343] to-[#E04D4D] flex items-center justify-center text-white shrink-0 shadow-[0_4px_20px_rgba(224,77,77,0.38)] ring-1 ring-white/20 transition-transform duration-200 group-hover:scale-105`}
        style={{
          clipPath: "none",
          WebkitClipPath: "none",
          borderRadius: size === "xs" ? "6px" : size === "sm" ? "8px" : size === "md" ? "12px" : "16px",
        }}
      >
        {/* Subtle inner top bevel highlight */}
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-[inherit] bg-gradient-to-b from-white/25 via-transparent to-black/10 pointer-events-none"
        />

        {/* Clean, centered Code2 (</>) Emblem */}
        <Code2
          className={`${current.icon} text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)] relative z-10 shrink-0`}
          strokeWidth={current.stroke}
        />
      </div>

      {showText && (
        <div className={`flex flex-col justify-center leading-none ${textClassName}`}>
          <div className="flex items-center gap-1.5">
            <span className="font-brand font-bold text-lg tracking-tight text-white">
              Study
            </span>
            <span className="font-brand font-black text-lg bg-gradient-to-r from-[#FF4D4D] via-[#FF6E6E] to-[#FFA270] bg-clip-text text-transparent">
              Buddy
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#d63a3a] ml-0.5" />
          </div>
          {subtitle && (
            <span className="text-[10px] text-neutral-400 font-mono tracking-wide mt-1">
              Code • Study • Track
            </span>
          )}
        </div>
      )}
    </div>
  );
}
