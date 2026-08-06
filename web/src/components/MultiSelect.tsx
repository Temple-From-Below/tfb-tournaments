import { useEffect, useRef, useState } from "react";

interface Option {
  key: string;
  label: string;
}

interface Props {
  placeholder: string;
  options: Option[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}

/** Desplegable con el mismo aspecto que un <select> normal, pero que
 * permite marcar varias opciones a la vez (checkboxes en el panel). */
export function MultiSelect({ placeholder, options, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function toggle(key: string) {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  }

  const label =
    selected.size === 0
      ? placeholder
      : selected.size === 1
        ? options.find((o) => o.key === [...selected][0])?.label ?? placeholder
        : `${selected.size} seleccionados`;

  return (
    <div className="multiselect" ref={ref}>
      <button type="button" className="multiselect-button" onClick={() => setOpen((v) => !v)}>
        <span>{label}</span>
        <span className="multiselect-caret">▾</span>
      </button>
      {open && (
        <div className="multiselect-panel" role="listbox">
          {selected.size > 0 && (
            <button type="button" className="multiselect-clear" onClick={() => onChange(new Set())}>
              Limpiar selección
            </button>
          )}
          {options.map((o) => (
            <label key={o.key} className="multiselect-option">
              <input type="checkbox" checked={selected.has(o.key)} onChange={() => toggle(o.key)} />
              {o.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
