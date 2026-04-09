import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  UserPlus,
  PawPrint,
  CalendarPlus,
  FileText,
  Package,
  Syringe,
} from "lucide-react";

const actions = [
  {
    name: "Nuevo Cliente",
    icon: UserPlus,
    page: "/clients",
    params: "?action=new",
    description: "Registrar un nuevo cliente en el sistema",
    color: "bg-linear-to-br from-blue-500 to-blue-600",
  },
  {
    name: "Nuevo Paciente",
    icon: PawPrint,
    page: "/pets",
    params: "?action=new",
    color: "bg-linear-to-br from-teal-500 to-teal-600",
    description: "Agregar un nuevo paciente a la base de datos",
  },
  {
    name: "Agendar Cita",
    icon: CalendarPlus,
    page: "/appointments",
    params: "?action=new",
    color: "bg-linear-to-br from-purple-500 to-purple-600",
    description: "Programar una nueva cita para un paciente",
  },
  {
    name: "Nueva Factura",
    icon: FileText,
    page: "/invoices",
    params: "?action=new",
    color: "bg-linear-to-br from-orange-500 to-orange-600",
    description: "Crear una nueva factura en el sistema",
  },
  {
    name: "Vacunacion",
    icon: Syringe,
    page: "/pets",
    params: "?tab=vaccinations",
    color: "bg-linear-to-br from-pink-500 to-pink-600",
    description: "Registrar una nueva vacunación para un paciente",
  },
  {
    name: "Inventario",
    icon: Package,
    page: "/inventory",
    params: "",
    color: "bg-linear-to-br from-green-500 to-green-600",
    description: "Gestionar el inventario de la clinica",
  },
];

export default function QuickActions() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="app-panel-strong p-6"
    >
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">Acciones rapidas</p>
          <h3 className="font-display text-2xl font-semibold text-foreground">Funciones rápidas</h3>
        </div>
        {/* <p className="hidden max-w-sm text-right text-sm text-muted-foreground lg:block">Cada acceso mantiene el mismo lenguaje visual para que la navegacion se sienta consistente y rapida.</p> */}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {actions.map((action, index) => (
          <Link key={action.name} href={`${action.page}${action.params}`} className="group">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * index }}
              className="app-panel-muted flex h-full flex-col items-start gap-3 p-4 transition-all duration-200 group-hover:-translate-y-1"
            >
              <div className={`rounded-[1.1rem] p-3 ${action.color} shadow-[0_16px_30px_rgba(16,30,60,0.2)]`}>
                <action.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="block text-sm font-extrabold text-foreground">{action.name}</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">{action.description}</span>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
