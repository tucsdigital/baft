"use client"

import * as React from "react"
import { DayPicker, type DayPickerProps } from "react-day-picker"
import { es } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

/** Calendario en español (Argentina): semana desde el lunes, meses y días en español. */
function Calendar({ className, classNames, showOutsideDays = true, ...props }: DayPickerProps) {
  return (
    <DayPicker
      locale={es}
      weekStartsOn={1}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "relative flex flex-col gap-4 sm:flex-row sm:gap-6",
        month: "space-y-3",
        month_caption: "flex h-8 items-center justify-center",
        caption_label: "text-sm font-semibold capitalize text-gray-900",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between",
        button_previous:
          "inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-30",
        button_next:
          "inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-30",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-9 text-center text-[11px] font-medium uppercase text-gray-400",
        week: "mt-1 flex w-full",
        day: "relative h-9 w-9 p-0 text-center text-sm",
        day_button:
          "h-9 w-9 rounded-full font-normal text-gray-800 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300",
        today: "font-semibold text-sky-600",
        outside: "text-gray-300",
        disabled: "text-gray-300 [&>button]:cursor-not-allowed [&>button]:hover:bg-transparent",
        hidden: "invisible",
        range_start: "rounded-l-full bg-gray-100 [&>button]:bg-gray-900 [&>button]:text-white [&>button]:hover:bg-gray-900",
        range_end: "rounded-r-full bg-gray-100 [&>button]:bg-gray-900 [&>button]:text-white [&>button]:hover:bg-gray-900",
        range_middle: "bg-gray-100 [&>button]:rounded-none [&>button]:hover:bg-gray-200",
        selected: "",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: cls }) =>
          orientation === "left" ? <ChevronLeft className={cn("h-4 w-4", cls)} /> : <ChevronRight className={cn("h-4 w-4", cls)} />,
      }}
      {...props}
    />
  )
}

export { Calendar }
