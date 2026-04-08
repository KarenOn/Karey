// import type { NextConfig } from "next";

// /** @type {import('next').NextConfig} */
// const nextConfig: NextConfig = {
//   /* config options here */
//   reactCompiler: true,
//   async headers() {
//     return [
//       {
//         source: "/sw.js",
//         headers: [
//           { key: "Content-Type", value: "application/javascript; charset=utf-8" },
//           { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
//         ],
//       },
//     ];
//   },
// };

// export default nextConfig;

// module.exports = {
//   async headers() {
//     return [
//       {
//         source: '/(.*)',
//         headers: [
//           {
//             key: 'X-Content-Type-Options',
//             value: 'nosniff',
//           },
//           {
//             key: 'X-Frame-Options',
//             value: 'DENY',
//           },
//           {
//             key: 'Referrer-Policy',
//             value: 'strict-origin-when-cross-origin',
//           },
//         ],
//       },
//       {
//         source: '/sw.js',
//         headers: [
//           {
//             key: 'Content-Type',
//             value: 'application/javascript; charset=utf-8',
//           },
//           {
//             key: 'Cache-Control',
//             value: 'no-cache, no-store, must-revalidate',
//           },
//           {
//             key: 'Content-Security-Policy',
//             value: "default-src 'self'; script-src 'self'",
//           },
//         ],
//       },
//     ]
//   },
// }

import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  reactCompiler: true,
};

export default nextConfig;