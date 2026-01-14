// "use client";

// import { motion } from "framer-motion";
// import Link from "next/link";
// import Image from "next/image";
// import { Mail, Lock, ArrowLeft, LogIn } from "lucide-react";
// import { useState } from "react";
// import { auth } from "@/lib/auth";
// import { zodResolver } from '@hookform/resolvers/zod';
// import { useForm, FormProvider } from 'react-hook-form';
// import z from "zod";
// import { LoginSchema } from "@/zod-schemas/login";

// export default function SignInPage() {
//     const [loading, setLoading] = useState(false);
//     const [email, setEmail] = useState('');
//     const [password, setPassword] = useState('');

//   const methods = useForm<z.infer<typeof LoginSchema>>({
//         resolver: zodResolver(LoginSchema),
//         defaultValues: {
//             email: '',
//             password: ''
//         }
//     });

//     const { register, handleSubmit, formState: { errors }, clearErrors } = methods;

//     const handleEmailChange = (e: any) => {
//         setEmail(e.target.value);
//         clearErrors('email');
//     }

//     const handlePasswordChange = (e: any) => {
//         setPassword(e.target.value);
//         clearErrors('password');
//     }

//   const handleLogin = async () => {
//     try {
//         clearErrors();
//         const formData = new FormData();
//         formData.append('email', email);
//         formData.append('password', password);

//         const response = await auth.api.signInEmail({
//             body: {
//                 email,
//                 password
//             },
//             asResponse: true
//         })

//         console.log('response', response);

//     } catch (error) {
//         console.error("Error during authentication:", error);
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-slate-50">
//       <motion.div
//         initial={{ opacity: 0, y: 30 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ duration: 0.4 }}
//         className="bg-white rounded-3xl shadow-lg w-full max-w-md p-8"
//       >
//         <div className="flex flex-col items-center mb-8">
//           <Image
//             src="/logo.png"
//             alt="VetCare Pro"
//             width={70}
//             height={70}
//             className="rounded-full shadow"
//           />
//           <h1 className="text-2xl font-bold mt-4 text-slate-800">
//             Welcome to VetCare Pro
//           </h1>
//           <p className="text-slate-500 text-sm mt-1">Sign in to continue</p>
//         </div>

//         <button
//           className="w-full flex items-center justify-center gap-2 h-12 border border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-slate-50 transition"
//         >
//           <Image src="/google.svg" alt="Google" width={18} height={18} />
//           Continue with Google
//         </button>

//         <div className="flex items-center my-6">
//           <div className="flex-1 h-px bg-slate-200" />
//           <span className="px-3 text-xs text-slate-400">OR</span>
//           <div className="flex-1 h-px bg-slate-200" />
//         </div>

//         <form onSubmit={handleSubmit(handleLogin)} className="space-y-4">
//           <div className="relative">
//             <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
//             <input
//               type="email"
//               placeholder="you@example.com"
//               required
//               onChange={(e) => handleEmailChange(e)}
//               className="w-full pl-10 pr-3 h-10 rounded-xl border border-slate-200 focus:border-teal-500 outline-none transition"
//             />
//           </div>
//           <div className="relative">
//             <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
//             <input
//               type="password"
//               placeholder="Password"
//               required
//               onChange={(e) => handlePasswordChange(e)}
//               className="w-full pl-10 pr-3 h-10 rounded-xl border border-slate-200 focus:border-teal-500 outline-none transition"
//             />
//           </div>
//           <button
//             type="submit"
//             disabled={loading}
//             className="w-full h-11 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition flex items-center justify-center gap-2"
//           >
//             {loading ? "Signing in..." : <><LogIn className="w-4 h-4" /> Sign in</>}
//           </button>
//         </form>

//         <div className="flex justify-between text-sm mt-4 text-slate-500">
//           <Link href="#" className="hover:text-teal-600">
//             Forgot password?
//           </Link>
//           <Link href="/sign-up" className="hover:text-teal-600 font-medium">
//             Need an account? Sign up
//           </Link>
//         </div>
//       </motion.div>
//     </div>
//   );
// }

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setIsLoading(true);

    const { error } = await authClient.signIn.email(
      {
        email,
        password,
        callbackURL: "/dashboard",
        rememberMe: true,
      },
      {
        onSuccess: () => router.push("/dashboard"),
        onError: (ctx) => setErr(ctx.error.message),
      }
    );

    // por si el callback no corre en alguna versión:
    if (!error) {
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
  };

  const onGoogle = async () => {
    // Solo funcionará si configuras socialProviders.google en auth.ts
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="px-8 pt-10 pb-6 text-center">
          <div className="mx-auto mb-6 h-14 w-14 rounded-full bg-white shadow flex items-center justify-center border border-slate-100">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600" />
          </div>

          <h1 className="text-3xl font-extrabold text-slate-900">
            Welcome to VetCare Pro
          </h1>
          <p className="mt-2 text-slate-500">Sign in to continue</p>
        </div>

        <div className="px-8 pb-10">
          <button
            type="button"
            onClick={onGoogle}
            className="w-full h-12 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition flex items-center justify-center gap-3"
          >
            <span className="text-lg">G</span>
            <span className="font-medium text-slate-700">Continue with Google</span>
          </button>

          <div className="flex items-center gap-3 my-6">
            <div className="h-px bg-slate-200 flex-1" />
            <span className="text-xs text-slate-400">OR</span>
            <div className="h-px bg-slate-200 flex-1" />
          </div>

          {err && (
            <div className="mb-4 rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">
              {err}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 text-center mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="you@example.com"
                  className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-200"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 text-center mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  placeholder="••••••••"
                  className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-200"
                  required
                />
              </div>
            </div>

            <button
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-slate-950 text-white font-semibold hover:bg-slate-900 transition disabled:opacity-60"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
            <button className="hover:text-slate-700 transition" type="button">
              Forgot password?
            </button>
            <span>
              Need an account?{" "}
              <Link className="text-slate-900 font-semibold" href="/register">
                Sign up
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
