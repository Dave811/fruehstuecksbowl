"use client"

import * as React from "react"
import { ChevronDownIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const HOURS = Array.from({ length: 24 }, (_, i) => ({ value: i, label: String(i).padStart(2, "0") }))
const MINUTES = [
  { value: 0, label: "00" },
  { value: 15, label: "15" },
  { value: 30, label: "30" },
  { value: 45, label: "45" },
]

export interface TimePickerProps {
  hour: number
  minute: number
  onChange: (hour: number, minute: number) => void
  id?: string
  className?: string
}

export function TimePicker({ hour, minute, onChange, id, className }: TimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const hourRef = React.useRef<HTMLDivElement>(null)
  const minuteRef = React.useRef<HTMLDivElement>(null)

  const displayValue = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`

  const selectedMinute = [0, 15, 30, 45].includes(minute) ? minute : null

  React.useEffect(() => {
    if (!open) return
    hourRef.current?.querySelector(`[data-hour="${hour}"]`)?.scrollIntoView({ block: "nearest", behavior: "auto" })
    if (selectedMinute !== null) {
      minuteRef.current?.querySelector(`[data-minute="${selectedMinute}"]`)?.scrollIntoView({ block: "nearest", behavior: "auto" })
    }
  }, [open, hour, selectedMinute])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          id={id}
          className={cn("min-h-[48px] w-[100px] justify-between font-normal tabular-nums", className)}
        >
          {displayValue}
          <ChevronDownIcon className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <div className="flex border-b border-border">
          <div
            ref={hourRef}
            className="max-h-[200px] w-14 overflow-y-auto border-r border-border py-1"
            role="listbox"
            aria-label="Stunde"
          >
            {HOURS.map(({ value, label }) => {
              const isSelected = value === hour
              return (
                <button
                  key={value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-hour={value}
                  className={cn(
                    "w-full min-h-[36px] text-center text-sm tabular-nums transition-colors",
                    "bg-background hover:bg-accent hover:text-accent-foreground",
                    isSelected && "bg-primary text-primary-foreground hover:bg-primary-hover hover:text-primary-foreground"
                  )}
                  onClick={() => onChange(value, selectedMinute ?? minute)}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <div
            ref={minuteRef}
            className="max-h-[200px] w-14 overflow-y-auto py-1"
            role="listbox"
            aria-label="Minute"
          >
            {MINUTES.map(({ value, label }) => {
              const isSelected = value === minute
              return (
                <button
                  key={value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-minute={value}
                  className={cn(
                    "w-full min-h-[36px] text-center text-sm tabular-nums transition-colors",
                    "bg-background hover:bg-accent hover:text-accent-foreground",
                    isSelected && "bg-primary text-primary-foreground hover:bg-primary-hover hover:text-primary-foreground"
                  )}
                  onClick={() => onChange(hour, value)}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
