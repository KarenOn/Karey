'use client'

import dynamic from 'next/dynamic'

const InvoiceTicket = dynamic(() => import("./InvoiceTicket"), {
  ssr: false,
  loading: () => <div className="p-8 text-sm text-muted-foreground">Cargando factura…</div>,
});

export default InvoiceTicket;