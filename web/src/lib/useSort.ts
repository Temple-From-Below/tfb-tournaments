import { useMemo, useState } from "react";

export function useSort<T>(rows: T[], initialKey: keyof T, initialDir: "asc" | "desc" = "desc") {
  const [key, setKey] = useState<keyof T>(initialKey);
  const [dir, setDir] = useState<"asc" | "desc">(initialDir);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string" && typeof bv === "string") {
        return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      const an = Number(av);
      const bn = Number(bv);
      return dir === "asc" ? an - bn : bn - an;
    });
    return copy;
  }, [rows, key, dir]);

  function toggle(k: keyof T, defaultDir: "asc" | "desc" = "desc") {
    if (k === key) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setKey(k);
      setDir(defaultDir);
    }
  }

  return { sorted, sortKey: key, sortDir: dir, toggle };
}

export function sortArrow(active: boolean, dir: "asc" | "desc") {
  if (!active) return "";
  return dir === "asc" ? " ↑" : " ↓";
}
