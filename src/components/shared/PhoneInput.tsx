"use client";

import * as React from "react";
import { useMaskito } from "@maskito/react";
import phoneMaskOptions from "@/components/shared/PhoneMask";
import { Input } from "@/components/ui/input";
import { formatKareyPhone } from "@/lib/phone";

type PhoneInputProps = React.ComponentProps<typeof Input>;

export default function PhoneInput(props: PhoneInputProps) {
  const maskRef = useMaskito({ options: phoneMaskOptions });

  return (
    <Input
      {...props}
      autoComplete="tel"
      inputMode="tel"
      placeholder="+1 (809) 555-1234"
      ref={maskRef}
      onBeforeInput={(event) => {
        if (event.data && /\D/.test(event.data)) event.preventDefault();
        props.onBeforeInput?.(event);
      }}
      onPaste={(event) => {
        event.preventDefault();
        props.onChange?.({ target: { value: formatKareyPhone(event.clipboardData.getData("text")) } } as React.ChangeEvent<HTMLInputElement>);
      }}
    />
  );
}
