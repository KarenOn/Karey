// import Image from "next/image";

// export default function Home() {
//   return (
//     <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
//       <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
//         <Image
//           className="dark:invert"
//           src="/next.svg"
//           alt="Next.js logo"
//           width={100}
//           height={20}
//           priority
//         />
//         <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
//           <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
//             To get started, edit the page.tsx file.
//           </h1>
//           <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
//             Looking for a starting point or more instructions? Head over to{" "}
//             <a
//               href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//               className="font-medium text-zinc-950 dark:text-zinc-50"
//             >
//               Templates
//             </a>{" "}
//             or the{" "}
//             <a
//               href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//               className="font-medium text-zinc-950 dark:text-zinc-50"
//             >
//               Learning
//             </a>{" "}
//             center.
//           </p>
//         </div>
//         <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
//           <a
//             className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
//             href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//             target="_blank"
//             rel="noopener noreferrer"
//           >
//             <Image
//               className="dark:invert"
//               src="/vercel.svg"
//               alt="Vercel logomark"
//               width={16}
//               height={16}
//             />
//             Deploy Now
//           </a>
//           <a
//             className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
//             href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//             target="_blank"
//             rel="noopener noreferrer"
//           >
//             Documentation
//           </a>
//         </div>
//       </main>
//     </div>
//   );
// }

// src/app/page.tsx
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PawPrint } from "lucide-react";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) redirect("/dashboard");
  redirect("/login");

  // return (
  //   <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-slate-100 flex items-center justify-center p-6">
  //     <div className="w-full max-w-xl bg-white/70 backdrop-blur border border-white/30 rounded-3xl shadow-xl p-8">
  //       <div className="flex items-center gap-3">
  //         <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg">
  //           <PawPrint className="w-6 h-6 text-white" />
  //         </div>
  //         <div className="flex flex-col">
  //           <span className="text-2xl font-bold text-slate-800">VetCare</span>
  //           <span className="text-sm text-slate-500">
  //             Sistema Veterinario — demo
  //           </span>
  //         </div>
  //       </div>

  //       <p className="mt-6 text-slate-600 leading-7">
  //         Gestiona clientes, pacientes, citas, inventario, facturas y recordatorios
  //         de vacunas en un solo lugar.
  //       </p>

  //       <div className="mt-8 flex flex-col sm:flex-row gap-3">
  //         <Link
  //           href="/login"
  //           className="h-12 px-6 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 text-white font-semibold flex items-center justify-center shadow-lg hover:opacity-95 transition"
  //         >
  //           Entrar
  //         </Link>

  //         <Link
  //           href="/sign-up"
  //           className="h-12 px-6 rounded-2xl border border-slate-200 text-slate-700 font-semibold flex items-center justify-center hover:bg-slate-50 transition"
  //         >
  //           Crear cuenta
  //         </Link>
  //       </div>

  //       <p className="mt-6 text-xs text-slate-400">
  //         * Para el demo puedes usar un usuario seed o crear uno nuevo.
  //       </p>
  //     </div>
  //   </div>
  // );
}
