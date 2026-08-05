import { useEffect, useState } from "react";

function readTheme(): "light" | "dark" {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Sigue el tema claro/oscuro activo (preferencia del sistema o
 * data-theme en <html>), para elegir la variante correcta de la paleta en
 * los charts renderizados con JS (SVG/canvas), donde el CSS no basta. */
export function useTheme(): "light" | "dark" {
  const [mode, setMode] = useState<"light" | "dark">(() =>
    typeof window === "undefined" ? "light" : readTheme()
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setMode(readTheme());
    mq.addEventListener("change", update);
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      mq.removeEventListener("change", update);
      observer.disconnect();
    };
  }, []);

  return mode;
}
