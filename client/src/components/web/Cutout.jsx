
/**
 * Cutout: Chamfered corner container with 2-layer stroke + fill architecture.
 * - Outer stroke layer: Bone at 22% opacity, 1px padding
 * - Inner fill layer: Inset 1px with identical clip-path, #1f0d12 to #160a0e diagonal fill, 1px top highlight
 * - Variants:
 *   - "card": 18px chamfer on top-right and bottom-left only
 *   - "card-tr": 18px chamfer on top-right only (Stat Card 1, 3)
 *   - "card-bl": 18px chamfer on bottom-left only (Stat Card 2, 4)
 *   - "btn": 10px chamfer
 *   - "input": 10px chamfer
 *   - "chip": 6px chamfer
 * - Hover: 2px upward lift and crimson corner edge highlight (250ms)
 */
export default function Cutout({
  children,
  variant = "card",
  className = "",
  innerClassName = "",
  as: Component = "div",
  hoverLift = true,
  onClick,
  style,
  ...props
}) {


  // Clip paths for Web theme
  const clipPaths = {
    card: "polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 18px 100%, 0 calc(100% - 18px))",
    "card-tr": "polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 0 100%)",
    "card-bl": "polygon(0 0, 100% 0, 100% 100%, 18px 100%, 0 calc(100% - 18px))",
    btn: "polygon(10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px), 0 10px)",
    input: "polygon(10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px), 0 10px)",
    chip: "polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)",
  };

  const clipPath = clipPaths[variant] || clipPaths.card;
  const isCard = variant.startsWith("card");

  return (
    <Component
      onClick={onClick}
      className={`group relative p-[1px] transition-all duration-250 ease-out select-none ${
        hoverLift && isCard ? "hover:-translate-y-[2px]" : ""
      } ${className}`}
      style={{
        clipPath,
        WebkitClipPath: clipPath,
        background: "var(--cutout-stroke)",
        ...style,
      }}
      {...props}
    >
      {/* Outer stroke hover highlight for cards */}
      {isCard && (
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-250"
          style={{
            background: "var(--cutout-hover-stroke)",
            clipPath,
            WebkitClipPath: clipPath,
          }}
        />
      )}

      {/* Inner fill layer inset 1px with same clip-path */}
      <div
        className={`relative w-full h-full ${innerClassName}`}
        style={{
          clipPath,
          WebkitClipPath: clipPath,
          background: isCard ? "var(--cutout-inner-bg)" : undefined,
          boxShadow: isCard ? "var(--cutout-inner-shadow)" : undefined,
        }}
      >
        {children}
      </div>
    </Component>
  );
}

export function CutoutCard(props) {
  return <Cutout variant="card" {...props} />;
}

export function CutoutButton(props) {
  return <Cutout variant="btn" as="button" {...props} />;
}

export function CutoutInput(props) {
  return <Cutout variant="input" {...props} />;
}

export function CutoutChip(props) {
  return <Cutout variant="chip" {...props} />;
}

