export type OwnerMini = {
  id: number;
  fullName: string;
  phone: string;
  email: string | null;
};

export type PetDetail = {
  id: number;
  name: string;
  species: "DOG" | "CAT" | "BIRD" | "RABBIT" | "OTHER";
  breed: string | null;
  sex: "MALE" | "FEMALE" | "UNKNOWN";

  birthDate: string | null;
  weightKg: number | null;
  color: string | null;
  microchip: string | null;

  sterilized: boolean | null;
  allergies: string | null;
  chronicConditions: string | null;

  clientId: number;
  owner: OwnerMini | null;

  createdAt: string;
  updatedAt: string;
};

export async function apiGetPetDetail(id: number): Promise<PetDetail> {
  const res = await fetch(`/api/pets/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Error cargando paciente");
  return res.json();
}
