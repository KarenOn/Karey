import { z } from "zod";

export const PushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const PushSendSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  url: z.string().optional(),
});

export type PushSubscriptionInput = z.infer<typeof PushSubscriptionSchema>;
export type PushSendInput = z.infer<typeof PushSendSchema>;
