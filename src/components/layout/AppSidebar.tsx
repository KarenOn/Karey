"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  PawPrint,
  Calendar,
  Package,
  FileText,
  ChevronRight,
  Stethoscope,
  Bell,
  Menu,
  ClipboardList,
  Building2,
  User,
  Sun,
  Moon,
  IdCardLanyard,
  Search,
  Activity,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { Button } from "../ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type NavItem = {
  name: string;
  icon: React.ElementType;
  href: string;
  pageKey: string;
  hint: string;
};

const pageDescriptions: Record<string, string> = {
  "/dashboard": "Resumen operativo con foco clinico, agenda y finanzas.",
  "/clients": "Propietarios, contacto y contexto util en un solo vistazo.",
  "/today-turns": "Controla el flujo del dia y el estado de cada atencion.",
  "/pets": "Pacientes, especies, vacunas y seguimiento clinico.",
  "/appointments": "Agenda visual con prioridad a tiempos y asistencia.",
  "/inventory": "Stock, alertas y reposicion con informacion accionable.",
  "/invoices": "Cobros, estados y documentos con lectura rapida.",
  "/services": "Catalogo clinico uniforme y facil de mantener.",
  "/employees": "Equipo, roles y operacion interna de la clinica.",
  "/clinic-profile": "Configuracion general, identidad y operacion de la clinica.",
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { setTheme, resolvedTheme } = useTheme();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();

  const navigation: NavItem[] = useMemo(
    () => [
      { name: "Dashboard", icon: LayoutDashboard, pageKey: "Dashboard", href: "/dashboard", hint: "Pulso general" },
      { name: "Clientes", icon: Users, pageKey: "Clients", href: "/clients", hint: "Propietarios" },
      { name: "Turno de Hoy", icon: ClipboardList, pageKey: "TodayTurns", href: "/today-turns", hint: "Fila clinica" },
      { name: "Pacientes", icon: PawPrint, pageKey: "Patients", href: "/pets", hint: "Mascotas" },
      { name: "Agenda", icon: Calendar, pageKey: "Appointments", href: "/appointments", hint: "Citas" },
      { name: "Inventario", icon: Package, pageKey: "Inventory", href: "/inventory", hint: "Stock" },
      { name: "Facturacion", icon: FileText, pageKey: "Invoices", href: "/invoices", hint: "Cobros" },
      { name: "Servicios", icon: Stethoscope, pageKey: "Services", href: "/services", hint: "Catalogo" },
      { name: "Empleados", icon: IdCardLanyard, pageKey: "Employees", href: "/employees", hint: "Equipo" },
    ],
    []
  );

  const clinicCta = useMemo(
    () => ({ name: "Mi Clinica", icon: Building2, pageKey: "ClinicProfile", href: "/clinic-profile" }),
    []
  );

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login");
        },
      },
    });
  };

  const currentTitle = useMemo(() => {
    const item = navigation.find((n) => pathname === n.href || pathname.startsWith(n.href + "/"));
    if (!item) return "VetCare";
    if (item.pageKey === "Dashboard") return "Panel Principal";
    return item.name;
  }, [navigation, pathname]);

  const currentDescription = useMemo(() => {
    const current = [...navigation, clinicCta].find((item) => pathname === item.href || pathname.startsWith(item.href + "/"));
    return current ? pageDescriptions[current.href] : "Sistema de gestion veterinaria con una vista clara y accionable.";
  }, [clinicCta, navigation, pathname]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const activeClinic = isActive(clinicCta.href);
  const isDark = resolvedTheme === "dark";

  return (
    <div className="app-shell-bg min-h-screen">
      <div className="app-grid pointer-events-none fixed inset-0 opacity-70" />

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed top-0 left-0 z-50 h-full transition-all duration-300 ease-out px-3 py-3 lg:px-4 lg:py-4
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0
        ${collapsed ? "lg:w-28" : "lg:w-[20rem]"}`}
      >
        <div
          className={cn(
            "relative flex h-full flex-col overflow-hidden rounded-[2rem] border p-3",
            isDark
              ? "border-[rgba(149,170,224,0.32)] bg-[linear-gradient(180deg,#2d3a66_0%,#1f2950_100%)]"
              : "glass border-white/35"
          )}
        >
          <div className="pointer-events-none absolute inset-x-5 top-0 h-44 rounded-b-[2rem] bg-[radial-gradient(circle_at_top,rgba(13,148,136,0.24),transparent_62%)]" />

          <div className={cn("relative flex items-center gap-3 rounded-[1.6rem] border px-4 py-4", collapsed ? "justify-center" : "justify-between", isDark ? "border-white/16 bg-white/6" : "border-white/20 bg-white/55")}>
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-[1.35rem] bg-[linear-gradient(135deg,#0d9488_0%,#2d3a66_100%)]">
                <PawPrint className="size-5 text-white" />
              </div>
              {!collapsed && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-w-0">
                  <p className="font-display truncate text-xl font-semibold text-foreground">Karey Vet</p>
                  <p className="mt-0.5 truncate text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Gestion veterinaria
                  </p>
                </motion.div>
              )}
            </div>

            <button
              onClick={() => setCollapsed(!collapsed)}
              className={cn(
                "hidden size-9 shrink-0 items-center justify-center rounded-full border text-muted-foreground transition hover:text-foreground lg:flex",
                isDark ? "border-white/20 bg-white/6" : "border-border/70 bg-background/70"
              )}
              aria-label="Collapse sidebar"
            >
              <ChevronRight className={`size-4 transition-transform ${collapsed ? "" : "rotate-180"}`} />
            </button>
          </div>

          <nav className="relative mt-4 flex-1 space-y-1.5 overflow-y-auto pr-1">
            {navigation.map((item) => {
              const active = isActive(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "group flex rounded-[1.35rem] border py-3 transition-all duration-200",
                    collapsed ? "justify-center gap-0 px-2" : "items-center gap-3 px-3",
                    active
                      ? "border-white/20 bg-[linear-gradient(135deg,rgba(13,148,136,0.92),rgba(45,58,102,0.94))] text-white"
                      : isDark
                        ? "border-transparent text-white/80 hover:border-white/18 hover:bg-white/8 hover:text-white"
                        : "border-transparent text-muted-foreground hover:border-border/60 hover:bg-background/70 hover:text-foreground"
                  )}
                  title={collapsed ? item.name : undefined}
                >
                  <div
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-3xl border transition-colors",
                      active
                        ? "border-white/15 bg-white/12"
                        : isDark
                          ? "border-white/16 bg-white/7 group-hover:border-white/24 group-hover:bg-white/11"
                          : "border-border/60 bg-background/70 group-hover:border-primary/30 group-hover:bg-primary/8"
                    )}
                  >
                    <item.icon className={cn("size-5", collapsed && "mx-auto")} />
                  </div>
                  {!collapsed && (
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold tracking-[0.01em]">{item.name}</p>
                      <p className={cn("truncate text-xs", active ? "text-white/75" : "text-muted-foreground")}>{item.hint}</p>
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="relative mt-4 space-y-3 border-t border-border/70 px-1 pt-4 shrink-0">
            <Link
              href={clinicCta.href}
              onClick={() => setSidebarOpen(false)}
              title={collapsed ? clinicCta.name : undefined}
              className={cn(
                "flex rounded-[1.35rem] border py-3 transition-all duration-200",
                collapsed ? "justify-center gap-0 px-2" : "items-center gap-3 px-3",
                activeClinic
                  ? "border-white/20 bg-[linear-gradient(135deg,rgba(13,148,136,0.92),rgba(45,58,102,0.94))] text-white"
                  : isDark
                    ? "border-white/16 bg-white/5 text-white hover:border-white/24 hover:bg-white/10"
                    : "border-border/70 bg-background/65 text-foreground hover:border-primary/25 hover:bg-background"
              )}
            >
              <div
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-3xl border",
                  activeClinic
                    ? "border-white/15 bg-white/12"
                    : isDark
                      ? "border-white/16 bg-white/7"
                      : "border-border/60 bg-background/70"
                )}
              >
                <clinicCta.icon className={cn("size-5", collapsed && "mx-auto")} />
              </div>
              {!collapsed && (
                <div>
                  <p className="text-sm font-extrabold">{clinicCta.name}</p>
                  <p className={cn("text-xs", activeClinic ? "text-white/75" : "text-muted-foreground")}>Identidad y ajustes</p>
                </div>
              )}
            </Link>

            {!collapsed && (
              <div className="rounded-[1.5rem] border border-white/20 bg-background/72 p-3 dark:bg-white/4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Operacion estable</p>
                    <p className="text-xs text-muted-foreground">Tema {isDark ? "oscuro" : "claro"} activo</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className={`relative transition-all duration-300 ${collapsed ? "lg:pl-28" : "lg:pl-80"}`}>
        <header className="sticky top-0 z-30 px-4 pb-3 pt-4 lg:px-6">
          <div className="glass flex items-center justify-between gap-4 rounded-[1.9rem] px-4 py-4 lg:px-6">
            <div className="flex min-w-0 items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-2xl border border-border/70 bg-background/80 p-2.5 transition-colors hover:bg-background lg:hidden"
                aria-label="Open sidebar"
              >
                <Menu className="size-5 text-foreground" />
              </button>

              <div className="min-w-0">
                <div className="app-kicker mb-2 hidden md:inline-flex">
                  <Activity className="size-3.5" />
                  Operacion diaria
                </div>
                <h1 className="app-heading truncate text-2xl lg:text-[2rem]">{currentTitle}</h1>
                <p className="app-subtle hidden truncate text-sm md:block">{currentDescription}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 lg:gap-3">
              <button className="relative hidden rounded-2xl border border-border/70 bg-background/80 p-2.5 transition-colors hover:bg-background md:inline-flex" aria-label="Search">
                <Search className="size-4 text-muted-foreground" />
              </button>

              <button className="relative rounded-2xl border border-border/70 bg-background/80 p-2.5 transition-colors hover:bg-background" aria-label="Notifications">
                <Bell className="size-4 text-muted-foreground" />
                <span className="absolute right-2 top-2 size-2 rounded-full bg-(--brand-gold)" />
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 rounded-[1.2rem] border border-border/70 bg-background/75 px-2.5 py-2 text-left transition hover:bg-background">
                    <span className="flex size-10 items-center justify-center rounded-3xl bg-[linear-gradient(135deg,rgba(13,148,136,0.18),rgba(45,58,102,0.18))] text-primary">
                      <User className="h-4 w-4"/>
                    </span>

                    <div className="hidden leading-4 md:block">
                      <p className="font-semibold text-foreground">Karen Bautista</p>
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Veterinaria</span>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="start">
                  <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="font-semibold">
                    Perfil
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="font-semibold" onClick={() => handleSignOut()} variant="destructive">
                    <LogOut className="size-4" />
                    Cerrar sesion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="relative">
                    <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                    <span className="sr-only">Toggle theme</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTheme("light")}>
                    Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")}>
                    Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")}>
                    System
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <div className="px-4 pb-8 lg:px-6 lg:pb-10">
          <div className="min-h-[calc(100vh-8rem)]">{children}</div>
        </div>
      </main>
    </div>
  );
}
