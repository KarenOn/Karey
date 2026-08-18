export type AdminClinicSubscriptionStatus = "active" | "inactive" | "past_due";

export type AdminClinicContact = {
  name: string | null;
  email: string | null;
  phone: string | null;
};

export type AdminClinicRecord = {
  id: number;
  name: string;
  logoUrl: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  plan: string | null;
  isActive: boolean;
  subscriptionStatus: AdminClinicSubscriptionStatus;
  subscriptionEndDate: string | null;
  createdAt: string;
  responsible: AdminClinicContact | null;
};
