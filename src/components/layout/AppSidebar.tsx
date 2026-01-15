"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "next-themes"
import { Button } from "../ui/button";

type NavItem = {
  name: string;
  icon: React.ElementType;
  href: string;
  pageKey: string;
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { setTheme } = useTheme()
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const navigation: NavItem[] = useMemo(
    () => [
      { name: "Dashboard", icon: LayoutDashboard, pageKey: "Dashboard", href: "/dashboard" },
      { name: "Clientes", icon: Users, pageKey: "Clients", href: "/clients" },
      { name: "Turno de Hoy", icon: ClipboardList, pageKey: "TodayTurns", href: "/today-turns" },
      { name: "Pacientes", icon: PawPrint, pageKey: "Patients", href: "/pets" },
      { name: "Agenda", icon: Calendar, pageKey: "Appointments", href: "/appointments" },
      { name: "Inventario", icon: Package, pageKey: "Inventory", href: "/inventory" },
      { name: "Facturación", icon: FileText, pageKey: "Invoices", href: "/invoices" },
      { name: "Servicios", icon: Stethoscope, pageKey: "Services", href: "/services" },
    ],
    []
  );

  const clinicCta = useMemo(
    () => ({ name: "Mi Clínica", icon: Building2, pageKey: "ClinicProfile", href: "/clinic-profile" }),
    []
  );

  const currentTitle = useMemo(() => {
    // título según ruta (para que no dependas de currentPageName prop)
    const item = navigation.find((n) => pathname === n.href || pathname.startsWith(n.href + "/"));
    if (!item) return "VetCare";
    if (item.pageKey === "Dashboard") return "Panel Principal";
    return item.name;
  }, [navigation, pathname]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const activeClinic = isActive(clinicCta.href);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-slate-100">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full transition-all duration-300 ease-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0
        ${collapsed ? "lg:w-20" : "lg:w-64"}`}
      >
        {/* <div className="h-full glass rounded-r-3xl shadow-xl overflow-hidden">
          <div className="p-6 border-b border-white/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg">
                <PawPrint className="w-5 h-5 text-white" />
              </div>
              {!collapsed && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col">
                  <span className="text-lg font-bold text-slate-800">VetCare</span>
                  <span className="text-xs text-slate-500">Sistema Veterinario</span>
                </motion.div>
              )}
            </div>
          </div>

          <nav className="p-4 space-y-2">
            {navigation.map((item) => {
              const active = isActive(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href} // ✅ Next usa href, no "to"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                    ${active ? "nav-item-active text-white" : "text-slate-600 hover:bg-teal-50 hover:text-teal-700"}
                  `}
                >
                  <item.icon className={`w-5 h-5 ${collapsed ? "mx-auto" : ""}`} />
                  {!collapsed && <span className="font-medium">{item.name}</span>}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-white/20 shrink-0">
            <Link
              href={clinicCta.href}
              onClick={() => setSidebarOpen(false)}
              title={collapsed ? clinicCta.name : undefined}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                    ${activeClinic ? "nav-item-active text-white" : "text-slate-600 hover:bg-teal-50 hover:text-teal-700"}
                  `}
            >
              <clinicCta.icon className={`w-5 h-5 ${collapsed ? "" : "mr-3"}`} />
              {!collapsed && <span className="font-semibold">{clinicCta.name}</span>}
            </Link>
          </div>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex absolute bottom-6 right-4 w-8 h-8 items-center justify-center rounded-full bg-white shadow-lg hover:shadow-xl transition-all"
          >
            <ChevronRight className={`w-4 h-4 text-slate-600 transition-transform ${collapsed ? "" : "rotate-180"}`} />
          </button>
        </div> */}

        <div className="h-full glass rounded-r-3xl shadow-xl overflow-hidden flex flex-col relative">
          {/* Logo */}
          <div className="p-6 border-b border-white/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg">
                <PawPrint className="w-5 h-5 text-white" />
              </div>
              {!collapsed && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col">
                  <span className="text-lg font-bold text-slate-800">VetCare</span>
                  <span className="text-xs text-slate-500">Sistema Veterinario</span>
                </motion.div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
            {navigation.map((item) => {
              const active = isActive(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                    ${active ? "nav-item-active text-white" : "text-slate-600 hover:bg-teal-50 hover:text-teal-700"}
                  `}
                >
                  <item.icon className={`w-5 h-5 ${collapsed ? "mx-auto" : ""}`} />
                  {!collapsed && <span className="font-medium">{item.name}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Mi Clínica (footer) */}
          <div className="p-4 border-t border-white/20 shrink-0">
            <Link
              href={clinicCta.href}
              onClick={() => setSidebarOpen(false)}
              title={collapsed ? clinicCta.name : undefined}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                ${activeClinic ? "nav-item-active text-white" : "text-slate-600 hover:bg-teal-50 hover:text-teal-700"}
              `}
            >
              <clinicCta.icon className={`w-5 h-5 ${collapsed ? "mx-auto" : ""}`} />
              {!collapsed && <span className="font-semibold">{clinicCta.name}</span>}
            </Link>
          </div>

          {/* Collapse button (desktop only) -> arriba del footer */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex absolute bottom-[88px] right-4 w-8 h-8 items-center justify-center rounded-full bg-white shadow-lg hover:shadow-xl transition-all"
            aria-label="Collapse sidebar"
          >
            <ChevronRight className={`w-4 h-4 text-slate-600 transition-transform ${collapsed ? "" : "rotate-180"}`} />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={`transition-all duration-300 ${collapsed ? "lg:pl-20" : "lg:pl-64"}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 glass border-b border-white/20">
          <div className="flex items-center justify-between px-4 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl hover:bg-white/50 transition-colors"
                aria-label="Open sidebar"
              >
                <Menu className="w-6 h-6 text-slate-700" />
              </button>

              <div>
                <h1 className="text-xl font-bold text-slate-800">{currentTitle}</h1>
                <p className="text-sm text-slate-500">Bienvenido al sistema VetCare</p>
              </div>
            </div>

            <div className="flex items-center gap-10">
              <button className="relative p-2 rounded-xl hover:bg-white/50 transition-colors" aria-label="Notifications">
                <Bell className="w-5 h-5 text-slate-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-pink-500 rounded-full" />
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-teal-100 text-teal-700 rounded-md">
                      <User className="h-4 w-4"/>
                    </span>

                    <div className="leading-4">
                      <p className="font-semibold">Karen Bautista</p>
                      <span className="text-sm text-muted-foreground">Veterinario</span>
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="start">
                    <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="font-semibold">
                      Perfil
                    </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-500 font-semibold">
                    Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
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

        {/* Page content */}
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}