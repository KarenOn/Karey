"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, Check, LoaderCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Item = { id: number; type: string; title: string; message: string; targetUrl: string | null; createdAt: string; readAt: string | null };

function timeAgo(value: string) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return new Intl.DateTimeFormat("es-DO", { day: "numeric", month: "short" }).format(new Date(value));
}

export default function NotificationBell() {
  const [items, setItems] = useState<Item[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);
  const knownIds = useRef<Set<number>>(new Set());

  async function load() {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json() as { unreadCount: number; notifications: Item[] };
      if (initialized.current) {
        data.notifications.filter((item) => !knownIds.current.has(item.id)).forEach((item) => {
          if (item.type === "CLINICAL_REPORT_COMPLETED") toast.success("Informe clínico generado correctamente.");
          if (item.type === "CLINICAL_REPORT_FAILED") toast.error("No pudimos generar el informe clínico.");
        });
      }
      setItems(data.notifications); setUnreadCount(data.unreadCount);
      knownIds.current = new Set(data.notifications.map((item) => item.id));
      initialized.current = true;
    } finally { setLoading(false); }
  }
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 30000);
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("karey:notifications-invalidated", refreshWhenVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("karey:notifications-invalidated", refreshWhenVisible);
    };
  }, []);

  async function markRead(id: number) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, readAt: new Date().toISOString() } : item));
    setUnreadCount((count) => Math.max(0, count - (items.find((item) => item.id === id)?.readAt ? 0 : 1)));
    await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
  }

  async function retry(item: Item) {
    if (!item.targetUrl) return;
    await fetch(item.targetUrl, { method: "POST" });
    await load();
  }

  return <DropdownMenu onOpenChange={(open) => { if (open) void load(); }}>
    <DropdownMenuTrigger asChild><Button variant="outline" size="icon" aria-label={`Notificaciones${unreadCount ? `, ${unreadCount} sin leer` : ""}`} className="relative"><Bell className="h-4 w-4" />{unreadCount > 0 ? <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}</Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
      <DropdownMenuLabel className="flex items-center justify-between px-4 py-3"><span>Notificaciones</span>{unreadCount ? <span className="text-xs font-normal text-muted-foreground">{unreadCount} sin leer</span> : null}</DropdownMenuLabel><DropdownMenuSeparator />
      {loading ? <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Cargando...</div> : items.length === 0 ? <div className="p-6 text-center text-sm text-muted-foreground"><Bell className="mx-auto mb-2 h-5 w-5" />No tienes notificaciones nuevas.</div> : <div className="max-h-[min(28rem,70vh)] overflow-y-auto">{items.map((item) => <div key={item.id} className={cn("border-b border-border/60 p-3 last:border-0", !item.readAt && "bg-primary/[0.04]")}><div className="flex gap-3"><div className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", item.readAt ? "bg-muted" : "bg-primary")} /><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-foreground">{item.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.message}</p><div className="mt-2 flex items-center justify-between gap-2"><span className="text-[11px] text-muted-foreground">{timeAgo(item.createdAt)}</span><div className="flex items-center gap-2">{!item.readAt ? <button type="button" onClick={() => void markRead(item.id)} className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"><Check className="h-3 w-3" />Leída</button> : null}{item.type === "CLINICAL_REPORT_FAILED" ? <button type="button" onClick={() => void retry(item)} className="text-[11px] font-medium text-primary hover:underline">Reintentar</button> : null}{item.targetUrl && item.type !== "CLINICAL_REPORT_FAILED" ? item.type === "CLINICAL_REPORT_COMPLETED" ? <a href={item.targetUrl} target="_blank" rel="noreferrer" onClick={() => { if (!item.readAt) void markRead(item.id); }} className="text-[11px] font-medium text-primary hover:underline">Abrir informe</a> : <Link href={item.targetUrl} onClick={() => { if (!item.readAt) void markRead(item.id); }} className="text-[11px] font-medium text-primary hover:underline">Ver</Link> : null}</div></div></div></div></div>)}</div>}
    </DropdownMenuContent>
  </DropdownMenu>;
}
