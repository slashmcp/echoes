'use client'

import { Map as MapIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface LairMapProps {
  bossHealth: number
  onClose: () => void
}

const MAP_LOCATIONS = [
  {
    name: 'Village Gate',
    description: 'The ash-choked lowlands where the climb begins.',
    healthThreshold: 500, // 0-100 dmg dealt
  },
  {
    name: 'Ashen Pass',
    description: 'Narrow ledges swept by freezing winds and falling rock.',
    healthThreshold: 400, // 100-200 dmg dealt
  },
  {
    name: 'Dragon Gate',
    description: 'An ancient basalt archway carved with warnings.',
    healthThreshold: 300, // 200-300 dmg dealt
  },
  {
    name: 'The Outer Hall',
    description: 'Where the skeletal hoard of past challangers rests.',
    healthThreshold: 150, // 300-450 dmg dealt
  },
  {
    name: 'Ignis\'s Throne',
    description: 'The ancient molten chamber at the volcano core.',
    healthThreshold: 0, // Current/Final fight
  },
]

export function LairMap({ bossHealth, onClose }: LairMapProps) {
  // Determine current active location index based on boss health remaining
  let activeIndex = 0
  for (let i = MAP_LOCATIONS.length - 1; i >= 0; i--) {
    if (bossHealth <= MAP_LOCATIONS[i].healthThreshold) {
      activeIndex = i
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-between bg-black/95 p-6 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <MapIcon className="size-4 text-primary" />
          <h2 className="font-serif text-xs font-bold tracking-[0.3em] text-primary uppercase">
            Ignis's Lair map
          </h2>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="size-8 rounded-full border border-border"
        >
          <X className="size-4" />
        </Button>
      </header>

      {/* Silhouette Mountain Landscape */}
      <div className="relative flex flex-1 items-center justify-center py-10">
        {/* Mountain landscape background */}
        <div className="absolute inset-x-0 bottom-10 h-32 opacity-20 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-primary/30 via-transparent to-transparent" />
        
        {/* The Path Line */}
        <div className="absolute inset-x-12 h-1 bg-gradient-to-r from-muted-foreground/20 via-primary/40 to-primary/20" />

        {/* Path dots */}
        <div className="relative flex w-full justify-between px-12">
          {MAP_LOCATIONS.map((loc, idx) => {
            const isCompleted = idx < activeIndex
            const isActive = idx === activeIndex
            const isFuture = idx > activeIndex

            return (
              <div key={loc.name} className="flex flex-col items-center gap-4 relative group">
                {/* Visual Point */}
                <div
                  className={cn(
                    "relative z-10 flex size-8 items-center justify-center rounded-full border-2 transition-all duration-300",
                    isCompleted && "bg-muted text-muted-foreground border-muted-foreground/30",
                    isActive && "bg-primary border-primary text-black shadow-[0_0_15px_oklch(0.7_0.2_45)] scale-110",
                    isFuture && "bg-black border-border text-muted-foreground/40"
                  )}
                >
                  <span className="font-serif text-[10px] font-bold">{idx + 1}</span>
                  {isActive && (
                    <span className="absolute -inset-1 animate-ping rounded-full border-2 border-primary opacity-50" />
                  )}
                </div>

                {/* Info Text */}
                <div className="absolute top-12 flex w-36 flex-col items-center text-center">
                  <h3
                    className={cn(
                      "font-serif text-[10px] font-bold tracking-widest uppercase transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground/60"
                    )}
                  >
                    {loc.name}
                  </h3>
                  {isActive && (
                    <p className="mt-1.5 text-[9px] leading-normal text-muted-foreground/80 animate-in fade-in slide-in-from-top-1 duration-300">
                      {loc.description}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer Instructions */}
      <footer className="border-t border-border pt-4 text-center">
        <p className="font-serif text-[9px] tracking-[0.2em] text-muted-foreground uppercase">
          Press <kbd className="rounded bg-muted px-1.5 py-0.5 text-foreground">Start</kbd> or <kbd className="rounded bg-muted px-1.5 py-0.5 text-foreground">Esc</kbd> to return to the arena
        </p>
      </footer>
    </div>
  )
}
