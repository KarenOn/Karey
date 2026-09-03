"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type SearchableSelectOption = {
  value: string;
  label: string;
  keywords?: string[];
  disabled?: boolean;
};

type SearchableSelectProps = {
  value?: string | null;
  onValueChange: (
    value: string,
    detail?: { option?: SearchableSelectOption; isCustom: boolean }
  ) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  allowCustomValue?: boolean;
  customValueLabel?: (input: string) => string;
};

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

export default function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar...",
  emptyMessage = "No encontramos resultados.",
  disabled = false,
  className,
  buttonClassName,
  allowCustomValue = false,
  customValueLabel = (input) => `Usar "${input}"`,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const selectedOption = React.useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  );

  const normalizedQuery = normalizeQuery(query);
  const hasExactMatch = React.useMemo(() => {
    if (!normalizedQuery) return false;
    return options.some((option) => {
      const haystack = [option.label, ...(option.keywords ?? [])]
        .join(" ")
        .toLowerCase();
      return haystack === normalizedQuery || option.label.toLowerCase() === normalizedQuery;
    });
  }, [normalizedQuery, options]);

  const canCreateCustomValue =
    allowCustomValue && normalizedQuery.length > 1 && !hasExactMatch;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className={cn(
            "w-full justify-between rounded-xl border border-border/70 bg-input px-3 font-normal text-foreground",
            !selectedOption && !value && "text-muted-foreground",
            buttonClassName
          )}
          disabled={disabled}
          role="combobox"
          type="button"
          variant="outline"
        >
          <span className="truncate text-left">
            {selectedOption?.label ?? value ?? placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className={cn("w-[var(--radix-popover-trigger-width)] p-0", className)}>
        <Command shouldFilter>
          <CommandInput
            onValueChange={setQuery}
            placeholder={searchPlaceholder}
            value={query}
          />
          <CommandList>
            <CommandEmpty>
              <div className="space-y-2 px-2 py-3 text-sm text-muted-foreground">
                <p>{emptyMessage}</p>
                {canCreateCustomValue ? (
                  <Button
                    className="h-auto w-full justify-start px-2 py-2 text-left"
                    onClick={() => {
                      onValueChange(query.trim(), { isCustom: true });
                      setOpen(false);
                      setQuery("");
                    }}
                    type="button"
                    variant="ghost"
                  >
                    {customValueLabel(query.trim())}
                  </Button>
                ) : null}
              </div>
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  disabled={option.disabled}
                  key={option.value}
                  keywords={option.keywords}
                  onSelect={() => {
                    onValueChange(option.value, { option, isCustom: false });
                    setOpen(false);
                    setQuery("");
                  }}
                  value={[option.label, ...(option.keywords ?? [])].join(" ")}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      option.value === value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
              {canCreateCustomValue ? (
                <CommandItem
                  onSelect={() => {
                    onValueChange(query.trim(), { isCustom: true });
                    setOpen(false);
                    setQuery("");
                  }}
                  value={`custom ${query.trim()}`}
                >
                  <Check className="mr-2 h-4 w-4 opacity-0" />
                  <span className="truncate">{customValueLabel(query.trim())}</span>
                </CommandItem>
              ) : null}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
