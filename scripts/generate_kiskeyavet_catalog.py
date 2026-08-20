from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from textwrap import dedent
from xml.sax.saxutils import escape


W = 1600
H = 900


@dataclass
class ScreenSpec:
    slug: str
    nav: str
    page_title: str
    subtitle: str
    hero_badge: str
    hero_title: str
    hero_description: str
    stats: list[tuple[str, str]]
    left_title: str
    left_rows: list[tuple[str, str, str]]
    right_title: str
    right_rows: list[tuple[str, str, str]]


SCREENS: list[ScreenSpec] = [
    ScreenSpec(
        slug="login",
        nav="Login",
        page_title="Acceso",
        subtitle="Pantalla de inicio de sesion reconstruida desde la UI real de la app.",
        hero_badge="Karey Vet Suite",
        hero_title="Inicia sesion en Karey Vet",
        hero_description="Acceso a clientes, pacientes, agenda y facturacion con una interfaz mas clara y expresiva.",
        stats=[("Modo", "Auth"), ("Estilo", "Premium"), ("Vista", "Landing")],
        left_title="Beneficios visibles",
        left_rows=[
            ("Pacientes al centro", "Contexto clinico y humano", "TEAL"),
            ("Dark mode real", "Contraste comodo para jornadas largas", "GOLD"),
            ("Diseno uniforme", "Patrones consistentes en tablas y formularios", "NAVY"),
        ],
        right_title="Formulario",
        right_rows=[
            ("Correo electronico", "you@example.com", "MUTED"),
            ("Contraseña", "********", "MUTED"),
            ("Accion", "Entrar al sistema", "TEAL"),
        ],
    ),
    ScreenSpec(
        slug="dashboard",
        nav="Dashboard",
        page_title="Panel Principal",
        subtitle="Resumen operativo con foco clinico, agenda, clientes e ingresos.",
        hero_badge="Centro de control clinico",
        hero_title="Dashboard operativo",
        hero_description="Vista general del estado de la clinica con KPI, proximas citas, alertas y actividad reciente.",
        stats=[("Clientes", "248"), ("Pacientes", "417"), ("Citas hoy", "14"), ("Ingresos", "$12.4k")],
        left_title="Proximas citas",
        left_rows=[
            ("09:00", "Luna / Consulta general", "Ana Soto"),
            ("11:30", "Milo / Vacunacion", "Carla Ruiz"),
            ("15:10", "Toby / Revision", "Marcos Gil"),
        ],
        right_title="Alertas",
        right_rows=[
            ("Stock", "Vacuna triple felina", "2 un."),
            ("Pendiente", "Factura INV-1048", "$320"),
            ("Hoy", "6 recordatorios enviados", "OK"),
        ],
    ),
    ScreenSpec(
        slug="today",
        nav="Today",
        page_title="Today Workspace",
        subtitle="Flujo del dia para agenda, turnos, pacientes en sala y items por facturar.",
        hero_badge="Operacion en vivo",
        hero_title="Agenda y turnos del dia",
        hero_description="Workspace operativo para organizar citas confirmadas, turnos espontaneos y acciones rapidas.",
        stats=[("Citas", "14"), ("Turnos", "09"), ("En sala", "04"), ("Facturar", "03"), ("Listos", "06")],
        left_title="Proximas citas",
        left_rows=[
            ("09:10", "Luna / Ana Soto", "Chequeo general"),
            ("11:40", "Bruno / Carla Lopez", "Control post cirugia"),
            ("15:30", "Kira / Jose Leon", "Vacunacion anual"),
        ],
        right_title="Turnos de hoy",
        right_rows=[
            ("Milo", "Espera activa", "Dermatologia"),
            ("Nina", "En atencion", "Control de peso"),
            ("Toby", "Listo para facturar", "Salida"),
        ],
    ),
    ScreenSpec(
        slug="appointments",
        nav="Appointments",
        page_title="Citas",
        subtitle="Agenda clinica con calendario, timeline y estados de las consultas.",
        hero_badge="Agenda clinica",
        hero_title="Gestion de citas",
        hero_description="Modulo para registrar, confirmar, reagendar y seguir citas por veterinario, cliente y paciente.",
        stats=[("Programadas", "21"), ("Confirmadas", "12"), ("En progreso", "03"), ("Completadas", "34")],
        left_title="Agenda del dia",
        left_rows=[
            ("08:30", "Consulta / Luna", "Vet. Carolina"),
            ("10:00", "Vacunacion / Max", "Vet. Daniel"),
            ("13:30", "Cirugia / Bruno", "Vet. Sofia"),
        ],
        right_title="Estados",
        right_rows=[
            ("Programada", "Bloque azul", "Pendiente"),
            ("Confirmada", "Badge verde", "WhatsApp enviado"),
            ("Completada", "Timeline", "Atendida"),
        ],
    ),
    ScreenSpec(
        slug="clients",
        nav="Clients",
        page_title="Clientes",
        subtitle="Directorio con datos de contacto, mascotas vinculadas y acciones rapidas.",
        hero_badge="Base de clientes",
        hero_title="Gestion de clientes",
        hero_description="Tabla editable de propietarios con resumen de mascotas, correo, telefono y notas.",
        stats=[("Clientes", "248"), ("Con acceso", "163"), ("Con mascotas", "204"), ("Mascotas", "417")],
        left_title="Listado",
        left_rows=[
            ("Ana Soto", "ana@email.com", "3 mascotas"),
            ("Carla Ruiz", "809 555 9102", "1 mascota"),
            ("Marcos Gil", "marcos@email.com", "2 mascotas"),
        ],
        right_title="Acciones",
        right_rows=[
            ("Nuevo cliente", "Alta rapida", "Modal"),
            ("Editar", "Datos y notas", "Inline"),
            ("Ver detalle", "Mascotas y citas", "Perfil"),
        ],
    ),
    ScreenSpec(
        slug="pets",
        nav="Pets",
        page_title="Pacientes",
        subtitle="Modulo de mascotas con especie, propietario, edad, sexo y vacunas.",
        hero_badge="Historias clinicas",
        hero_title="Gestion de pacientes",
        hero_description="Pantalla para registrar y consultar mascotas, relacionarlas con clientes y controlar su historial.",
        stats=[("Pacientes", "417"), ("Perros", "264"), ("Gatos", "126"), ("Vacunas", "88")],
        left_title="Pacientes activos",
        left_rows=[
            ("Luna", "Perro / Ana Soto", "3 anos"),
            ("Milo", "Gato / Carla Ruiz", "11 meses"),
            ("Toby", "Perro / Marcos Gil", "5 anos"),
        ],
        right_title="Datos de ficha",
        right_rows=[
            ("Especie", "DOG / CAT / OTHER", "Badge"),
            ("Propietario", "Vinculo con cliente", "Lookup"),
            ("Vacunas", "Tab secundaria", "Historial"),
        ],
    ),
    ScreenSpec(
        slug="inventory",
        nav="Inventory",
        page_title="Inventario",
        subtitle="Productos, movimientos de stock y alertas de minimos para la clinica.",
        hero_badge="Stock clinico",
        hero_title="Control de inventario",
        hero_description="Pantalla para productos, categorias, entradas, salidas y alertas por bajo stock.",
        stats=[("Productos", "128"), ("Bajo stock", "07"), ("Movimientos", "42"), ("Valor", "$18.9k")],
        left_title="Productos",
        left_rows=[
            ("Vacuna triple felina", "Stock 2 / Min 8", "Bajo"),
            ("Antibiotico oral", "Stock 18 / Min 10", "OK"),
            ("Recovery canino", "Stock 5 / Min 6", "Alerta"),
        ],
        right_title="Movimientos",
        right_rows=[
            ("Entrada", "Compra proveedor", "+24"),
            ("Salida", "Venta mostrador", "-3"),
            ("Ajuste", "Conteo fisico", "+1"),
        ],
    ),
    ScreenSpec(
        slug="invoices",
        nav="Invoices",
        page_title="Facturacion",
        subtitle="Seguimiento de facturas emitidas, cobradas, pendientes y anuladas.",
        hero_badge="Caja y cobros",
        hero_title="Gestion de facturas",
        hero_description="Vista de facturacion con filtros por estado, accesos a ticket, PDF y detalle del cobro.",
        stats=[("Facturas", "186"), ("Cobrado", "$48.2k"), ("Pendiente", "$5.7k"), ("Parciales", "09")],
        left_title="Facturas recientes",
        left_rows=[
            ("INV-1048", "Ana Soto / Luna", "$320"),
            ("INV-1044", "Jose Leon / Kira", "$185"),
            ("INV-1039", "Carla Ruiz / Milo", "$96"),
        ],
        right_title="Estados",
        right_rows=[
            ("Pagada", "Badge verde", "OK"),
            ("Pendiente", "Badge ambar", "Seguimiento"),
            ("Anulada", "Badge rojo", "Void"),
        ],
    ),
    ScreenSpec(
        slug="employees",
        nav="Employees",
        page_title="Empleados y Roles",
        subtitle="Administracion del equipo, invitaciones y permisos por modulo.",
        hero_badge="Equipo interno",
        hero_title="Gestion de empleados",
        hero_description="Panel para miembros, invitaciones activas, roles y permisos de la clinica.",
        stats=[("Miembros", "09"), ("Invites", "03"), ("Roles", "04"), ("Activos", "08")],
        left_title="Miembros",
        left_rows=[
            ("Owner Demo", "owner@demo.com", "Owner"),
            ("Admin Demo", "admin@demo.com", "Administrator"),
            ("Vet Demo", "vet@demo.com", "Veterinarian"),
        ],
        right_title="Capacidades",
        right_rows=[
            ("Invitar", "Nuevo empleado", "ON"),
            ("Roles", "Permisos por modulo", "Manage"),
            ("Seguridad", "Temp password", "Visible"),
        ],
    ),
    ScreenSpec(
        slug="clinic-profile",
        nav="Clinic",
        page_title="Perfil de clinica",
        subtitle="Informacion general, fiscal, horarios y datos de facturacion.",
        hero_badge="Identidad de la clinica",
        hero_title="Configuracion de clinica",
        hero_description="Pantalla para logo, slogan, datos fiscales, horarios semanales y notas de factura.",
        stats=[("Tabs", "4"), ("Horarios", "7 dias"), ("Fiscal", "RNC"), ("Logo", "Upload")],
        left_title="General",
        left_rows=[
            ("Nombre", "Clinica Demo Karey Vet", "Editable"),
            ("Contacto", "correo / telefono / web", "Editable"),
            ("Redes", "facebook / instagram / whatsapp", "Editable"),
        ],
        right_title="Horarios y fiscal",
        right_rows=[
            ("Lunes a viernes", "08:00 - 18:00", "Activo"),
            ("Sabado", "09:00 - 13:00", "Activo"),
            ("Facturacion", "Notas / terminos / cuenta", "Config"),
        ],
    ),
    ScreenSpec(
        slug="profile",
        nav="Profile",
        page_title="Perfil de usuario",
        subtitle="Datos personales, avatar, cargo, bio y cambio de contraseña.",
        hero_badge="Cuenta personal",
        hero_title="Mi perfil",
        hero_description="Vista personal del usuario con datos de identidad, rol, avatar y seguridad.",
        stats=[("Usuario", "Owner Demo"), ("Rol", "Owner"), ("Avatar", "Upload"), ("Seguridad", "Password")],
        left_title="Datos",
        left_rows=[
            ("Nombre", "Owner Demo", "Editable"),
            ("Correo", "owner@demo.com", "Solo lectura"),
            ("Telefono", "+1 809 000 0000", "Editable"),
        ],
        right_title="Seguridad",
        right_rows=[
            ("Contraseña actual", "Campo seguro", "Required"),
            ("Nueva contraseña", "Minimo 8 caracteres", "Input"),
            ("Revocar sesiones", "Switch", "Opcional"),
        ],
    ),
]


def wrap_lines(text: str, max_chars: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        if len(candidate) <= max_chars:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def text_block(x: int, y: int, text: str, size: int, weight: int = 400, fill: str = "#13283F", family: str = "Trebuchet MS, Segoe UI, sans-serif", letter_spacing: float | None = None) -> str:
    attrs = []
    if letter_spacing is not None:
        attrs.append(f' letter-spacing="{letter_spacing}"')
    return f'<text x="{x}" y="{y}" fill="{fill}" font-family="{family}" font-size="{size}" font-weight="{weight}"{"".join(attrs)}>{escape(text)}</text>'


def paragraph(x: int, y: int, text: str, size: int, line_height: int, max_chars: int, fill: str = "#13283FB8") -> str:
    lines = wrap_lines(text, max_chars)
    tspans = []
    for idx, line in enumerate(lines):
        dy = 0 if idx == 0 else line_height
        tspans.append(f'<tspan x="{x}" dy="{dy}">{escape(line)}</tspan>')
    return f'<text x="{x}" y="{y}" fill="{fill}" font-family="Trebuchet MS, Segoe UI, sans-serif" font-size="{size}">{"".join(tspans)}</text>'


def badge(x: int, y: int, w: int, label: str) -> str:
    return dedent(
        f"""
        <g transform="translate({x} {y})">
          <rect width="{w}" height="28" rx="14" fill="white" fill-opacity="0.92" stroke="#16324F" stroke-opacity="0.08"/>
          <circle cx="14" cy="14" r="4" fill="url(#accentGrad)"/>
          {text_block(24, 18, label.upper(), 10, 800, "#16324F", letter_spacing=1.1)}
        </g>
        """
    )


def stat_card(x: int, y: int, label: str, value: str) -> str:
    return dedent(
        f"""
        <g transform="translate({x} {y})">
          <rect width="118" height="84" rx="22" fill="white" stroke="#16324F" stroke-opacity="0.08"/>
          {text_block(14, 26, label.upper(), 11, 800, "#13283F99", letter_spacing=1.0)}
          {text_block(14, 58, value, 24, 800)}
        </g>
        """
    )


def info_row(y: int, a: str, b: str, c: str, palette: str = "TEAL", widths: tuple[int, int, int] = (74, 270, 92)) -> str:
    accent_fill = {
        "TEAL": ("#14B8A624", "#0F766E"),
        "GOLD": ("#F59E0B2A", "#A16207"),
        "NAVY": ("#16324F1E", "#16324F"),
        "MUTED": ("#EAF2F5", "#607086"),
    }.get(palette, ("#14B8A624", "#0F766E"))
    return dedent(
        f"""
        <g transform="translate(0 {y})">
          <rect width="100%" height="42" rx="18" fill="#F4F8FB"/>
          <rect x="12" y="8" width="{widths[0]}" height="26" rx="13" fill="{accent_fill[0]}"/>
          {text_block(24, 25, a, 11, 800, accent_fill[1], letter_spacing=0.8)}
          {text_block(widths[0] + 28, 25, b, 13, 700)}
          {text_block(widths[0] + widths[1] + 38, 25, c, 12, 500, "#13283FA8")}
        </g>
        """
    ).replace('width="100%"', 'width="470"')


def panel(x: int, y: int, w: int, h: int, title: str, rows: list[tuple[str, str, str]], palette: str = "TEAL") -> str:
    rows_markup = []
    for idx, row in enumerate(rows):
        rows_markup.append(info_row(48 + idx * 54, row[0], row[1], row[2], palette))
    return dedent(
        f"""
        <g transform="translate({x} {y})">
          <rect width="{w}" height="{h}" rx="26" fill="white" stroke="#16324F" stroke-opacity="0.08"/>
          {text_block(20, 30, title, 18, 800)}
          {"".join(rows_markup)}
        </g>
        """
    )


def app_page_svg(spec: ScreenSpec) -> str:
    stats_markup = "".join(stat_card(0 + i * 130, 0, label, value) for i, (label, value) in enumerate(spec.stats[:5]))

    sidebar_items = []
    nav_labels = ["Dashboard", "Today", "Appointments", "Clients", "Pets", "Inventory", "Invoices", "Employees", "Clinic", "Profile"]
    for idx, label in enumerate(nav_labels):
        y = 116 + idx * 56
        active = label == spec.nav
        fill = 'fill="url(#brandGrad)"' if active else 'fill="white" fill-opacity="0.10"'
        text_fill = "#F5FFFD" if active else "#D9E7EE"
        sidebar_items.append(f'<rect x="22" y="{y}" width="172" height="40" rx="16" {fill}/>')
        sidebar_items.append(text_block(42, y + 24, label, 13, 700, text_fill))

    return dedent(
        f"""<?xml version="1.0" encoding="UTF-8"?>
        <svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bg" x1="0" y1="0" x2="{W}" y2="{H}" gradientUnits="userSpaceOnUse">
              <stop stop-color="#FFF9EF"/>
              <stop offset="0.52" stop-color="#F6FBFD"/>
              <stop offset="1" stop-color="#EEF7FB"/>
            </linearGradient>
            <radialGradient id="flareTeal" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(130 80) rotate(35) scale(420 280)">
              <stop stop-color="#14B8A6" stop-opacity="0.18"/>
              <stop offset="1" stop-color="#14B8A6" stop-opacity="0"/>
            </radialGradient>
            <radialGradient id="flareGold" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1420 110) rotate(90) scale(230 260)">
              <stop stop-color="#F59E0B" stop-opacity="0.16"/>
              <stop offset="1" stop-color="#F59E0B" stop-opacity="0"/>
            </radialGradient>
            <linearGradient id="brandGrad" x1="0" y1="0" x2="1" y2="1">
              <stop stop-color="#14B8A6"/>
              <stop offset="1" stop-color="#2D3A66"/>
            </linearGradient>
            <linearGradient id="accentGrad" x1="0" y1="0" x2="1" y2="1">
              <stop stop-color="#14B8A6"/>
              <stop offset="1" stop-color="#F59E0B"/>
            </linearGradient>
            <linearGradient id="sidebarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop stop-color="#223851"/>
              <stop offset="1" stop-color="#16324F"/>
            </linearGradient>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%">
              <feDropShadow dx="0" dy="18" stdDeviation="24" flood-color="#0B2638" flood-opacity="0.12"/>
            </filter>
          </defs>

          <rect width="{W}" height="{H}" fill="url(#bg)"/>
          <rect width="{W}" height="{H}" fill="url(#flareTeal)"/>
          <rect width="{W}" height="{H}" fill="url(#flareGold)"/>
          <rect x="18" y="18" width="{W - 36}" height="{H - 36}" rx="30" stroke="#16324F" stroke-opacity="0.08"/>

          <g transform="translate(30 30)" filter="url(#shadow)">
            <rect width="220" height="840" rx="30" fill="url(#sidebarGrad)"/>
            <rect x="22" y="24" width="54" height="54" rx="18" fill="url(#brandGrad)"/>
            {text_block(94, 58, "KiskeyaVet", 26, 800, "#F4FFFD")}
            {text_block(94, 80, "Veterinary Suite", 12, 500, "#D4E5ED")}
            {"".join(sidebar_items)}
          </g>

          <g transform="translate(274 38)">
            {badge(0, 0, 180, spec.page_title)}
            {text_block(0, 88, spec.hero_title, 44, 800)}
            {paragraph(0, 122, spec.subtitle, 21, 30, 54)}

            <g transform="translate(0 186)" filter="url(#shadow)">
              <rect width="1284" height="168" rx="32" fill="white" fill-opacity="0.92" stroke="#16324F" stroke-opacity="0.08"/>
              <circle cx="1130" cy="36" r="96" fill="#14B8A612"/>
              <circle cx="1030" cy="132" r="84" fill="#F59E0B10"/>
              {badge(24, 24, 188, spec.hero_badge)}
              {text_block(24, 92, spec.hero_title, 34, 800)}
              {paragraph(24, 122, spec.hero_description, 15, 24, 72)}
              <g transform="translate(24 124)">
                {stats_markup}
              </g>
            </g>

            <g transform="translate(0 386)">
              {panel(0, 0, 620, 300, spec.left_title, spec.left_rows, "TEAL")}
              {panel(664, 0, 620, 300, spec.right_title, spec.right_rows, "GOLD")}
            </g>

            <g transform="translate(0 712)">
              <rect width="1284" height="120" rx="28" fill="white" fill-opacity="0.84" stroke="#16324F" stroke-opacity="0.08"/>
              {text_block(24, 38, "Resumen de pantalla", 18, 800)}
              {paragraph(24, 68, spec.hero_description, 16, 26, 108)}
              {text_block(1040, 36, "Modulo", 12, 800, "#13283F88", letter_spacing=1.2)}
              {text_block(1040, 62, spec.nav, 22, 800)}
              {text_block(1040, 88, "Documento multipagina", 13, 500, "#13283FAA")}
            </g>
          </g>
        </svg>
        """
    )


def build_catalog(output_dir: Path) -> list[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    svg_paths: list[Path] = []
    for spec in SCREENS:
        svg_path = output_dir / f"{spec.slug}.svg"
        svg_path.write_text(app_page_svg(spec), encoding="utf-8")
        svg_paths.append(svg_path)
    return svg_paths


def main() -> None:
    base_dir = Path("artifacts") / "app-screens"
    svg_paths = build_catalog(base_dir)
    for path in svg_paths:
        print(path.as_posix())


if __name__ == "__main__":
    main()
