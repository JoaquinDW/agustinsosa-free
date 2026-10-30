"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export const Checkbox = React.forwardRef<React.ElementRef<typeof CheckboxPrimitive.Root>, React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>>(
  ({ className, ...props }, ref) => <CheckboxPrimitive.Root ref={ref} className={cn("peer h-4 w-4 shrink-0 rounded border border-zinc-400 bg-white text-white data-[state=checked]:border-violet-600 data-[state=checked]:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-50", className)} {...props}><CheckboxPrimitive.Indicator className="flex items-center justify-center"><Check className="h-3 w-3" /></CheckboxPrimitive.Indicator></CheckboxPrimitive.Root>,
)
Checkbox.displayName = "Checkbox"
