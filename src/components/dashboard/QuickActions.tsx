import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  UserPlus, 
  PawPrint, 
  CalendarPlus, 
  FileText, 
  Package,
  Syringe
} from "lucide-react";

const actions = [
  { 
    name: "Nuevo Cliente", 
    icon: UserPlus, 
    page: "/clients", 
    params: "?action=new",
    color: "bg-gradient-to-br from-blue-500 to-blue-600"
  },
  { 
    name: "Nuevo Paciente", 
    icon: PawPrint, 
    page: "/pets", 
    params: "?action=new",
    color: "bg-gradient-to-br from-teal-500 to-teal-600"
  },
  { 
    name: "Agendar Cita", 
    icon: CalendarPlus, 
    page: "/appointments", 
    params: "?action=new",
    color: "bg-gradient-to-br from-purple-500 to-purple-600"
  },
  { 
    name: "Nueva Factura", 
    icon: FileText, 
    page: "/invoices", 
    params: "?action=new",
    color: "bg-gradient-to-br from-orange-500 to-orange-600"
  },
  { 
    name: "Vacunación", 
    icon: Syringe, 
    page: "/pets", 
    params: "?tab=vaccinations",
    color: "bg-gradient-to-br from-pink-500 to-pink-600"
  },
  { 
    name: "Inventario", 
    icon: Package, 
    page: "/inventory", 
    params: "",
    color: "bg-gradient-to-br from-green-500 to-green-600"
  },
];

export default function QuickActions() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white rounded-2xl shadow-sm p-6"
    >
      <h3 className="text-lg font-bold text-slate-800 mb-4">Accesos Rápidos</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {actions.map((action, index) => (
          <Link
            key={action.name}
            href={action.page + '/' + action.params}
            className="group"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * index }}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all group-hover:scale-105"
            >
              <div className={`p-3 rounded-xl ${action.color} shadow-lg`}>
                <action.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-medium text-slate-600 text-center">{action.name}</span>
            </motion.div>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}