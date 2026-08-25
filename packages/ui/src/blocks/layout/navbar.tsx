"use client"

import { cn } from "@workspace/ui/lib/utils"
import React, { ReactNode } from "react"

export type NavbarProps = {
  start?: ReactNode
  end?: ReactNode
  rtl?: boolean
}

export const Navbar: React.FC<NavbarProps> = ({ start, end }) => {
  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-17.5 shrink-0 items-center justify-between gap-4 border-b bg-background/80 p-4 drop-shadow-lg backdrop-blur-md transition-all"
      )}
    >
      {/* Left Side */}
      <aside className={cn("flex items-center gap-2")}>{start}</aside>

      {/* Right Side */}
      <aside className={cn("flex items-center gap-2")}>{end}</aside>
    </header>
  )
}
