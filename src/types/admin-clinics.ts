export type AdminClinicSubscriptionStatus = "active" | "inactive" | "past_due";
export type AdminClinicPaymentStatus = "PAID" | "PENDING" | "GRACE";

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
  subscriptionPaymentStatus: "PAID" | "PENDING";
  subscriptionPaidAt: string | null;
  subscriptionReminderDays: number;
  subscriptionGraceDays: number;
  timezone: string;
  createdAt: string;
  employeeCount: number;
  responsible: AdminClinicContact | null;
  owner: {
    id: string;
    name: string | null;
    email: string;
    onboardingPending: boolean;
  } | null;
};
