// "use client";

// import { useEffect } from "react";

// export default function RegisterSW() {
//   useEffect(() => {
//     if (!("serviceWorker" in navigator)) return;

//     navigator.serviceWorker
//       .register("/sw.js")
//       .catch((err) => console.error("SW register failed:", err));
//   }, []);

//   return null;
// }

"use client";
import { useEffect } from "react";

export default function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Añadimos un query string para saltar el caché del proxy HTTPS de Next.js
    navigator.serviceWorker
      .register("/sw.js?v=1") 
      .then((registration) => {
        // Fuerza la actualización si el archivo cambió
        registration.update();
      })
      .catch((err) => console.error("SW register failed:", err));
  }, []);

  return null;
}
