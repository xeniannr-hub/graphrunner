// Welche Felder ein Step markiert. Karte (render/) und Erklärsatz (ui/) lesen sie aus dieser einen Funktion,
// damit beide immer dieselben Felder nennen.
import type { FeldId, Step } from "../types";

export interface Fokus {
  /** Weißer Rahmen: wird bearbeitet. */
  readonly bearbeitet: FeldId | null;
  /** Gelber Rahmen: wird geprüft. */
  readonly geprueft: FeldId | null;
  /** Roter statt gelber Rahmen: Prüfung negativ. */
  readonly negativ: boolean;
}

/** Feld, das der Step bearbeitet (u), und Feld, das er prüft, setzt oder einfügt (v). */
function felderVon(step: Step): { u: FeldId | undefined; v: FeldId | undefined } {
  return { u: "u" in step ? step.u : undefined, v: "v" in step ? step.v : undefined };
}

/** Welche Felder der Step markiert. */
export function fokus(step: Step | undefined): Fokus {
  if (!step) return { bearbeitet: null, geprueft: null, negativ: false };
  const { u, v } = felderVon(step);
  // Ohne u: d[s] ← 0, h(s) und das erste Einfügen bearbeiten den Start.
  if (u === undefined) return { bearbeitet: v ?? null, geprueft: null, negativ: false };
  const negativ = (step.art === "markiertPruefung" || step.art === "vergleiche") && !step.ok;
  return { bearbeitet: u, geprueft: v ?? null, negativ };
}
