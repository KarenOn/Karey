// src/app/clients/[id]/page.tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ClientDetailView from "./ClientDetailView";

function toNumberId(id: string) {
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {

  const paramsExtracted = await params;
  const clientId = toNumberId(paramsExtracted.id);
  if (!clientId) notFound();

  // ✅ single clinic por ahora (si luego haces multi-clinic, lo sacas de la sesión)
  const clinic = await prisma.clinic.findFirst({ select: { id: true, name: true } });
  if (!clinic) notFound();

  const client = await prisma.client.findFirst({
    where: { id: clientId, clinicId: clinic.id },
    select: {
      id: true,
      fullName: true,
      phone: true,
      email: true,
      address: true,
      notes: true,
      createdAt: true,
    },
  });

  if (!client) notFound();

  const [pets, appointments, invoices] = await Promise.all([
    prisma.pet.findMany({
      where: { clinicId: clinic.id, clientId: client.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        species: true,
        breed: true,
        createdAt: true,
      },
    }),

    prisma.appointment.findMany({
      where: { clinicId: clinic.id, clientId: client.id },
      orderBy: { startAt: "desc" },
      take: 20,
      select: {
        id: true,
        startAt: true,
        status: true,
        reason: true,
        pet: {
          select: { id: true, name: true, species: true },
        },
      },
    }),

    prisma.invoice.findMany({
      where: { clinicId: clinic.id, clientId: client.id },
      orderBy: { issueDate: "desc" },
      take: 20,
      select: {
        id: true,
        number: true,
        status: true,
        issueDate: true,
        total: true, // Decimal
      },
    }),
  ]);

  const totalSpent = invoices
    .filter((i) => i.status === "PAID")
    .reduce((sum, i) => sum + i.total.toNumber(), 0);

  // ✅ DTO serializable (sin Date/Decimal)
  return (
    <ClientDetailView
      clinicName={clinic.name}
      client={{
        ...client,
        createdAt: client.createdAt.toISOString(),
      }}
      pets={pets.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() }))}
      appointments={appointments.map((a) => ({
        id: a.id,
        startAt: a.startAt.toISOString(),
        status: a.status,
        reason: a.reason ?? "",
        pet: a.pet
          ? { id: a.pet.id, name: a.pet.name, species: a.pet.species }
          : null,
      }))}
      invoices={invoices.map((i) => ({
        id: i.id,
        number: i.number,
        status: i.status,
        issueDate: i.issueDate.toISOString(),
        total: i.total.toNumber(),
      }))}
      totalSpent={totalSpent}
    />
  );
}
