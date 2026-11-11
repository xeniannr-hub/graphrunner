// Erklärungen ohne DOM: Steckbrief je Verfahren, fokus() für markierte Felder, Erklärsatz und Tooltip-Text.
// Karte und Erklärsatz lesen die markierten Felder aus derselben Funktion fokus().
import type { Replay } from "../replay/replay";
import type { Algo, FeldId, Pos, Step, TerrainKey } from "../types";
import { TERRAIN_NACH_KEY } from "../world/terrain";

export interface AlgoInfo {
  readonly name: string;
  readonly farbe: string;
  readonly kurz: string;
  /** Steckbrief: Verfahren · Wählt als Nächstes · Findet. */
  readonly verfahren: string;
  readonly waehlt: string;
  readonly findet: string;
  /** Name der Datenstruktur im Satz („in die Warteschlange“). */
  readonly liste: string;
}

export const ALGO_INFO: Readonly<Record<Algo, AlgoInfo>> = {
  bfs: {
    name: "BFS",
    farbe: "#ff4d73",
    kurz: "Breitensuche",
    verfahren: "Breitensuche mit Warteschlange",
    waehlt: "das Feld, das am längsten wartet",
    findet: "den Weg mit den wenigsten Feldern",
    liste: "Warteschlange",
  },
  dfs: {
    name: "DFS",
    farbe: "#a56bff",
    kurz: "Tiefensuche",
    verfahren: "Tiefensuche mit Stapel",
    waehlt: "einen Nachbarn des zuletzt aufgelegten Feldes",
    findet: "irgendeinen Weg",
    liste: "Stapel",
  },
  dijkstra: {
    name: "Dijkstra",
    farbe: "#ff8a2b",
    kurz: "günstigster Weg",
    verfahren: "Dijkstra mit Heap",
    waehlt: "das Feld mit den kleinsten bisherigen Kosten",
    findet: "den günstigsten Weg",
    liste: "Heap",
  },
  astar: {
    name: "A*",
    farbe: "#ffd400",
    kurz: "günstigster Weg mit Schätzung",
    verfahren: "A* mit Heap und Schätzung",
    waehlt: "das Feld mit den kleinsten Kosten plus Schätzung",
    findet: "den günstigsten Weg",
    liste: "Heap",
  },
};

export interface Fokus {
  /** Weißer Rahmen: wird bearbeitet. */
  readonly bearbeitet: FeldId | null;
  /** Gelber Rahmen: wird geprüft. */
  readonly geprueft: FeldId | null;
  /** Roter statt gelber Rahmen: Prüfung negativ. */
  readonly negativ: boolean;
}

/** Welche Felder der Step markiert. */
export function fokus(step: Step | undefined): Fokus {
  if (!step) return { bearbeitet: null, geprueft: null, negativ: false };
  if (step.u === undefined) {
    // d[s] ← 0 und das erste Einfügen bearbeiten den Start.
    return { bearbeitet: step.v ?? null, geprueft: null, negativ: false };
  }
  const negativ = (step.art === "markiertPruefung" || step.art === "vergleiche") && step.ok === false;
  return { bearbeitet: step.u, geprueft: step.v ?? null, negativ };
}

export const koord = (p: Pos): string => `(${p.x}|${p.y})`;

const zahl = (x: number): string => (x === Infinity ? "∞" : String(x));

/** Erklärsatz zum zuletzt ausgeführten Step. Nennt genau die Felder, die fokus() markiert. */
export function erklaerSatz(replay: Replay): string {
  const e = replay.ergebnis;
  const s = replay.aktuell;
  const info = ALGO_INFO[e.algo];
  if (!s) return `Drücke „Abspielen“ oder → und sieh zu, wie ${info.name} Zeile für Zeile sucht.`;
  const k = (id: FeldId | undefined) => koord({ x: (id as number) % e.breite, y: Math.floor((id as number) / e.breite) });
  const u = k(s.u);
  const v = k(s.v);
  const heap = e.algo === "dijkstra" || e.algo === "astar";
  switch (s.art) {
    case "init":
      return "Am Anfang sind alle Felder unbekannt: d = ∞, kein Vorgänger.";
    case "setze":
      if (s.u === undefined) return `Der Start ${v} bekommt d = 0.`;
      return heap
        ? `${v} bekommt die neuen Kosten ${zahl(s.d as number)} und den Vorgänger ${u}.`
        : `${v} bekommt d = ${zahl(s.d as number)} und den Vorgänger ${u}.`;
    case "einfuegen": {
      const wo = e.algo === "bfs" ? "hinten in die Warteschlange" : e.algo === "dfs" ? "oben auf den Stapel" : `mit Priorität ${zahl(s.prio as number)} in den Heap`;
      const besuch = s.besuch !== undefined ? ` Das ist Besuch Nr. ${s.besuch}.` : "";
      if (s.u === undefined) return `Der Start ${v} kommt ${wo}.${besuch}`;
      return `Von ${u} aus kommt ${v} ${wo}.${besuch}`;
    }
    case "schleife":
      return s.ok ? `Die ${info.liste} ist nicht leer, also geht es weiter.` : `Die ${info.liste} ist leer.`;
    case "entnehmen":
      if (e.algo === "dfs") return `${u} hat keinen ungeprüften Nachbarn mehr. DFS nimmt es vom Stapel und springt zurück.`;
      if (e.algo === "bfs") return `${u} wartet am längsten und wird vorne aus der Warteschlange genommen. Das ist Besuch Nr. ${s.besuch}.`;
      return `${u} hat die kleinste Priorität ${zahl(s.prio as number)} und wird aus dem Heap genommen.`;
    case "oben":
      return `Oben auf dem Stapel liegt ${u}.`;
    case "zielpruefung":
      return s.ok ? `${u} ist das Ziel. Weg gefunden!` : `${u} ist nicht das Ziel.`;
    case "nachbar":
      return `Nächster Nachbar von ${u} ist ${v}.`;
    case "keinNachbar":
      return e.algo === "dfs" ? `${u} hat keinen ungeprüften Nachbarn mehr.` : `Alle Nachbarn von ${u} sind geprüft.`;
    case "markiertPruefung":
      return s.ok ? `${v} ist noch nicht entdeckt, also wird es von ${u} aus entdeckt.` : `${v} ist schon entdeckt und wird von ${u} aus übersprungen.`;
    case "veraltetPruefung":
      return s.ok
        ? `${u} ist schon abgeschlossen. Der Eintrag im Heap ist veraltet und wird übersprungen.`
        : `${u} ist noch nicht abgeschlossen.`;
    case "abschliessen":
      return `${u} wird abgeschlossen: Günstiger als ${zahl(replay.d[s.u as number])} geht es nicht hin. Das ist Besuch Nr. ${s.besuch}.`;
    case "rechne": {
      const du = replay.d[s.u as number];
      return `Über ${u} kostet ${v}: ${zahl(du)} + ${zahl((s.wert as number) - du)} = ${zahl(s.wert as number)}.`;
    }
    case "vergleiche":
      return s.ok
        ? `${zahl(s.wert as number)} ist kleiner als bisher ${zahl(replay.d[s.v as number])}: Über ${u} ist ${v} günstiger.`
        : `${zahl(s.wert as number)} ist nicht kleiner als bisher ${zahl(replay.d[s.v as number])}: Über ${u} wird ${v} nicht günstiger.`;
    case "keinWeg":
      return `Die ${info.liste} ist leer, ohne dass das Ziel erreicht wurde: Es gibt keinen Weg.`;
  }
}

/** Tooltip-Inhalt für ein Feld (FA-23): Koordinate, Kategorie, Gewichtung, Besuch-Nr. bzw. Status. */
export function feldInfo(
  karte: readonly (readonly TerrainKey[])[],
  p: Pos,
  start: Pos,
  ziel: Pos,
  replay?: Replay,
): string[] {
  const t = TERRAIN_NACH_KEY[karte[p.y][p.x]];
  const rolle = p.x === start.x && p.y === start.y ? " · Start" : p.x === ziel.x && p.y === ziel.y ? " · Ziel" : "";
  const zeilen = [`Feld ${koord(p)}${rolle}`, t.name, t.kosten === Infinity ? "nicht begehbar" : `Ausdauer ${t.kosten}`];
  if (replay && t.kosten !== Infinity) {
    const id = p.y * replay.ergebnis.breite + p.x;
    const nr = replay.besuchNr[id];
    if (nr > 0) zeilen.push(`Besuch Nr. ${nr}`);
    else if (replay.wartet(id)) zeilen.push(replay.ergebnis.algo === "bfs" ? "entdeckt, wartet in der Warteschlange" : "entdeckt, wartet im Heap");
    else zeilen.push("noch nicht besucht");
  }
  return zeilen;
}
