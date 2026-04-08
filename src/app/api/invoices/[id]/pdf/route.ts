// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
// import { getClinicIdOrFail } from "@/lib/auth";
// import * as puppeteer from "puppeteer";

// export const runtime = "nodejs";

// export async function GET(
//   _req: Request,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   const clinicId = await getClinicIdOrFail();
//   const invoiceId = Number((await params).id);

//   const inv = await prisma.invoice.findFirst({
//     where: { id: invoiceId, clinicId },
//     select: { number: true },
//   });

//   if (!inv) {
//     return NextResponse.json({ error: "Invoice no encontrada" }, { status: 404 });
//   }

//   // 👇 URL pública de tu app (ponlo en env)
//   const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
//   const printUrl = `${baseUrl}/invoices/${invoiceId}/print`;


//   const browser = await puppeteer.default.launch({ headless: "new" });
//   const page = await browser.newPage();

//   await page.goto(printUrl, { waitUntil: "networkidle0" });

//   const pdf = await page.pdf({
//     format: "A4",
//     // printBackground: true,
//     // margin: { top: "14mm", right: "14mm", bottom: "14mm", left: "14mm" },
//   });

//   await browser.close();

//   return new NextResponse(pdf, {
//     headers: {
//       "Content-Type": "application/pdf",
//       "Content-Disposition": `attachment; filename="invoice-${inv.number}.pdf"`,
//     },
//   });
// }
import { NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { getClinicIdOrFail } from "@/lib/auth";
import { getInvoicePrintData } from "@/lib/print/getInvoicePrintData";
import { renderInvoiceA4Html } from "@/lib/print/renderInvoiceA4Html";

export const runtime = "nodejs";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const clinicId = await getClinicIdOrFail();
  const invoiceId = Number((await params).id);

  const data = await getInvoicePrintData({ clinicId, invoiceId });
  const html = renderInvoiceA4Html(data);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.emulateTimezone(data.clinic.timezone ?? "America/Santo_Domingo");
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "14mm", right: "14mm", bottom: "14mm", left: "14mm" },
    });

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${data.invoice.number}.pdf"`,
      },
    });
  } finally {
    await browser.close();
  }
}
