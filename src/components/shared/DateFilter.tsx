"use client";

import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type DateFilterMode = "ALL" | "TODAY" | "CUSTOM";

type DateFilterProps = {
  mode: DateFilterMode;
  range?: DateRange;
  onModeChange: (mode: DateFilterMode) => void;
  onRangeChange: (range: DateRange | undefined) => void;
};

export default function DateFilter({ mode, range, onModeChange, onRangeChange }: DateFilterProps) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row">
      <Select
        value={mode}
        onValueChange={(value) => {
          const nextMode = value as DateFilterMode;
          onModeChange(nextMode);
          if (nextMode !== "CUSTOM") onRangeChange(undefined);
        }}
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="Fecha" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todas las fechas</SelectItem>
          <SelectItem value="TODAY">Hoy</SelectItem>
          <SelectItem value="CUSTOM">Elegir fecha o rango</SelectItem>
        </SelectContent>
      </Select>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full min-w-0 justify-start sm:w-auto">
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">
              {range?.from
                ? range.to
                  ? `${format(range.from, "dd/MM/yyyy")} – ${format(range.to, "dd/MM/yyyy")}`
                  : format(range.from, "dd/MM/yyyy")
                : "Elegir fecha o rango"}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto max-w-[calc(100vw-2rem)] p-0">
          <Calendar
            mode="range"
            selected={range}
            onSelect={(nextRange) => {
              onRangeChange(nextRange);
              onModeChange("CUSTOM");
            }}
            numberOfMonths={1}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
