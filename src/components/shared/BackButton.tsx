import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BackButton({ href, label = "Volver" }: { href?: string; label?: string }) {
  const content = <><ArrowLeft className="h-4 w-4" />{label !== "" ? <span className="sr-only">{label}</span> : null}</>;
  return href ? <Button asChild type="button" variant="outline" size="icon" aria-label={label}><Link href={href}>{content}</Link></Button> : <Button type="button" variant="outline" size="icon" aria-label={label} onClick={() => window.history.back()}>{content}</Button>;
}
