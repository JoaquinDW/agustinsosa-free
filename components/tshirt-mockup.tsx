"use client"

import Image from "next/image"
import { useState } from "react"

interface TShirtMockupProps {
  imageUrl: string
  alt?: string
  className?: string
}

export function TShirtMockup({
  imageUrl,
  alt = "T-Shirt Design",
  className = "",
}: TShirtMockupProps) {
  const [imageLoaded, setImageLoaded] = useState(false)

  return (
    <div className={`relative ${className}`}>
      {/* Mockup Container */}
      <div className="relative w-full max-w-md mx-auto aspect-[3/4]">
        {/* Base T-Shirt Mockup Image */}
        <div className="relative w-full h-full">
          <Image
            src={
              "/white-t-shirt-mockup-t-shirt-with-short-sleeves-ai-generative-free-png.webp"
            }
            alt="White T-Shirt Mockup"
            fill
            className="object-contain md:scale-150 scale-110 transition-transform mix-blend-multiply duration-500 ease-in-out"
            priority
          />

          {/* Design Area - positioned over the chest area of the t-shirt */}
          <div className="absolute top-[28%] left-1/2 transform -translate-x-1/2 w-[50%] md:w-[65%] h-[45%]">
            <div className="relative w-full h-full">
              {/* User's image with realistic print effects */}
              <div className="relative w-full h-full overflow-hidden">
                <Image
                  src={imageUrl || "/placeholder.svg"}
                  alt={alt}
                  fill
                  className="object-cover transition-all duration-500 rounded-sm"
                  style={{
                    opacity: imageLoaded ? 0.88 : 0,
                    filter: imageLoaded
                      ? "contrast(1.08) saturate(0.88) brightness(0.96) blur(0.3px)"
                      : "none",
                    transform:
                      "perspective(1000px) rotateX(3deg) rotateY(-1deg)",
                    transformOrigin: "center center",
                    mixBlendMode: "multiply",
                  }}
                  onLoad={() => setImageLoaded(true)}
                />

                {/* Fabric texture overlay to simulate print on cotton */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Cotton weave texture */}
                  <div
                    className="absolute inset-0 opacity-12 mix-blend-overlay"
                    style={{
                      backgroundImage: `
                        repeating-linear-gradient(0deg, 
                          transparent 0px, 
                          rgba(0,0,0,0.03) 0.5px, 
                          transparent 1px
                        ),
                        repeating-linear-gradient(90deg, 
                          transparent 0px, 
                          rgba(0,0,0,0.03) 0.5px, 
                          transparent 1px
                        )
                      `,
                      backgroundSize: "1.5px 1.5px",
                    }}
                  />

                  {/* Fabric fiber texture */}
                  <div
                    className="absolute inset-0 opacity-8 mix-blend-soft-light"
                    style={{
                      backgroundImage: `
                        radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0),
                        repeating-conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(0,0,0,0.02) 45deg, transparent 90deg)
                      `,
                      backgroundSize: "3px 3px, 4px 4px",
                    }}
                  />

                  {/* Subtle fabric distortion and wrinkles */}
                  <div className="absolute inset-0 opacity-8">
                    <div
                      className="w-full h-full"
                      style={{
                        background: `
                          radial-gradient(ellipse at 30% 40%, transparent 20%, rgba(0,0,0,0.04) 40%, transparent 60%),
                          radial-gradient(ellipse at 70% 60%, transparent 20%, rgba(255,255,255,0.06) 40%, transparent 60%),
                          linear-gradient(45deg, transparent 30%, rgba(0,0,0,0.02) 50%, transparent 70%)
                        `,
                      }}
                    />
                  </div>

                  {/* Print edge bleeding effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/4 mix-blend-multiply"></div>

                  {/* Vintage print wear effect */}
                  <div
                    className="absolute inset-0 opacity-6 mix-blend-overlay"
                    style={{
                      background: `
                        radial-gradient(circle at 20% 30%, rgba(255,255,255,0.1) 2px, transparent 4px),
                        radial-gradient(circle at 80% 70%, rgba(0,0,0,0.05) 1px, transparent 3px),
                        radial-gradient(circle at 60% 20%, rgba(255,255,255,0.08) 1.5px, transparent 3px)
                      `,
                      backgroundSize: "25px 25px, 35px 35px, 20px 20px",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Optional: Hanger effect (commented out for more realistic look) */}
          {/* 
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 z-10">
            <div className="w-12 h-6 relative">
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0.5 h-4 bg-gradient-to-b from-gray-500 to-gray-700 rounded-full"></div>
              <div className="absolute top-3 left-0 w-full h-0.5 bg-gradient-to-r from-amber-700 via-amber-500 to-amber-700 rounded-full shadow-sm"></div>
              <div className="absolute top-2.5 left-1 w-10 h-2 bg-gradient-to-b from-amber-400 to-amber-600 rounded-t-full shadow-sm"></div>
            </div>
          </div>
          */}
        </div>

        {/* Loading state */}
        {!imageLoaded && (
          <div className="absolute top-[28%] left-1/2 transform -translate-x-1/2 w-[45%] h-[35%] bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-sm">
            <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </div>
  )
}
