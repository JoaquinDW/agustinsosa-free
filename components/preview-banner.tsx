import { Eye } from "lucide-react"

export function PreviewBanner() {
  return (
    <div className="fixed inset-x-0 top-0 z-[100] flex h-8 items-center justify-center gap-2 border-b border-[#ff0040]/30 bg-black/95 px-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-white shadow-[0_0_24px_rgba(255,0,64,0.2)] backdrop-blur-md">
      <Eye className="h-3.5 w-3.5 text-[#ff0040]" aria-hidden="true" />
      Vista previa privada
    </div>
  )
}
