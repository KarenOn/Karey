"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CircleHelp,
  Calendar,
  ChevronRight,
  ClipboardList,
  FileText,
  IdCardLanyard,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Plus,
  Package,
  PawPrint,
  ShieldCheck,
  Stethoscope,
  Sun,
  Users,
  User,
  Monitor,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
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
import ClinicAvatar from "@/components/shared/ClinicAvatar";
import { cn } from "@/lib/utils";
import type { CurrentUserProfile } from "@/lib/current-user-profile";
import ClinicOnboardingModal from "@/components/layout/ClinicOnboardingModal";
import { CurrentUserProvider } from "@/components/layout/current-user-context";
import EmailVerificationBanner from "@/components/layout/EmailVerificationBanner";
import GlobalSearch from "@/components/layout/GlobalSearch";
import AppointmentNowAlert from "@/components/layout/AppointmentNowAlert";

type ModuleKey =
  | "dashboard"
  | "clients"
  | "pets"
  | "today"
  | "todayTurns"
  | "appointments"
  | "inventory"
  | "invoices"
  | "services"
  | "employees"
  | "clinicProfile";

type NavItem = {
  name: string;
  icon: React.ElementType;
  href: string;
  pageKey: string;
  hint: string;
  moduleKey: Exclude<ModuleKey, "clinicProfile">;
};

type AppSidebarProps = {
  children: React.ReactNode;
  initialUser?: CurrentUserProfile | null;
};

const routeModuleMap: Array<{ prefix: string; moduleKey: ModuleKey }> = [
  { prefix: "/today", moduleKey: "today" },
  { prefix: "/dashboard", moduleKey: "dashboard" },
  { prefix: "/clients", moduleKey: "clients" },
  { prefix: "/pets", moduleKey: "pets" },
  { prefix: "/today-turns", moduleKey: "todayTurns" },
  { prefix: "/appointments", moduleKey: "appointments" },
  { prefix: "/inventory", moduleKey: "inventory" },
  { prefix: "/invoices", moduleKey: "invoices" },
  { prefix: "/services", moduleKey: "services" },
  { prefix: "/employees", moduleKey: "employees" },
  { prefix: "/clinic-profile", moduleKey: "clinicProfile" },
];

export default function AppShell({ children, initialUser = null }: AppSidebarProps) {
  const { setTheme } = useTheme();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUserProfile | null>(initialUser);
  const router = useRouter();

  const navigation: NavItem[] = useMemo(
    () => [
      {
        name: "Hoy",
        icon: ClipboardList,
        pageKey: "Today",
        href: "/today",
        hint: "Centro operativo",
        moduleKey: "today",
      },
      {
        name: "Resumen",
        icon: LayoutDashboard,
        pageKey: "Dashboard",
        href: "/dashboard",
        hint: "Indicadores",
        moduleKey: "dashboard",
      },
      {
        name: "Clientes",
        icon: Users,
        pageKey: "Clients",
        href: "/clients",
        hint: "Propietarios",
        moduleKey: "clients",
      },
      {
        name: "Pacientes",
        icon: PawPrint,
        pageKey: "Patients",
        href: "/pets",
        hint: "Mascotas",
        moduleKey: "pets",
      },
      {
        name: "Agenda",
        icon: Calendar,
        pageKey: "Appointments",
        href: "/appointments",
        hint: "Citas",
        moduleKey: "appointments",
      },
      {
        name: "Inventario",
        icon: Package,
        pageKey: "Inventory",
        href: "/inventory",
        hint: "Existencias",
        moduleKey: "inventory",
      },
      {
        name: "Facturación",
        icon: FileText,
        pageKey: "Invoices",
        href: "/invoices",
        hint: "Cobros",
        moduleKey: "invoices",
      },
      {
        name: "Servicios",
        icon: Stethoscope,
        pageKey: "Services",
        href: "/services",
        hint: "Catálogo",
        moduleKey: "services",
      },
      {
        name: "Equipo",
        icon: IdCardLanyard,
        pageKey: "Employees",
        href: "/employees",
        hint: "Roles y permisos",
        moduleKey: "employees",
      },
    ],
    []
  );

  const clinicCta = useMemo(
    () => ({
      name: "Clínica",
      pageKey: "ClinicProfile",
      href: "/clinic-profile",
      moduleKey: "clinicProfile" as const,
    }),
    []
  );

  useEffect(() => {
    let mounted = true;

    async function loadCurrentUser() {
      try {
        const res = await fetch("/api/profile", { cache: "no-store" });
        const data = (await res.json().catch(() => null)) as CurrentUserProfile | null;

        if (!mounted || !res.ok || !data) {
          return;
        }

        setCurrentUser(data);
      } catch {
        // noop
      }
    }

    if (!initialUser) {
      void loadCurrentUser();
    }

    const handleProfileUpdated = () => {
      void loadCurrentUser();
    };

    window.addEventListener("user-profile-updated", handleProfileUpdated);

    return () => {
      mounted = false;
      window.removeEventListener("user-profile-updated", handleProfileUpdated);
    };
  }, [initialUser]);

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login");
        },
      },
    });
  };

  const availableNavigation = useMemo(() => {
    if (!currentUser) {
      return navigation;
    }

    return navigation.filter((item) => currentUser.access.modules[item.moduleKey]);
  }, [currentUser, navigation]);

  const currentModuleAllowed = useMemo(() => {
    if (!currentUser) {
      return true;
    }

    const match = routeModuleMap.find(
      (item) => pathname === item.prefix || pathname.startsWith(`${item.prefix}/`)
    );

    return match ? currentUser.access.modules[match.moduleKey] : true;
  }, [currentUser, pathname]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const activeClinic = isActive(clinicCta.href);
  const userInitials =
    currentUser?.name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U";

  return (
    <CurrentUserProvider value={currentUser}>
      <div className="app-shell-bg min-h-screen">
        <div className="app-grid pointer-events-none fixed inset-0 opacity-70" />

        <AnimatePresence>
          {sidebarOpen ? (
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden"
              aria-label="Cerrar menú lateral"
            />
          ) : null}
        </AnimatePresence>

        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 -translate-x-full transition-transform duration-200 lg:translate-x-0",
            sidebarOpen && "translate-x-0",
            collapsed ? "w-[6.5rem]" : "w-[16rem]"
          )}
        >
          <div className="flex h-full flex-col border-r border-sidebar-border bg-sidebar px-3 py-4">
            <div className="flex items-center justify-between gap-3 px-1">
              <Link
                href="/today"
                className={cn(
                  "flex min-w-0 items-center gap-3 rounded-xl px-2 py-2",
                  collapsed && "justify-center"
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <PawPrint className="h-5 w-5" />
                </div>
                {!collapsed ? (
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-sidebar-foreground">
                      Karey Vet
                    </p>
                    <p className="truncate text-xs text-sidebar-muted">
                      Gestión veterinaria
                    </p>
                  </div>
                ) : null}
              </Link>

              <button
                type="button"
                onClick={() => setCollapsed((current) => !current)}
                className="hidden h-9 w-9 items-center justify-center rounded-lg border border-sidebar-border text-sidebar-muted transition hover:bg-muted hover:text-sidebar-foreground lg:inline-flex"
                aria-label="Contraer menú lateral"
              >
                <ChevronRight
                  className={cn("h-4 w-4 transition-transform", !collapsed && "rotate-180")}
                />
              </button>
            </div>

            <nav className="mt-6 flex-1 space-y-1 overflow-y-auto pr-1">
              {availableNavigation.map((item) => {
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    title={collapsed ? item.name : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                      collapsed && "justify-center px-2",
                      active
                        ? "bg-sidebar-active text-sidebar-foreground"
                        : "text-sidebar-muted hover:bg-muted/70 hover:text-foreground"
                    )}
                  >
                    {active && !collapsed ? (
                      <span className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-primary" />
                    ) : null}
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
                        active
                          ? "border-primary/15 bg-white text-primary dark:bg-primary/10"
                          : "border-transparent bg-transparent group-hover:border-border group-hover:bg-background"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                    </div>
                    {!collapsed ? (
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{item.name}</p>
                        <p className="truncate text-xs text-sidebar-muted">{item.hint}</p>
                      </div>
                    ) : null}
                  </Link>
                );
              })}
            </nav>

            {currentUser?.access.modules.clinicProfile ? (
              <div className="mt-4 border-t border-sidebar-border pt-4">
                <Link
                  href={clinicCta.href}
                  onClick={() => setSidebarOpen(false)}
                  title={collapsed ? clinicCta.name : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                    collapsed && "justify-center px-2",
                    activeClinic
                      ? "bg-sidebar-active text-sidebar-foreground"
                      : "text-sidebar-muted hover:bg-muted/70 hover:text-foreground"
                  )}
                >
                  <ClinicAvatar
                    name={currentUser?.clinicName ?? clinicCta.name}
                    logoUrl={currentUser?.clinicLogoUrl ?? null}
                    className={cn(
                      "h-9 w-9 shrink-0 rounded-lg border",
                      activeClinic
                        ? "border-primary/15 bg-white dark:bg-primary/10"
                        : "border-sidebar-border bg-background"
                    )}
                    iconClassName="h-4 w-4"
                  />
                  {!collapsed ? (
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{clinicCta.name}</p>
                      <p className="truncate text-xs text-sidebar-muted">
                        Identidad y ajustes
                      </p>
                    </div>
                  ) : null}
                </Link>
              </div>
            ) : null}
          </div>
        </aside>

        <main
          className={cn(
            "relative min-h-screen transition-[padding] duration-200",
            collapsed ? "lg:pl-[6.5rem]" : "lg:pl-[16rem]"
          )}
        >
          <AppointmentNowAlert />
          <header className="sticky top-0 z-20 border-b border-border/70 bg-header/95 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-4 px-4 lg:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background text-foreground transition hover:bg-secondary lg:hidden"
                  aria-label="Abrir menú lateral"
                >
                  <Menu className="h-5 w-5" />
                </button>

                <GlobalSearch />
              </div>

              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="hidden sm:inline-flex"><Plus className="h-4 w-4" />Nuevo</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild><Link href="/clients?action=new"><User className="h-4 w-4" /> Cliente</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link href="/invoices/new"><FileText className="h-4 w-4" /> Factura</Link></DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" aria-label="Ayuda y atajos"><CircleHelp className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel>Ayuda rápida</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild><Link href="/today">Consulta el centro operativo</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link href="/appointments">Gestiona citas desde Agenda</Link></DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled>Buscar en toda la app: Ctrl K</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <button
                  type="button"
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                  aria-label="Notificaciones"
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--brand-gold)]" />
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Sun className="h-[1.1rem] w-[1.1rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                      <Moon className="absolute h-[1.1rem] w-[1.1rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                      <span className="sr-only">Cambiar tema</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setTheme("light")}>
                      <Sun className="h-4 w-4" />
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("dark")}>
                      <Moon className="h-4 w-4" />
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("system")}>
                      <Monitor className="h-4 w-4" />
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-3 rounded-lg border border-border bg-background px-2.5 py-2 text-left transition hover:bg-secondary">
                      <span className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-primary/10 text-primary">
                        {currentUser?.avatarUrl ? (
                          <Image
                            alt={currentUser.name}
                            className="object-cover"
                            fill
                            sizes="36px"
                            src={currentUser.avatarUrl}
                          />
                        ) : (
                          <span className="text-xs font-semibold uppercase">{userInitials}</span>
                        )}
                      </span>

                      <div className="hidden leading-4 md:block">
                        <p className="font-semibold text-foreground">
                          {currentUser?.name ?? "Mi cuenta"}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {currentUser?.roleLabel ?? "Usuario"}
                        </span>
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {currentUser?.isGlobalAdmin ? (
                      <DropdownMenuItem asChild>
                        <Link href="/admin/clinics">Administración</Link>
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuItem asChild>
                      <Link href="/profile">Perfil</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleSignOut()}
                      variant="destructive"
                    >
                      <LogOut className="h-4 w-4" />
                      Cerrar sesión
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <div className="px-4 py-5 lg:px-6 lg:py-6">
            <div className="mx-auto max-w-[1440px]">
              <EmailVerificationBanner />
              {currentModuleAllowed ? (
                children
              ) : (
                <div className="app-panel-strong mx-auto flex max-w-3xl flex-col items-start gap-4 p-8">
                  <div className="app-stat-icon h-12 w-12">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">
                      No tienes acceso a esta sección
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Tu rol actual no incluye permisos para entrar aquí. Si necesitas
                      acceso, comunícate con el administrador de la clínica.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
        <ClinicOnboardingModal />
      </div>
    </CurrentUserProvider>
  );
}
