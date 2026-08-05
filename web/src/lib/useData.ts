import { useEffect, useState } from "react";
import type { Tournament, StandingRow, MatchRow, CardRow } from "../types";

export interface Dataset {
  tournaments: Tournament[];
  standings: StandingRow[];
  matches: MatchRow[];
  cards: CardRow[];
}

type State =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; data: Dataset };

const base = import.meta.env.BASE_URL;
// "?v=<build>" invalida cualquier cache (navegador o CDN de GitHub Pages)
// de un build anterior: cada deploy pide los JSON con una URL distinta.
const v = `?v=${__BUILD_ID__}`;

export function useData(): State {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [tournaments, standings, matches, cards] = await Promise.all([
          fetch(`${base}data/tournaments.json${v}`).then((r) => r.json()),
          fetch(`${base}data/standings.json${v}`).then((r) => r.json()),
          fetch(`${base}data/matches.json${v}`).then((r) => r.json()),
          fetch(`${base}data/cards.json${v}`).then((r) => r.json()),
        ]);
        if (!cancelled) {
          setState({ status: "ready", data: { tournaments, standings, matches, cards } });
        }
      } catch (e) {
        if (!cancelled) {
          setState({ status: "error", error: e instanceof Error ? e.message : String(e) });
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
