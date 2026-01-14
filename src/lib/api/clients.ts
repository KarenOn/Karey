export type ClientRow = {
  id: number;
  fullName: string;
};

export async function apiListClients(): Promise<ClientRow[]> {
  const res = await fetch("/api/clients", { cache: "no-store" });
  if (!res.ok) throw new Error("Error cargando clientes");
  return res.json();
}
