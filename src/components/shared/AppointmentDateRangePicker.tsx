"use client";

import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type AppointmentDateRangeMode = "ALL" | "TODAY" | "WEEK" | "MONTH" | "CUSTOM";

type Props = {
  mode: AppointmentDateRangeMode;
  range?: DateRange;
  onModeChange: (mode: AppointmentDateRangeMode) => void;
  onRangeChange: (range: DateRange | undefined) => void;
};

export default function AppointmentDateRangePicker({ mode, range, onModeChange, onRangeChange }: Props) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row">
      <Select value={mode} onValueChange={(value) => onModeChange(value as AppointmentDateRangeMode)}>
        <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Fecha" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todas las fechas</SelectItem>
          <SelectItem value="TODAY">Hoy</SelectItem>
          <SelectItem value="WEEK">Esta semana</SelectItem>
          <SelectItem value="MONTH">Este mes</SelectItem>
          <SelectItem value="CUSTOM">Personalizado</SelectItem>
        </SelectContent>
      </Select>
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="w-full min-w-0 justify-start sm:w-auto">
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">
              {range?.from ? range.to ? `${format(range.from, "dd/MM/yyyy")} – ${format(range.to, "dd/MM/yyyy")}` : format(range.from, "dd/MM/yyyy") : "Elegir fechas"}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto max-w-[calc(100vw-2rem)] p-0">
          <Calendar mode="range" selected={range} onSelect={(nextRange) => { onRangeChange(nextRange); onModeChange("CUSTOM"); }} numberOfMonths={1} />
        </PopoverContent>
      </Popover>
    </div>
  );
}
