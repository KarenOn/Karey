"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Mail, PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export default function ForgotPasswordPage(){
const [email,setEmail]=useState(""); const [loading,setLoading]=useState(false);
const [error,setError]=useState<string|null>(null); const [success,setSuccess]=useState(false);
async function onSubmit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setLoading(true);setError(null);
try{const r=await fetch("/api/auth/request-password-reset",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:email.trim().toLowerCase()})}); if(!r.ok) throw new Error("No pudimos iniciar la recuperacion."); setSuccess(true);}catch(err){setError(err instanceof Error?err.message:"No pudimos iniciar la recuperacion.");}finally{setLoading(false);}}
if(success)return <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center px-4"><div className="app-panel-strong w-full p-8 text-center"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0d9488_0%,#2d3a66_100%)]"><PawPrint className="size-6 text-white"/></div><h1 className="font-display text-3xl font-semibold">Revisa tu correo</h1><p className="mt-3 text-sm text-muted-foreground">Si ese correo existe en Karey Vet, te enviamos un enlace temporal de recuperacion.</p><Button asChild className="mt-6 w-full"><Link href="/login">Volver al login</Link></Button></div></div>;
return <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center px-4"><form onSubmit={onSubmit} className="app-panel-strong w-full space-y-5 p-8"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0d9488_0%,#2d3a66_100%)]"><PawPrint className="size-6 text-white"/></div>
<div className="text-center"><h1 className="font-display text-3xl font-semibold">Olvidaste tu contrasena</h1><p className="mt-2 text-sm text-muted-foreground">Ingresa tu correo y te enviaremos un enlace seguro para restablecerla.</p></div>
{error?<div className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</div>:null}
<label className="block text-sm font-semibold text-foreground/88">Correo electronico</label><div className="relative"><Mail className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input autoFocus className="h-12 pl-11 pr-4 font-semibold" type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} /></div>
<Button className="h-12 w-full" disabled={loading}>{loading?"Enviando...":"Enviar enlace de recuperacion"}</Button>
<Link className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground" href="/login"><ArrowLeft className="size-4"/>Volver al login</Link></form></div>;
}
