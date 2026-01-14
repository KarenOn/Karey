export function zodDetails(err: any) {
  return err.issues?.map((i: any) => ({ path: i.path?.join("."), message: i.message })) ?? [];
}