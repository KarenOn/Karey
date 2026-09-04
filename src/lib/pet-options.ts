import type { PetSpecies } from "@/types/common";

export type PetSpeciesOption = {
  value: PetSpecies;
  label: string;
  keywords?: string[];
};

export const PET_SPECIES_OPTIONS: PetSpeciesOption[] = [
  { value: "DOG", label: "Perro", keywords: ["dog", "canino"] },
  { value: "CAT", label: "Gato", keywords: ["cat", "felino"] },
  { value: "BIRD", label: "Ave", keywords: ["bird", "pajaro"] },
  { value: "RABBIT", label: "Conejo", keywords: ["rabbit"] },
  { value: "OTHER", label: "Otro", keywords: ["other", "otro"] },
];

export function getPetSpeciesLabel(species: string) {
  return PET_SPECIES_OPTIONS.find((option) => option.value === species)?.label ?? species;
}
