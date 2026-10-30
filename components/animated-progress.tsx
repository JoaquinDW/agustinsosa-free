"use client"

import type { CSSProperties } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface AnimatedProgressProps {
  value: number
  logoSrc?: string
  className?: string
}

export function AnimatedProgress({
  value,
  logoSrc,
  className,
}: AnimatedProgressProps) {
  const clamped = Math.min(Math.max(value, 0), 100)

  return (
    <div className={cn("relative w-full", className)}>
      {/* py-6 creates vertical room for the logo to protrude above/below the track */}
      <div className="relative py-6">
        {/* Track (pill) — dark glass with a red neon rim */}
        <div className="relative h-12 sm:h-14 rounded-full bg-gradient-to-b from-[#1c1c1f] to-[#08080a] border border-[#ff0040]/40 shadow-[inset_0_2px_10px_rgba(0,0,0,0.9),0_0_2px_rgba(255,0,64,0.7),0_0_28px_rgba(255,0,64,0.25)] overflow-hidden">
          {/* Diagonal glossy sheen across the glass */}
          <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_35%,rgba(255,255,255,0.14)_48%,transparent_58%)]" />
          {/* Fill */}
          <div
            className="absolute inset-y-[3px] left-[3px] rounded-full overflow-hidden transition-all duration-1000 ease-out"
            style={{
              width: `calc(${clamped}% - 6px)`,
              background:
                "linear-gradient(90deg, #f5c518 0%, #a8d81f 38%, #22c55e 58%, #22d3ee 82%, #1e9ff2 100%)",
              boxShadow:
                "0 0 22px rgba(34,211,238,0.35), 0 0 12px rgba(245,197,24,0.3)",
            }}
          >
            {/* Glossy top highlight */}
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/45 to-transparent" />
            {/* Bottom soft shade for 3D depth */}
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent" />
          </div>
        </div>

        {/* Logo centered on the bar at the fill endpoint */}
        {logoSrc && (
          <div
            className="progress-logo-marker absolute top-1/2 z-10 transition-all duration-1000 ease-out"
            style={{
              "--progress-logo-position": `${clamped}%`,
              transform: "translate(-50%, -50%)",
            } as CSSProperties}
          >
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full">
              {/* Outer red neon halo */}
              <div className="absolute -inset-1.5 rounded-full bg-[#ff0040]/40 blur-md" />
              <div className="relative w-full h-full rounded-full overflow-hidden border-[3px] border-white bg-black p-1.5 sm:p-2 shadow-[0_0_0_3px_rgba(0,0,0,0.6),0_0_20px_rgba(255,0,64,0.7),0_0_40px_rgba(255,0,64,0.35)]">
                <Image
                  src={logoSrc}
                  alt="Sosa Motos"
                  width={96}
                  height={96}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface ChancesLabelProps {
  label: string
  className?: string
}

/**
 * Renders the label above the progress bar with the last word highlighted in
 * the brand red gradient, followed by a fading red underline — matching the
 * client-provided reference design.
 */
export function ChancesLabel({ label, className }: ChancesLabelProps) {
  const words = label.trim().split(/\s+/)
  const lastWord = words.pop()
  const rest = words.join(" ")

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="text-sm sm:text-base font-bold uppercase tracking-widest">
        {rest && <span className="text-gray-300 mr-1.5">{rest}</span>}
        <span className="bg-gradient-to-b from-[#ff5573] via-[#ff0040] to-[#c1002f] bg-clip-text text-transparent">
          {lastWord}
        </span>
      </span>
      <span className="h-px w-24 bg-gradient-to-r from-[#ff0040] to-transparent" />
    </div>
  )
}

interface PorcentajeCompletadoProps {
  value: number
  label: string
  className?: string
}

/** Small red slashes ("/////") decoration flanking the percentage. */
function Chevrons({ flip = false }: { flip?: boolean }) {
  const slashCount = 5

  return (
    <span
      className={cn(
        "progress-chevrons",
        flip ? "progress-chevrons-right" : "progress-chevrons-left",
      )}
      aria-hidden="true"
    >
      {Array.from({ length: slashCount }, (_, i) => (
        <span
          key={i}
          className="progress-chevron"
          style={{
            "--chevron-order": flip ? slashCount - 1 - i : i,
          } as CSSProperties}
        />
      ))}
    </span>
  )
}

export function PorcentajeCompletado({
  value,
  label,
  className,
}: PorcentajeCompletadoProps) {
  const clamped = Math.min(Math.max(value, 0), 100)

  return (
    <div
      className={cn(
        "relative rounded-2xl border border-[#ff0040]/15 bg-gradient-to-b from-[#151517] to-[#0a0a0b] px-6 py-6 shadow-[0_10px_40px_rgba(0,0,0,0.5),0_0_30px_rgba(255,0,64,0.05)]",
        className,
      )}
    >
      <div className="flex items-center justify-center gap-4 sm:gap-6">
        <Chevrons />
        <span className="percentage-value font-display leading-none text-5xl sm:text-6xl md:text-7xl bg-gradient-to-b from-[#ff5573] via-[#ff0040] to-[#c1002f] bg-clip-text text-transparent drop-shadow-[0_0_22px_rgba(255,0,64,0.45)]">
          {clamped.toFixed(1)}%
        </span>
        <Chevrons flip />
      </div>
      <div className="flex items-center justify-center gap-3 mt-2">
        <span className="h-px w-8 sm:w-12 bg-gradient-to-r from-transparent to-gray-600" />
        <span className="text-xs sm:text-sm font-semibold uppercase tracking-[0.3em] text-gray-200 whitespace-nowrap">
          {label}
        </span>
        <span className="h-px w-8 sm:w-12 bg-gradient-to-l from-transparent to-gray-600" />
      </div>
    </div>
  )
}
