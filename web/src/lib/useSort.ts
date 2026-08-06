import { useMemo, useState } from "react";

export interface TiebreakStep<T> {
  key: keyof T;
  dir: "asc" | "desc";
}

function compareValues<T>(a: T[keyof T], b: T[keyof T], dir: "asc" | "desc"): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "string" && typeof b === "string") {
    return dir === "asc" ? a.localeCompare(b) : b.localeCompare(a);
  }
  const an = Number(a);
  const bn = Number(b);
  return dir === "asc" ? an - bn : bn - an;
}

/**
 * `tiebreaksFor`: dado el key por el que se ordena, devuelve una cadena de
 * (key, direccion fija) a probar en orden cuando la columna principal
 * empata — cada paso tiene su propia direccion ("mas victorias mejor",
 * "menos derrotas mejor"...), independiente de si la columna principal
 * esta en asc o desc.
 */
export function useSort<T>(
  rows: T[],
  initialKey: keyof T,
  initialDir: "asc" | "desc" = "desc",
  tiebreaksFor?: (key: keyof T) => TiebreakStep<T>[] | undefined
) {
  const [key, setKey] = useState<keyof T>(initialKey);
  const [dir, setDir] = useState<"asc" | "desc">(initialDir);

  const sorted = useMemo(() => {
    const tiebreaks = tiebreaksFor?.(key) ?? [];
    const copy = [...rows];
    copy.sort((a, b) => {
      const primary = compareValues(a[key], b[key], dir);
      if (primary !== 0) return primary;
      for (const step of tiebreaks) {
        const c = compareValues(a[step.key], b[step.key], step.dir);
        if (c !== 0) return c;
      }
      return 0;
    });
    return copy;
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
