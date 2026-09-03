"use client";

import * as React from "react";
import { useMaskito } from "@maskito/react";
import phoneMaskOptions from "@/components/shared/PhoneMask";
import { Input } from "@/components/ui/input";

type PhoneInputProps = React.ComponentProps<typeof Input>;

export default function PhoneInput(props: PhoneInputProps) {
  const maskRef = useMaskito({ options: phoneMaskOptions });

  return (
    <Input
      autoComplete="tel"
      inputMode="tel"
      placeholder="+1 (809) 555-1234"
      ref={maskRef}
      {...props}
    />
  );
}
