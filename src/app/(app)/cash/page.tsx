"use client";

import { useEffect, useState } from "react";
import { Banknote, ChevronRight, Eye, LoaderCircle, LockKeyhole, Plus } from "lucide-react";
import Link from "next/link";
import AppPageHero from "@/components/shared/AppPageHero";
import { AppAlert } from "@/components/shared/AppAlert";
import FormField, {
  type FormFieldChangeEvent,
} from "@/components/shared/FormField";
import Modal from "@/components/shared/Modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DataTable, { type DataTableColumn } from "@/components/shared/Datatable";
import { useCurrentUserAccess, useCurrentUserProfile } from "@/components/layout/current-user-context";
import {
  apiCloseCashSession,
  apiCreateCashMovement,
  apiGetCashRegisters,
  apiGetCashSessions,
  apiOpenCashSession,
  type CashSession,
} from "@/lib/api/cash-sessions";
import { formatCurrency } from "@/lib/utility";
import { formatClinicDateTime, formatClinicDate } from "@/lib/formatters";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

type AlertState = {
  open: boolean;
  variant: "success" | "warning" | "destructive";
  title: string;
  description?: string;
};

const emptyMovement = {
  type: "CASH_IN" as const,
  amount: "",
  concept: "",
  note: "",
};

type CashHistoryRow = {
  id: number;
  openedAt: string;
  openedByName: string;
  registerName: string;
  totalCollected: string;
  expectedCash: string | null;
  countedCash: string | null;
  difference: string | null;
  session: CashSession;
};

function sessionDateKey(value: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export default function CashPage() {
  const access = useCurrentUserAccess();
  const profile = useCurrentUserProfile();
  const currency = profile?.clinicCurrency ?? "DOP";
  const timezone = profile?.clinicTimezone ?? "America/Santo_Domingo";
  const [loading, setLoading] = useState(true);
  const [openSession, setOpenSession] = useState<CashSession | null>(null);
  const [openSessions, setOpenSessions] = useState<CashSession[]>([]);
  const [registers, setRegisters] = useState<
    Array<{
      id: number;
      name: string;
      isActive: boolean;
      sessions: Array<{ id: number }>;
    }>
  >([]);
  const [registerId, setRegisterId] = useState("");
  const [history, setHistory] = useState<CashSession[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [movementModal, setMovementModal] = useState(false);
  const [detail, setDetail] = useState<CashSession | null>(null);
  const [openingFloat, setOpeningFloat] = useState("");
  const [countedCash, setCountedCash] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [movement, setMovement] = useState(emptyMovement);
  const [dateFilter, setDateFilter] = useState<"ALL" | "TODAY" | "CUSTOM">("ALL");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [busyAction, setBusyAction] = useState<"open" | "close" | "movement" | null>(null);
  const [alert, setAlert] = useState<AlertState>({
    open: false,
    variant: "success",
    title: "",
  });

  const canRead = !!access?.actions.cash.read;
  const canOperate = !!access?.actions.cash.operate;
  const canOpen = !!access?.actions.cash.open;
  const canClose = !!access?.actions.cash.close;
  const canCloseAny = !!access?.actions.cash.closeAny;
  const canCloseSelected = !!openSession && canClose && (canCloseAny || openSession.openedBy.id === profile?.userId);

  async function load(options?: { preserveSessionId?: number }) {
    setLoading(true);
    try {
      const [data, availableRegisters] = await Promise.all([
        apiGetCashSessions(),
        apiGetCashRegisters(),
      ]);
      const nextOpenSessions = data.openSessions ?? (data.openSession ? [data.openSession] : []);
      setOpenSessions(nextOpenSessions);
      const preservedSession = options?.preserveSessionId
        ? nextOpenSessions.find((session) => session.id === options.preserveSessionId)
        : null;
      setOpenSession(preservedSession ?? data.openSession);
      setHistory(data.history);
      setRegisters(availableRegisters);
      setRegisterId(
        (current) =>
          current ||
          (availableRegisters.length === 1
            ? String(availableRegisters[0].id)
            : ""),
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes("desactivado")) {
        setOpenSession(null);
        setOpenSessions([]);
        setRegisters([]);
        setHistory([]);
        return;
      }
      setAlert({
        open: true,
        variant: "destructive",
        title: "No se pudo cargar caja",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
      });
    } finally {
      setLoading(false);
      setBusyAction(null);
    }
  }

  useEffect(() => {
    if (canRead) void load();
    else setLoading(false);
  }, [canRead]);

  const onField = (event: FormFieldChangeEvent) => {
    const key = event.target.name as keyof typeof movement;
    setMovement((current) => ({
      ...current,
      [key]: String(event.target.value ?? ""),
    }));
  };

  async function openCash() {
    const amount = Number(openingFloat);
    if (!Number.isFinite(amount) || amount < 0)
      return setAlert({
        open: true,
        variant: "warning",
        title: "Ingresa un fondo inicial válido.",
      });
    if (!registerId)
      return setAlert({
        open: true,
        variant: "warning",
        title: "Selecciona una caja activa.",
      });
    setBusyAction("open");
    try {
      await apiOpenCashSession(amount, Number(registerId));
      setOpenModal(false);
      setOpeningFloat("");
      await load();
      setAlert({ open: true, variant: "success", title: "Caja abierta" });
    } catch (error) {
      setAlert({
        open: true,
        variant: "destructive",
        title: "No se pudo abrir caja",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function createMovement() {
    if (!openSession || busyAction !== null) return;
    const amount = Number(movement.amount);
    if (!Number.isFinite(amount) || amount <= 0 || !movement.concept.trim())
      return setAlert({
        open: true,
        variant: "warning",
        title: "Completa monto y concepto.",
      });
    setBusyAction("movement");
    try {
      await apiCreateCashMovement(openSession.id, {
        ...movement,
        amount,
        note: movement.note.trim() || null,
      });
      setMovementModal(false);
      setMovement(emptyMovement);
      await load({ preserveSessionId: openSession.id });
      setAlert({
        open: true,
        variant: "success",
        title: "Movimiento registrado",
      });
    } catch (error) {
      setAlert({
        open: true,
        variant: "destructive",
        title: "No se pudo registrar movimiento",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function closeCash() {
    if (!openSession) return;
    const amount = Number(countedCash);
    if (!Number.isFinite(amount) || amount < 0)
      return setAlert({
        open: true,
        variant: "warning",
        title: "Ingresa efectivo contado válido.",
      });
    const isForeignSession = openSession.openedBy.id !== profile?.userId;
    if (isForeignSession && !closingNotes.trim())
      return setAlert({
        open: true,
        variant: "warning",
        title: "Indica el motivo del cierre por otro usuario.",
      });
    setBusyAction("close");
    try {
      await apiCloseCashSession(
        openSession.id,
        amount,
        closingNotes.trim() || null,
      );
      setCloseModal(false);
      setCountedCash("");
      setClosingNotes("");
      await load();
      setAlert({ open: true, variant: "success", title: "Caja cerrada" });
    } catch (error) {
      setAlert({
        open: true,
        variant: "destructive",
        title: "No se pudo cerrar caja",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
      });
    } finally {
      setBusyAction(null);
    }
  }

  const todayKey = sessionDateKey(new Date().toISOString(), timezone);
  const customFrom = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : null;
  const customTo = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : customFrom;
  const filteredHistory = history.filter((session) => {
    const key = sessionDateKey(session.openedAt, timezone);
    if (dateFilter === "TODAY") return key === todayKey;
    if (dateFilter === "CUSTOM" && customFrom) return key >= customFrom && key <= (customTo ?? customFrom);
    return true;
  });
  const historyRows: CashHistoryRow[] = filteredHistory.map((session) => ({
    id: session.id,
    openedAt: session.openedAt,
    openedByName: session.openedBy.name,
    registerName: session.register.name,
    totalCollected: session.totalCollected,
    expectedCash: session.expectedCash,
    countedCash: session.countedCash,
    difference: session.difference,
    session,
  }));
  const historyColumns: DataTableColumn<CashHistoryRow>[] = [
    { header: "Fecha", accessorKey: "openedAt", cell: (row) => formatClinicDate(row.openedAt, timezone) },
    { header: "Caja", accessorKey: "registerName" },
    { header: "Responsable", accessorKey: "openedByName" },
    { header: "Cobrado", cell: (row) => formatCurrency(Number(row.totalCollected), currency) },
    { header: "Diferencia", cell: (row) => row.difference == null ? "-" : formatCurrency(Number(row.difference), currency) },
    { header: "Estado", cell: () => <Badge variant="outline">Cerrada</Badge> },
    {
      header: "Detalle",
      cell: (row) => (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Ver detalle de sesión ${row.id}`}
          onClick={(event) => {
            event.stopPropagation();
            setDetail(row.session);
          }}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  if (!canRead)
    return (
      <div className="app-panel-strong p-6 text-sm text-muted-foreground">
        No tienes permiso para consultar caja.
      </div>
    );
  if (loading)
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-b-2 border-teal-600" />
      </div>
    );

  return (
    <div className="space-y-6">
      <AppPageHero
        badgeIcon={<Banknote className="size-3.5" />}
        badgeLabel="Caja"
        title="Caja diaria"
        description="Controla cobros, movimientos y cierre de efectivo de tu clínica."
        actions={
          openSession ? (
            <div className="flex flex-wrap gap-2">
              {canOperate ? (
                <Button
                  variant="outline"
                  onClick={() => setMovementModal(true)}
                  disabled={busyAction !== null}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Movimiento
                </Button>
              ) : null}
              {canCloseSelected ? (
                <Button onClick={() => setCloseModal(true)} disabled={busyAction !== null}>
                  <LockKeyhole className="mr-2 h-4 w-4" />
                  Cerrar caja
                </Button>
              ) : null}
            </div>
          ) : canOpen ? (
            <Button onClick={() => setOpenModal(true)} disabled={busyAction !== null}>
              <Banknote className="mr-2 h-4 w-4" />
              Abrir caja
            </Button>
          ) : null
        }
        stats={
          openSession
            ? [
                {
                  label: "Cobrado",
                  value: formatCurrency(Number(openSession.totalCollected), currency),
                  hint: "Todos los métodos",
                },
                {
                  label: "Efectivo esperado",
                  value: formatCurrency(Number(openSession.expectedCash), currency),
                  hint: "Fondo + efectivo",
                },
                {
                  label: "Movimientos",
                  value: openSession.movements.length,
                  hint: "Entradas y salidas",
                },
              ]
            : [
                {
                  label: "Estado",
                  value: "Cerrada",
                  hint: "No hay sesión activa",
                },
                {
                  label: "Historial",
                  value: history.length,
                  hint: "Sesiones registradas",
                },
              ]
        }
      />

      {openSessions.length > 1 ? (
        <section className="app-panel-strong p-5 sm:p-6">
          <h2 className="font-display text-2xl text-foreground">
            Cajas abiertas
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {openSessions.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => setOpenSession(session)}
                className={`rounded-lg border p-4 text-left ${openSession?.id === session.id ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <p className="font-semibold">{session.register.name}</p>
                <p className="text-xs text-muted-foreground">
                  {session.openedBy.name} ·{" "}
                  {formatClinicDateTime(session.openedAt, timezone)}
                </p>
                <p className="mt-2 font-semibold">
                      {formatCurrency(Number(session.expectedCash), currency)} esperado
                </p>
              </button>
            ))}
          </div>
        </section>
      ) : null}
      {openSession ? (
        <section className="app-panel-strong space-y-5 p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-2xl text-foreground">
                  Sesión abierta
                </h2>
                <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700">
                  Abierta
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Responsable: {openSession.openedBy.name} ·{" "}
                {formatClinicDateTime(openSession.openedAt, timezone)}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Fondo inicial:{" "}
              <strong className="text-foreground">
                {formatCurrency(Number(openSession.openingFloat), currency)}
              </strong>
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Metric label="Cobros" value={openSession.totalCollected} currency={currency} />
            <Metric label="Efectivo" value={openSession.cashPayments} currency={currency} />
            <Metric label="Entradas" value={openSession.cashIn} currency={currency} />
            <Metric label="Salidas" value={openSession.cashOut} currency={currency} />
            <Metric
              label="Esperado"
              value={openSession.expectedCash}
              currency={currency}
              emphasis
            />
          </div>
        </section>
      ) : (
        <div className="app-panel-muted p-6 text-sm text-muted-foreground">
          No hay caja abierta. Abre una sesión para asociar automáticamente
          nuevos pagos.
        </div>
      )}

      <DataTable<CashHistoryRow>
        title="Historial de caja"
        description="Consulta aperturas y cierres anteriores."
        columns={historyColumns}
        data={historyRows}
        searchKeys={["registerName", "openedByName"]}
        searchPlaceholder="Buscar por caja o responsable..."
        emptyMessage="Aún no hay sesiones para este filtro."
        actions={
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Select
              value={dateFilter}
              onValueChange={(value) => {
                setDateFilter(value as "ALL" | "TODAY" | "CUSTOM");
                if (value !== "CUSTOM") setDateRange(undefined);
              }}
            >
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Fecha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas las fechas</SelectItem>
                <SelectItem value="TODAY">Hoy</SelectItem>
                <SelectItem value="CUSTOM">Elegir fecha o rango</SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start sm:w-auto">
                  {dateRange?.from
                    ? dateRange.to
                      ? `${format(dateRange.from, "dd/MM/yyyy")} – ${format(dateRange.to, "dd/MM/yyyy")}`
                      : format(dateRange.from, "dd/MM/yyyy")
                    : "Elegir fecha o rango"}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto max-w-[calc(100vw-2rem)] p-0">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => {
                    setDateRange(range);
                    setDateFilter("CUSTOM");
                  }}
                  numberOfMonths={1}
                />
              </PopoverContent>
            </Popover>
          </div>
        }
      />

      <Modal
        open={openModal}
        onClose={() => setOpenModal(false)}
        title="Abrir caja"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setOpenModal(false)} disabled={busyAction === "open"}>
              Cancelar
            </Button>
            <Button onClick={() => void openCash()} disabled={busyAction !== null}>
              {busyAction === "open" ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
              {busyAction === "open" ? "Abriendo…" : "Abrir caja"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <FormField
            label="Caja"
            name="registerId"
            type="select"
            value={registerId}
            options={registers
              .filter((item) => item.isActive && item.sessions.length === 0)
              .map((item) => ({ value: String(item.id), label: item.name }))}
            onChange={(event) => setRegisterId(String(event.target.value))}
            required
          />
          <FormField
            label="Fondo inicial"
            name="openingFloat"
            type="number"
            value={openingFloat}
            onChange={(event) => setOpeningFloat(String(event.target.value))}
            placeholder="0.00"
            helperText="Efectivo físico disponible al iniciar la sesión."
          />
        </div>
      </Modal>
      <Modal
        open={movementModal}
        onClose={() => setMovementModal(false)}
        title="Movimiento manual"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setMovementModal(false)} disabled={busyAction === "movement"}>
              Cancelar
            </Button>
            <Button onClick={() => void createMovement()} disabled={busyAction !== null}>
              {busyAction === "movement" ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
              {busyAction === "movement" ? "Guardando…" : "Guardar movimiento"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <FormField
            label="Tipo"
            name="type"
            type="select"
            value={movement.type}
            options={[
              { value: "CASH_IN", label: "Entrada" },
              { value: "CASH_OUT", label: "Salida" },
            ]}
            onChange={onField}
            required
          />
          <FormField
            label="Monto"
            name="amount"
            type="number"
            value={movement.amount}
            onChange={onField}
            required
          />
          <FormField
            label="Concepto"
            name="concept"
            value={movement.concept}
            onChange={onField}
            required
          />
          <FormField
            label="Nota"
            name="note"
            type="textarea"
            value={movement.note}
            onChange={onField}
          />
        </div>
      </Modal>
      <Modal
        open={closeModal}
        onClose={() => setCloseModal(false)}
        title={openSession?.openedBy.id === profile?.userId ? "Cerrar caja" : "Cerrar sesión ajena"}
        description={openSession?.openedBy.id === profile?.userId ? undefined : `La sesión fue abierta por ${openSession?.openedBy.name}. El motivo quedará registrado.`}
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setCloseModal(false)} disabled={busyAction === "close"}>
              Cancelar
            </Button>
            <Button onClick={() => void closeCash()} disabled={busyAction !== null}>
              {busyAction === "close" ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
              {busyAction === "close" ? "Cerrando…" : "Confirmar cierre"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">Efectivo esperado</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {openSession
                ? formatCurrency(Number(openSession.expectedCash), currency)
                : "-"}
            </p>
          </div>
          <FormField
            label="Efectivo contado"
            name="countedCash"
            type="number"
            value={countedCash}
            onChange={(event) => setCountedCash(String(event.target.value))}
            required
          />
          <FormField
            label={openSession?.openedBy.id === profile?.userId ? "Notas de cierre" : "Motivo del cierre por otro usuario"}
            name="closingNotes"
            type="textarea"
            value={closingNotes}
            onChange={(event) => setClosingNotes(String(event.target.value))}
            required={openSession?.openedBy.id !== profile?.userId}
          />
        </div>
      </Modal>
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Detalle de caja"
        size="lg"
      >
        {detail ? (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-lg border border-border bg-muted/20 p-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Apertura</p>
                <p className="font-medium text-foreground">{formatClinicDateTime(detail.openedAt, timezone)}</p>
                <p className="text-muted-foreground">Responsable: {detail.openedBy.name}</p>
                <p className="text-muted-foreground">Fondo: {formatCurrency(Number(detail.openingFloat), currency)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cierre</p>
                {detail.closedAt ? (
                  <>
                    <p className="font-medium text-foreground">{formatClinicDateTime(detail.closedAt, timezone)}</p>
                    <p className="text-muted-foreground">Realizado por: {detail.closedBy?.name ?? "Usuario no disponible"}</p>
                    <p className="text-muted-foreground">Contado: {detail.countedCash == null ? "-" : formatCurrency(Number(detail.countedCash), currency)}</p>
                  </>
                ) : <p className="text-muted-foreground">Sesión abierta</p>}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Fondo inicial" value={detail.openingAmount} currency={currency} />
              <Metric label="Total cobrado" value={detail.totalCollected} currency={currency} />
              <Metric label="Efectivo" value={detail.cashPayments} currency={currency} />
              <Metric label="Tarjeta" value={detail.cardPayments} currency={currency} />
              <Metric label="Transferencia" value={detail.transferPayments} currency={currency} />
              <Metric label="Otros" value={detail.otherPayments} currency={currency} />
              <Metric label="Entradas" value={detail.cashIn} currency={currency} />
              <Metric label="Salidas" value={detail.cashOut} currency={currency} />
              <Metric label="Efectivo esperado" value={detail.expectedCash} currency={currency} />
              <Metric label="Efectivo contado" value={detail.countedCash} currency={currency} />
              <Metric
                label="Diferencia"
                value={detail.difference ?? "0"}
                currency={currency}
                emphasis
              />
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-foreground">
                Operaciones
              </h3>
              <div className="max-h-[min(32rem,55vh)] space-y-2 overflow-x-hidden overflow-y-auto pr-1">
                {detail.operations.map((item) => (
                  <div
                    key={item.id}
                    className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">
                        {item.kind === "PAYMENT" && item.invoiceId && item.invoiceNumber ? (
                          <Link href={`/invoices/${item.invoiceId}`} className="text-primary hover:underline">
                            Factura {item.invoiceNumber}
                          </Link>
                        ) : item.context}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.kind === "PAYMENT"
                          ? (item.clientName ?? "Venta general")
                          : item.concept}{" "}
                        · {item.context} · {item.method} ·{" "}
                        {item.responsible ?? "Sistema"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatClinicDateTime(item.paidAt, timezone)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 font-semibold ${item.kind === "MOVEMENT" && item.movementType === "CASH_OUT" ? "text-rose-700" : "text-emerald-700"}`}
                    >
                      {item.kind === "MOVEMENT" &&
                      item.movementType === "CASH_OUT"
                        ? "-"
                        : "+"}
                      {formatCurrency(Number(item.amount), currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {detail.closingNotes ? (
              <p className="rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">
                {detail.closingNotes}
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>
      <AppAlert
        open={alert.open}
        onOpenChange={(open) => setAlert((current) => ({ ...current, open }))}
        variant={alert.variant}
        title={alert.title}
        description={alert.description}
      />
    </div>
  );
}

function Metric({
  label,
  value,
  currency,
  emphasis = false,
}: {
  label: string;
  value: string | number | null;
  currency: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border border-border bg-muted/20 p-4 ${emphasis ? "border-primary/30" : ""}`}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">
        {value == null ? "-" : formatCurrency(Number(value), currency)}
      </p>
    </div>
  );
}
