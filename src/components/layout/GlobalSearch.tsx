"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, LayoutDashboard, PawPrint, Search, Stethoscope, Users } from "lucide-react";

export type GlobalSearchResult = {
  id: string;
  label: string;
  detail?: string;
  href: string;
};

export type GlobalSearchGroup = {
  label: string;
  results: GlobalSearchResult[];
};

const navigationResults: GlobalSearchGroup[] = [
  {
    label: "Navegación",
    results: [
      { id: "today", label: "Hoy", detail: "Centro operativo", href: "/today" },
      { id: "dashboard", label: "Resumen", detail: "Indicadores de la clínica", href: "/dashboard" },
      { id: "clients", label: "Clientes", detail: "Propietarios", href: "/clients" },
      { id: "pets", label: "Pacientes", detail: "Mascotas y seguimiento", href: "/pets" },
      { id: "appointments", label: "Agenda", detail: "Citas", href: "/appointments" },
      { id: "invoices", label: "Facturación", detail: "Cobros y documentos", href: "/invoices" },
      { id: "services", label: "Servicios", detail: "Catálogo", href: "/services" },
    ],
  },
];

const resultIcons = { today: Calendar, dashboard: LayoutDashboard, clients: Users, pets: PawPrint, appointments: Calendar, invoices: FileText, services: Stethoscope };

type GlobalSearchProps = { entityGroups?: GlobalSearchGroup[] };

export default function GlobalSearch({ entityGroups = [] }: GlobalSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [remoteGroups, setRemoteGroups] = useState<GlobalSearchGroup[]>(entityGroups);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const router = useRouter();
  const groups = [...remoteGroups, ...navigationResults];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const trimmedQuery = query.trim();
    const currentRequest = ++requestId.current;

    if (!open || trimmedQuery.length < 2) {
      return;
    }

    const controller = new AbortController();

    const timeoutId = window.setTimeout(() => {
      void fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}`, { signal: controller.signal, cache: "no-store" })
        .then(async (response) => {
          const payload = (await response.json()) as { groups?: GlobalSearchGroup[]; error?: string };
          if (!response.ok) throw new Error(payload.error ?? "No pudimos realizar la búsqueda.");
          return payload.groups ?? [];
        })
        .then((nextGroups) => {
          if (currentRequest !== requestId.current) return;
          setRemoteGroups(nextGroups);
        })
        .catch((reason: unknown) => {
          if (controller.signal.aborted || currentRequest !== requestId.current) return;
          setRemoteGroups([]);
          setError(reason instanceof Error ? reason.message : "No pudimos realizar la búsqueda.");
        })
        .finally(() => {
          if (!controller.signal.aborted && currentRequest === requestId.current) setLoading(false);
        });
    }, 280);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [open, query]);

  const choose = (href: string) => {
    setOpen(false);
    setQuery("");
    setRemoteGroups([]);
    router.push(href);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery("");
      setRemoteGroups([]);
      setError(null);
    }
  };

  const handleQueryChange = (nextQuery: string) => {
    setQuery(nextQuery);
    if (nextQuery.trim().length < 2) {
      setRemoteGroups([]);
      setLoading(false);
      setError(null);
    } else {
      setRemoteGroups([]);
      setLoading(true);
      setError(null);
    }
  };

  return <>
    <Button type="button" variant="outline" className="hidden w-[min(34vw,30rem)] justify-between text-muted-foreground md:flex" onClick={() => setOpen(true)}>
      <span className="flex items-center gap-2"><Search className="h-4 w-4" />Buscar pacientes, clientes, citas, facturas...</span>
      <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium">Ctrl K</kbd>
    </Button>
    <Button type="button" variant="outline" size="icon" className="md:hidden" aria-label="Abrir búsqueda global" onClick={() => setOpen(true)}><Search className="h-4 w-4" /></Button>
    <CommandDialog open={open} onOpenChange={handleOpenChange} title="Búsqueda global" className="w-lg" description="Busca y navega por Karey Vet">
      <CommandInput onValueChange={handleQueryChange} placeholder="Buscar pacientes, clientes, facturas, productos..." value={query} />
      <CommandList>
        {loading ? <div className="px-4 py-6 text-center text-sm text-muted-foreground">Buscando...</div> : null}
        {!loading ? <CommandEmpty>{error ?? "No encontramos resultados. Prueba con otro término."}</CommandEmpty> : null}
        {groups.map((group, groupIndex) => <div key={group.label}>
          {groupIndex > 0 ? <CommandSeparator /> : null}
          <CommandGroup heading={group.label}>
            {group.results.map((result) => {
              const Icon = resultIcons[result.id as keyof typeof resultIcons] ?? Search;
              const itemValue = group.label === "Navegación"
                ? `${result.label} ${result.detail ?? ""}`
                : `${query} ${result.label} ${result.detail ?? ""}`;
              return <CommandItem key={result.id} value={itemValue} onSelect={() => choose(result.href)}>
                <Icon className="h-4 w-4" />
                <span>{result.label}</span>
                {result.detail ? <span className="ml-auto text-xs text-muted-foreground">{result.detail}</span> : null}
              </CommandItem>;
            })}
          </CommandGroup>
        </div>)}
        <CommandSeparator />
        <CommandGroup heading="Atajos"><CommandItem value="Abrir búsqueda global"><Search className="h-4 w-4" />Abrir búsqueda global<CommandShortcut>Ctrl K</CommandShortcut></CommandItem></CommandGroup>
      </CommandList>
    </CommandDialog>
  </>;
}
