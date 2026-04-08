// src/auth.ts
import { betterAuth } from "better-auth";
import { admin as adminPlugin } from "better-auth/plugins";
// import { ac, roles } from "@/auth/permissions";

export const auth = betterAuth({
  plugins: [
    // adminPlugin({
    //   ac,
    //   roles, // roles definidos en código para checks del plugin :contentReference[oaicite:5]{index=5}
    // }),
  ],
});
