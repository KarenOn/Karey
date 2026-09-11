export type ClinicalReportRange = {
  mode: "today" | "date" | "range" | "all";
  date?: string;
  from?: string;
  to?: string;
};

export type ClinicalReportData = {
  clinic: {
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    taxId: string | null;
    logoUrl: string | null;
    timezone: string;
  };
  scope: {
    petIds: number[];
    clientId: number | null;
  };
  range: ClinicalReportRange & { label: string };
  patients: Array<{
    id: number;
    name: string;
    species: string;
    breed: string | null;
    sex: string;
    birthDate: string | null;
    age: number | null;
    client: {
      fullName: string;
      phone: string | null;
      email: string | null;
    };
    visits: Array<{
      id: number;
      visitAt: string;
      weightKg: number | null;
      temperatureC: number | null;
      diagnosis: string | null;
      treatment: string | null;
      notes: string | null;
      vet: { name: string } | null;
      attachments: Array<{
        fileName: string;
        fileType: string | null;
        createdAt: string;
      }>;
    }>;
    vaccinations: Array<{
      id: number;
      vaccineName: string;
      appliedAt: string;
      nextDueAt: string | null;
      batchNumber: string | null;
      notes: string | null;
    }>;
  }>;
};
