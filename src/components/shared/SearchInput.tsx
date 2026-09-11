import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchInputProps = Omit<React.ComponentProps<typeof Input>, "type"> & {
  onClear?: () => void;
};

export default function SearchInput({ className, onClear, value, ...props }: SearchInputProps) {
  const hasValue = typeof value === "string" && value.length > 0;

  return (
    <div className={cn("relative w-full", className)}>
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input {...props} type="search" value={value} className="pl-10 pr-9" />
      {hasValue && onClear ? (
        <Button className="absolute right-1 top-1/2 -translate-y-1/2" size="icon-sm" type="button" variant="ghost" onClick={onClear} aria-label="Limpiar búsqueda">
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
