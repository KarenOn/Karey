// import { NextResponse } from "next/server";
// import { headers } from "next/headers";
// import { auth } from "@/lib/auth";
// import { prisma } from "@/lib/prisma";
// import { UserPasswordChangeSchema } from "@/lib/validators/profile";

// export async function POST(req: Request) {
//   try {
//     const session = await auth.api.getSession({ headers: await headers() });
//     if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

//     const parsed = UserPasswordChangeSchema.safeParse(await req.json().catch(() => null));
//     if (!parsed.success) return NextResponse.json({ error: "Revisa la nueva contraseña", details: parsed.error.flatten() }, { status: 422 });

//     const result = await auth.api.changePassword({
//       body: {
//         currentPassword: parsed.data.currentPassword,
//         newPassword: parsed.data.newPassword,
//         revokeOtherSessions: true,
//       },
//       headers: await headers(),
//     });

//     await prisma.user.update({
//       where: { id: session.user.id },
//       data: { mustChangePassword: false },
//     });

//     return NextResponse.json({ ok: true, user: result?.user ?? null });
//   } catch (error: unknown) {
//     const rawMessage = error instanceof Error ? error.message : "Unknown error";
//     const authError = error as { code?: string; status?: number; name?: string };
//     console.error("[onboarding/change-password] Better Auth rejected password change", {
//       code: authError.code ?? null,
//       name: authError.name ?? null,
//       status: authError.status ?? null,
//       message: rawMessage,
//     });
//     const message = rawMessage.toLowerCase();
//     if (message.includes("invalid password") || message.includes("invalid_password")) {
//       return NextResponse.json({ error: "La contraseña temporal no es correcta." }, { status: 400 });
//     }
//     if (message.includes("too short") || message.includes("password is too short") || message.includes("password_too_short")) {
//       return NextResponse.json({ error: "La nueva contraseña debe tener al menos 8 caracteres." }, { status: 400 });
//     }
//     if (message.includes("too long") || message.includes("password is too long") || message.includes("password_too_long")) {
//       return NextResponse.json({ error: "La nueva contraseña es demasiado larga." }, { status: 400 });
//     }
//     if (message.includes("credential account")) {
//       return NextResponse.json({ error: "Esta cuenta no tiene una contraseña temporal válida." }, { status: 400 });
//     }
//     return NextResponse.json({ error: "No se pudo actualizar la contraseña" }, { status: 400 });
//   }
// }

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserPasswordChangeSchema } from "@/lib/validators/profile";

export async function POST(req: Request) {
  try {
    const requestHeaders = req.headers;

    const session = await auth.api.getSession({
      headers: requestHeaders,
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 },
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = UserPasswordChangeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Revisa la nueva contraseña",
          details: parsed.error.flatten(),
        },
        { status: 422 },
      );
    }

    const result = await auth.api.changePassword({
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: true,
      },
      headers: requestHeaders,
    });

    await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        mustChangePassword: false,
      },
    });

    return NextResponse.json({
      ok: true,
      user: result?.user ?? null,
    });
  } catch (error: unknown) {
    const rawMessage =
      error instanceof Error ? error.message : "Unknown error";

    const authError = error as {
      code?: string;
      status?: number;
      name?: string;
    };

    console.error(
      "[onboarding/change-password] Better Auth rejected password change",
      {
        code: authError.code ?? null,
        name: authError.name ?? null,
        status: authError.status ?? null,
        message: rawMessage,
      },
    );

    const message = rawMessage.toLowerCase();

    if (
      message.includes("invalid password") ||
      message.includes("invalid_password")
    ) {
      return NextResponse.json(
        { error: "La contraseña temporal no es correcta." },
        { status: 400 },
      );
    }

    if (
      message.includes("too short") ||
      message.includes("password is too short") ||
      message.includes("password_too_short")
    ) {
      return NextResponse.json(
        { error: "La nueva contraseña debe tener al menos 8 caracteres." },
        { status: 400 },
      );
    }

    if (
      message.includes("too long") ||
      message.includes("password is too long") ||
      message.includes("password_too_long")
    ) {
      return NextResponse.json(
        { error: "La nueva contraseña es demasiado larga." },
        { status: 400 },
      );
    }

    if (message.includes("credential account")) {
      return NextResponse.json(
        {
          error:
            "Esta cuenta no tiene una contraseña temporal válida.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "No se pudo actualizar la contraseña" },
      { status: 400 },
    );
  }
}