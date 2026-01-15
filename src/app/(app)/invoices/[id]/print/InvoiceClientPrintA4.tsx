'use client'

import dynamic from 'next/dynamic'

const InvoicePrintA4 = dynamic(() => import("./InvoicePrintA4"), {
  ssr: false,
  loading: () => <div className="p-8 text-sm text-muted-foreground">Cargando factura…</div>,
});

export default InvoicePrintA4;