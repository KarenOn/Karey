import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { hasPermission, isElevatedClinicRole, type PermissionKey } from "@/lib/permissions";
import { requireClinicPermissions } from "@/lib/server-auth";

const MAX_RESULTS_PER_GROUP = 5;

type SearchGroup = {
  label: string;
  results: Array<{ id: string; label: string; detail?: string; href: string }>;
};

type ClientSearchRow = { id: number; fullName: string; phone: string | null };
type PetSearchRow = { id: number; name: string; ownerName: string };
type ProductSearchRow = { id: number; name: string; sku: string | null };
type ServiceSearchRow = { id: number; name: string; category: string | null };

function canRead(member: { role: { key: string; permissions: unknown } }, permission: PermissionKey) {
  return isElevatedClinicRole(member.role.key) || hasPermission(member.role.permissions, permission);
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function searchText(column: Prisma.Sql, query: string) {
  return Prisma.sql`lower(immutable_unaccent(${column})) LIKE '%' || lower(immutable_unaccent(${query})) || '%'`;
}

function searchPhone(column: Prisma.Sql, query: string) {
  return Prisma.sql`regexp_replace(COALESCE(${column}, ''), '[^0-9]', '', 'g') LIKE '%' || ${query} || '%'`;
}

export async function GET(req: Request) {
  const { clinicId, member } = await requireClinicPermissions([]);
  const query = new URL(req.url).searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) return NextResponse.json({ groups: [] });

  const normalizedPhone = digitsOnly(query);
  const clientConditions = [searchText(Prisma.sql`"fullName"`, query)];
  if (normalizedPhone.length >= 2) clientConditions.push(searchPhone(Prisma.sql`"phone"`, normalizedPhone));

  const groups: Array<Promise<SearchGroup>> = [];

  if (canRead(member, "clients.read")) {
    groups.push(
      prisma.$queryRaw<ClientSearchRow[]>(Prisma.sql`
        SELECT "id", "fullName", "phone"
        FROM "client"
        WHERE "clinicId" = ${clinicId}
          AND (${Prisma.join(clientConditions, " OR ")})
        ORDER BY "fullName" ASC
        LIMIT ${MAX_RESULTS_PER_GROUP}
      `).then((rows) => ({
        label: "Clientes",
        results: rows.map((row) => ({ id: `client-${row.id}`, label: row.fullName, detail: row.phone ?? undefined, href: `/clients/${row.id}` })),
      }))
    );
  }

  if (canRead(member, "pets.read")) {
    groups.push(
      prisma.$queryRaw<PetSearchRow[]>(Prisma.sql`
        SELECT pet."id", pet."name", client."fullName" AS "ownerName"
        FROM "pet" AS pet
        INNER JOIN "client" AS client
          ON client."id" = pet."clientId" AND client."clinicId" = pet."clinicId"
        WHERE pet."clinicId" = ${clinicId}
          AND (${searchText(Prisma.sql`pet."name"`, query)} OR ${searchText(Prisma.sql`client."fullName"`, query)})
        ORDER BY pet."name" ASC
        LIMIT ${MAX_RESULTS_PER_GROUP}
      `).then((rows) => ({
        label: "Pacientes",
        results: rows.map((row) => ({ id: `pet-${row.id}`, label: row.name, detail: `Propietario: ${row.ownerName}`, href: `/pets/${row.id}` })),
      }))
    );
  }

  if (canRead(member, "invoices.read")) {
    groups.push(
      prisma.invoice.findMany({
        where: { clinicId, number: { contains: query, mode: "insensitive" } },
        orderBy: { issueDate: "desc" },
        take: MAX_RESULTS_PER_GROUP,
        select: { id: true, number: true, client: { select: { fullName: true } } },
      }).then((rows) => ({
        label: "Facturas",
        results: rows.map((row) => ({ id: `invoice-${row.id}`, label: row.number, detail: `Cliente: ${row.client.fullName}`, href: `/invoices/${row.id}` })),
      }))
    );
  }

  if (canRead(member, "inventory.read")) {
    groups.push(
      prisma.$queryRaw<ProductSearchRow[]>(Prisma.sql`
        SELECT "id", "name", "sku"
        FROM "product"
        WHERE "clinicId" = ${clinicId}
          AND (${searchText(Prisma.sql`"name"`, query)} OR lower(COALESCE("sku", '')) LIKE '%' || lower(${query}) || '%')
        ORDER BY "name" ASC
        LIMIT ${MAX_RESULTS_PER_GROUP}
      `).then((rows) => ({
        label: "Productos",
        results: rows.map((row) => ({ id: `product-${row.id}`, label: row.name, detail: row.sku ?? undefined, href: "/inventory" })),
      }))
    );
  }

  if (canRead(member, "services.read")) {
    groups.push(
      prisma.$queryRaw<ServiceSearchRow[]>(Prisma.sql`
        SELECT "id", "name", "category"
        FROM "service"
        WHERE "clinicId" = ${clinicId}
          AND ${searchText(Prisma.sql`"name"`, query)}
        ORDER BY "name" ASC
        LIMIT ${MAX_RESULTS_PER_GROUP}
      `).then((rows) => ({
        label: "Servicios",
        results: rows.map((row) => ({ id: `service-${row.id}`, label: row.name, detail: row.category ?? undefined, href: "/services" })),
      }))
    );
  }

  try {
    const resolvedGroups = await Promise.all(groups);
    return NextResponse.json({ groups: resolvedGroups.filter((group) => group.results.length > 0) });
  } catch {
    return NextResponse.json({ error: "No pudimos realizar la búsqueda." }, { status: 500 });
  }
}
