export type PetReminder = {
  id: string;
  type: "vaccine" | "visit";
  description: string;
  dueDate: string;
  kind: "vaccine-upcoming" | "vaccine-overdue" | "clinical-follow-up";
  sourceId: number;
  sourceHref: string;
};

export type PetReminderResponse = {
  data: PetReminder[];
  total: number;
  page: number;
  pageSize: number;
};

export async function apiListPetReminders(petId: number, params?: { type?: string; period?: string; page?: number; pageSize?: number }) {
  const search = new URLSearchParams({ page: String(params?.page ?? 0), pageSize: String(params?.pageSize ?? 10) });
  if (params?.type && params.type !== "all") search.set("type", params.type);
  if (params?.period && params.period !== "all") search.set("period", params.period);
  const response = await fetch(`/api/pets/${petId}/reminders?${search.toString()}`, { cache: "no-store" });
  if (!response.ok) throw new Error("No se pudieron cargar los recordatorios");
  return response.json() as Promise<PetReminderResponse>;
}
