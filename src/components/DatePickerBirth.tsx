"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { de } from "date-fns/locale"

interface DatePickerBirthProps {
  value: string
  onChange: (value: string) => void
  id?: string
  placeholder?: string
}

/** Geburtsdatum-Picker mit shadcn Calendar + Popover (z. B. für Login). */
export function DatePickerBirth({
  value,
  onChange,
  id,
  placeholder = "Geburtsdatum wählen",
}: DatePickerBirthProps) {
  const [open, setOpen] = React.useState(false)
  const date = value ? new Date(value + "T12:00:00") : undefined

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Geburtsdatum</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id={id}
            className="min-h-[48px] w-full justify-start font-normal"
          >
            {date
              ? date.toLocaleDateString("de-DE", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            defaultMonth={date}
            captionLayout="dropdown"
            locale={de}
            fromYear={1920}
            toYear={new Date().getFullYear()}
            onSelect={(d) => {
              if (d) {
                onChange(
                [
                  d.getFullYear(),
                  String(d.getMonth() + 1).padStart(2, "0"),
                  String(d.getDate()).padStart(2, "0"),
                ].join("-")
              )
                setOpen(false)
              }
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
