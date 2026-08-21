import { redirect } from "next/navigation";

export default async function InvoicePrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const query = new URLSearchParams();

  const paper = Array.isArray(resolvedSearchParams.paper)
    ? resolvedSearchParams.paper[0]
    : resolvedSearchParams.paper;
  const autoPrint = Array.isArray(resolvedSearchParams.autoprint)
    ? resolvedSearchParams.autoprint[0]
    : resolvedSearchParams.autoprint;

  if (paper) {
    query.set("paper", paper);
  }

  if (autoPrint) {
    query.set("autoprint", autoPrint);
  }

  const queryString = query.toString();
  redirect(`/invoices/${id}/receipt${queryString ? `?${queryString}` : ""}`);
}
