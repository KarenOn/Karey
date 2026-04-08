// "use client";

// import React from "react";
// import { Label } from "@/components/ui/label";
// import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Switch } from "@/components/ui/switch";

// export default function FormField({
//   label = "",
//   name = "",
//   type = "text",
//   value,
//   onChange,
//   placeholder = "",
//   options = [],
//   required = false,
//   disabled = false,
//   className = "",
//   error = ""
// }) {
//   const handleChange = (newValue) => {
//     onChange({ target: { name, value: newValue } });
//   };

//   return (
//     <div className={`space-y-2 ${className}`}>
//       {label && (
//         <Label htmlFor={name} className="text-sm font-medium text-slate-700">
//           {label}
//           {required && <span className="text-red-500 ml-1">*</span>}
//         </Label>
//       )}
      
//       {type === "textarea" ? (
//         <>
//           <Textarea
//             id={name}
//             name={name}
//             value={value || ""}
//             onChange={onChange}
//             placeholder={placeholder}
//             disabled={disabled}
//             className="bg-white"
//           />
//           {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
//         </>
//       ) : type === "select" ? (
//         <>
//           <Select value={value || ""} onValueChange={handleChange} disabled={disabled}>
//             <SelectTrigger className="bg-white">
//               <SelectValue placeholder={placeholder || "Seleccionar..."} />
//             </SelectTrigger>
//             <SelectContent>
//               {options.map((opt) => (
//                 <SelectItem key={opt.value} value={opt.value}>
//                   {opt.label}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//           {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
//         </>
//       ) : type === "switch" ? (
//         <>
//           <div className="flex items-center gap-2">
//             <Switch
//               id={name}
//               checked={value || false}
//               onCheckedChange={(checked) => handleChange(checked)}
//               disabled={disabled}
//             />
//             <Label htmlFor={name} className="text-sm text-slate-600">{placeholder}</Label>
//           </div>
//           {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
//         </>
//       ) : (
//         <>
//           <Input
//             id={name}
//             name={name}
//             type={type}
//             value={value || ""}
//             onChange={onChange}
//             placeholder={placeholder}
//             disabled={disabled}
//             className="bg-white"
//           />
//           {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
//         </>
//       )}
//     </div>
//   );
// }

"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type Option = { value: string | number; label: string };
type FieldType = "text" | "email" | "password" | "number" | "textarea" | "select" | "switch";
type FieldValue = string | number | boolean | null | undefined;

type FormFieldProps = {
  label?: string;
  name?: string;
  type?: FieldType;
  value?: FieldValue;
  onChange?: (event: { target: { name: string; value: string | number | boolean } }) => void;
  placeholder?: string;
  options?: Option[];
  required?: boolean;
  disabled?: boolean;
  className?: string;
  error?: string;
  inputMask?: React.Ref<HTMLInputElement>;
};

export default function FormField({
  label = "",
  name = "",
  type = "text",
  value,
  onChange,
  placeholder = "",
  options = [] as Option[],
  required = false,
  disabled = false,
  className = "",
  error = "",
  inputMask,
}: FormFieldProps) {
  const emitChange = (newValue: string | number | boolean) => {
    onChange?.({ target: { name, value: newValue } });
  };

  const safeValue = value === undefined || value === null ? "" : String(value);

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <Label htmlFor={name} className="text-sm font-semibold text-foreground/90">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}

      {type === "textarea" ? (
        <>
          <Textarea
            id={name}
            name={name}
            value={value ?? ""}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            className="bg-input"
          />
          {error && <p className="mt-1 text-sm font-medium text-red-500">{error}</p>}
        </>
      ) : type === "select" ? (
        <>
          <Select
            value={safeValue}
            onValueChange={(val) => emitChange(val)}
            disabled={disabled}
          >
            <SelectTrigger className="w-full bg-input">
              <SelectValue placeholder={placeholder || "Seleccionar..."} />
            </SelectTrigger>
            <SelectContent>
              {(options as Option[]).map((opt) => (
                <SelectItem key={String(opt.value)} value={String(opt.value)}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {error && <p className="mt-1 text-sm font-medium text-red-500">{error}</p>}
        </>
      ) : type === "switch" ? (
        <>
          <div className="flex items-center gap-2">
            <Switch
              id={name}
              checked={Boolean(value)}
              onCheckedChange={(checked) => emitChange(checked)}
              disabled={disabled}
            />
            <Label htmlFor={name} className="text-sm text-muted-foreground">
              {placeholder}
            </Label>
          </div>
          {error && <p className="mt-1 text-sm font-medium text-red-500">{error}</p>}
        </>
      ) : (
        <>
          <Input
            id={name}
            name={name}
            type={type}
            value={value ?? ""}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            className="bg-input"
            ref={inputMask}
          />
          {error && <p className="mt-1 text-sm font-medium text-red-500">{error}</p>}
        </>
      )}
    </div>
  );
}
