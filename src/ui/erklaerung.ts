// Erklärungen ohne DOM: Steckbrief je Verfahren, fokus() für markierte Felder, Erklärsatz und Tooltip-Text.
// Karte und Erklärsatz lesen die markierten Felder aus derselben Funktion fokus().
import { RICHTUNGEN } from "../algorithms/raster";
import type { FeldZustand, Replay } from "../replay/replay";
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
  /** Datenstruktur mit Prinzip, z. B. „Warteschlange (FIFO)“. */
  readonly struktur: string;
  /** Wie die Datenstruktur arbeitet, ein Satz. */
  readonly strukturRegel: string;
  /** Zentrales Prinzip: was auf der Karte sichtbar sein muss. */
  readonly prinzip: string;
  /** Beachtet das Verfahren die Kantengewichte? */
  readonly gewichte: boolean;
}

export const ALGO_INFO: Readonly<Record<Algo, AlgoInfo>> = {
  bfs: {
    name: "BFS",
    farbe: "#ff4d73",
    kurz: "Breitensuche",
    verfahren: "Breitensuche mit Warteschlange",
    waehlt: "das Feld, das am längsten wartet (vorne in der Warteschlange)",
    findet: "den kürzesten Weg nach Anzahl der Kanten; Kantengewichte werden ignoriert",
    liste: "Warteschlange",
    struktur: "Warteschlange (FIFO)",
    strukturRegel: "Hinten wird angefügt, vorne entnommen: Wer zuerst kommt, wird zuerst expandiert.",
    prinzip: "Felder werden schichtweise expandiert: erst alle mit 1 Kante Abstand, dann alle mit 2 usw.",
    gewichte: false,
  },
  dfs: {
    name: "DFS",
    farbe: "#a56bff",
    kurz: "Tiefensuche",
    verfahren: "Tiefensuche mit Stapel",
    waehlt: "einen Nachbarn des zuletzt aufgelegten Feldes (oben auf dem Stapel)",
    findet: "irgendeinen Weg; Kantengewichte werden ignoriert",
    liste: "Stapel",
    struktur: "Stapel (LIFO)",
    strukturRegel: "Oben wird aufgelegt und oben entnommen: Das zuletzt entdeckte Feld kommt zuerst dran.",
    prinzip: "Ein Suchpfad wird so tief wie möglich verfolgt; in einer Sackgasse geht es zurück (Backtracking).",
    gewichte: false,
  },
  dijkstra: {
    name: "Dijkstra",
    farbe: "#ff8a2b",
    kurz: "günstigster Weg",
    verfahren: "Dijkstra mit Prioritätswarteschlange (Min-Heap)",
    waehlt: "das Feld mit den kleinsten bisher bekannten Kosten d",
    findet: "den günstigsten Weg (Gewichte ≥ 0, auch 0 ist erlaubt)",
    liste: "Prioritätswarteschlange",
    struktur: "Prioritätswarteschlange (Min-Heap, Schlüssel d)",
    strukturRegel: "Entnommen wird immer der Eintrag mit dem kleinsten d, egal wann er eingefügt wurde.",
    prinzip: "Der jeweils günstigste bekannte Knoten wird expandiert; danach kann sein d nicht mehr sinken.",
    gewichte: true,
  },
  astar: {
    name: "A*",
    farbe: "#ffd400",
    kurz: "günstigster Weg mit Schätzung",
    verfahren: "A* mit Prioritätswarteschlange (Min-Heap) und Schätzung h",
    waehlt: "das Feld mit dem kleinsten f = g + h (bisherige Kosten plus geschätzte Restkosten)",
    findet: "den günstigsten Weg, weil h nie überschätzt",
    liste: "Prioritätswarteschlange",
    struktur: "Prioritätswarteschlange (Min-Heap, Schlüssel f = g + h)",
    strukturRegel: "Entnommen wird immer der Eintrag mit dem kleinsten f = g + h.",
    prinzip: "Tatsächliche bisherige Kosten g und geschätzte Restkosten h bestimmen gemeinsam die Priorität f.",
    gewichte: true,
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
    case "setze": {
      const g = e.algo === "astar" ? "g" : "d";
      if (s.u === undefined) return `Der Start ${v} wird entdeckt und bekommt ${g} = 0.`;
      if (!heap) return `${v} wird entdeckt: d = ${zahl(s.d as number)} Kanten ab Start, Vorgänger ${u}. Das Gewicht des Feldes zählt für ${info.name} nicht.`;
      if ((s.altD as number) < Infinity)
        return `Verbesserung: ${g}[${v}] sinkt von ${zahl(s.altD as number)} auf ${zahl(s.d as number)}, neuer Vorgänger ist ${u}.`;
      return `${v} wird entdeckt: ${g} = ${zahl(s.d as number)}, Vorgänger ${u}.`;
    }
    case "einfuegen": {
      const g = replay.d[s.v as number];
      const wo =
        e.algo === "bfs"
          ? "hinten in die Warteschlange"
          : e.algo === "dfs"
            ? "oben auf den Stapel"
            : e.algo === "astar"
              ? `mit f = g + h = ${zahl(g)} + ${zahl((s.prio as number) - g)} = ${zahl(s.prio as number)} in die Prioritätswarteschlange`
              : `mit Priorität d = ${zahl(s.prio as number)} in die Prioritätswarteschlange`;
      const besuch = s.besuch !== undefined ? ` Das ist Besuch Nr. ${s.besuch}.` : "";
      if (s.u === undefined) return `Der Start ${v} kommt ${wo}.${besuch}`;
      return `Von ${u} aus kommt ${v} ${wo}.${besuch}`;
    }
    case "schleife":
      return s.ok ? `Die ${info.liste} ist nicht leer, also geht es weiter.` : `Die ${info.liste} ist leer.`;
    case "entnehmen":
      if (e.algo === "dfs") return `${u} hat keinen ungeprüften Nachbarn mehr. DFS nimmt es vom Stapel und springt zurück.`;
      if (e.algo === "bfs") return `${u} wartet am längsten und wird vorne aus der Warteschlange genommen und expandiert. Das ist Besuch Nr. ${s.besuch}.`;
      if (e.algo === "astar") {
        const en = replay.letzteEntnahme();
        const g = en ? en.g : 0;
        return `${u} hat das kleinste f = g + h = ${zahl(g)} + ${zahl((s.prio as number) - g)} = ${zahl(s.prio as number)} und wird entnommen.`;
      }
      return `${u} hat das kleinste d = ${zahl(s.prio as number)} aller Einträge und wird entnommen, auch wenn ältere Einträge warten.`;
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
      return `${u} wird expandiert und abgeschlossen: Günstiger als ${zahl(replay.d[s.u as number])} geht es nicht hin. Das ist Besuch Nr. ${s.besuch}.`;
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

const PFEIL: Readonly<Record<string, string>> = { oben: "↑", rechts: "→", unten: "↓", links: "←" };

/**
 * Ausgehende Kanten eines begehbaren Feldes in der festen Nachbarreihenfolge, mit Gewicht.
 * Die Kante p → q kostet so viel wie das Feld q; „–“ heißt: keine Kante (q liegt außerhalb oder ist nicht begehbar).
 */
function kanten(karte: readonly (readonly TerrainKey[])[], p: Pos): string {
  const teile = RICHTUNGEN.map((r) => {
    const zeile = karte[p.y + r.dy];
    const key = zeile?.[p.x + r.dx];
    const k = key === undefined ? Infinity : TERRAIN_NACH_KEY[key].kosten;
    return `${PFEIL[r.name]} ${k === Infinity ? "–" : k}`;
  });
  return `Kanten: ${teile.join(" · ")}`;
}

/** Zustand eines Feldes in Worten, passend zur Datenstruktur des Verfahrens. */
export function zustandText(algo: Algo, z: FeldZustand): string {
  switch (z) {
    case "unbekannt":
      return "noch nicht entdeckt";
    case "entdeckt":
      return "entdeckt, noch nicht eingereiht";
    case "wartet":
      return algo === "bfs" ? "wartet in der Warteschlange" : algo === "dfs" ? "liegt auf dem Stapel" : "wartet in der Prioritätswarteschlange";
    case "expandiert":
      return algo === "dfs" ? "expandiert (alle Nachbarn geprüft, vom Stapel genommen)" : "expandiert";
    case "weg":
      return "Teil des gefundenen Weges";
  }
}

/** Werte eines Feldes: d bzw. g, h und f, Vorgänger. */
function werte(replay: Replay, id: FeldId, h?: (id: FeldId) => number): string {
  const e = replay.ergebnis;
  const d = replay.d[id];
  const p = replay.vorg[id];
  const vorg = `Vorgänger ${p >= 0 ? koord({ x: p % e.breite, y: Math.floor(p / e.breite) }) : "–"}`;
  if (e.algo === "astar" && h) {
    const hv = h(id);
    return `g = ${zahl(d)} · h = ${zahl(hv)} · f = ${zahl(d + hv)} · ${vorg}`;
  }
  if (e.algo === "bfs" || e.algo === "dfs") return `d = ${zahl(d)} Kanten ab Start · ${vorg}`;
  return `d = ${zahl(d)} · ${vorg}`;
}

/** Tooltip-Inhalt für ein Feld (FA-23): Koordinate, Kategorie, Gewichtung, ausgehende Kanten, Zustand, Werte. */
export function feldInfo(
  karte: readonly (readonly TerrainKey[])[],
  p: Pos,
  start: Pos,
  ziel: Pos,
  replay?: Replay,
  h?: (id: FeldId) => number,
): string[] {
  const t = TERRAIN_NACH_KEY[karte[p.y][p.x]];
  const rolle = p.x === start.x && p.y === start.y ? " · Start" : p.x === ziel.x && p.y === ziel.y ? " · Ziel" : "";
  const zeilen = [`Feld ${koord(p)}${rolle}`, t.name, t.kosten === Infinity ? "nicht begehbar" : `Ausdauer ${t.kosten}`];
  // Nur begehbare Felder sind Knoten des Graphen und haben ausgehende Kanten.
  if (t.kosten !== Infinity) zeilen.push(kanten(karte, p));
  if (replay && t.kosten !== Infinity) {
    const id = p.y * replay.ergebnis.breite + p.x;
    const nr = replay.besuchNr[id];
    const z = zustandText(replay.ergebnis.algo, replay.zustand(id));
    zeilen.push(nr > 0 ? `${z} · Besuch Nr. ${nr}` : z);
    zeilen.push(werte(replay, id, h));
  }
  return zeilen;
}

export type ProtokollArt = "ein" | "aus" | "besser" | "fertig" | "ziel" | "veraltet" | "zurueck" | "keinWeg";

export interface ProtokollEintrag {
  /** Index des Steps in der Aufzeichnung; „Hierher springen“ geht zu Position schritt + 1. */
  readonly schritt: number;
  readonly art: ProtokollArt;
  readonly text: string;
}

/**
 * Ereignisprotokoll: alle relevanten Aktionen eines Laufs (Einfügen, Entnehmen, Verbessern,
 * Abschließen, veraltete Einträge, Rücksprünge, Ziel). Reine Kontrollzeilen (Schleife, Nachbar) fehlen.
 * h ist die Schätzung von A*; für die anderen Verfahren 0.
 */
export function protokoll(replay: Replay, h: (id: FeldId) => number): ProtokollEintrag[] {
  const e = replay.ergebnis;
  const k = (id: FeldId | undefined) => koord({ x: (id as number) % e.breite, y: Math.floor((id as number) / e.breite) });
  const astar = e.algo === "astar";
  const d = new Map<number, number>();
  const liste: ProtokollEintrag[] = [];
  const neu = (schritt: number, art: ProtokollArt, text: string) => liste.push({ schritt, art, text });
  e.schritte.forEach((s, i) => {
    switch (s.art) {
      case "setze": {
        d.set(s.v as number, s.d as number);
        const g = astar ? "g" : "d";
        if ((s.altD as number) < Infinity) {
          const alt = (s.altVorg as number) >= 0 ? k(s.altVorg) : "–";
          neu(i, "besser", `${k(s.v)}: ${g} ${zahl(s.altD as number)} → ${zahl(s.d as number)}, Vorgänger ${alt} → ${k(s.u)}`);
        }
        break;
      }
      case "einfuegen": {
        const g = d.get(s.v as number) ?? 0;
        const wert =
          e.algo === "astar"
            ? `g ${zahl(g)} + h ${zahl(h(s.v as number))} = f ${zahl(s.prio as number)}`
            : e.algo === "dijkstra"
              ? `d = ${zahl(s.prio as number)}`
              : `d = ${zahl(g)}`;
        const wo = e.algo === "bfs" ? "hinten in Warteschlange" : e.algo === "dfs" ? "auf Stapel gelegt" : "in Prioritätswarteschlange";
        neu(i, "ein", `${k(s.v)} ${wo} (${wert})`);
        break;
      }
      case "entnehmen":
        if (e.algo === "dfs") neu(i, "zurueck", `${k(s.u)} vom Stapel genommen: Sackgasse, zurück`);
        else if (e.algo === "bfs") neu(i, "aus", `${k(s.u)} vorne entnommen und expandiert (d = ${zahl(d.get(s.u as number) ?? 0)})`);
        else {
          const p = s.prio as number;
          const wert = astar ? `f = ${zahl(p)}, h = ${zahl(h(s.u as number))}` : `d = ${zahl(p)}`;
          neu(i, "aus", `${k(s.u)} entnommen: kleinste Priorität (${wert})`);
        }
        break;
      case "veraltetPruefung":
        if (s.ok) neu(i, "veraltet", `${k(s.u)}: veralteter Eintrag übersprungen (schon abgeschlossen)`);
        break;
      case "abschliessen":
        neu(i, "fertig", `${k(s.u)} expandiert und abgeschlossen (${astar ? "g" : "d"} = ${zahl(d.get(s.u as number) ?? 0)} endgültig)`);
        break;
      case "zielpruefung":
        if (s.ok) neu(i, "ziel", `Ziel ${k(s.u)} erreicht: Weg gefunden`);
        break;
      case "keinWeg":
        neu(i, "keinWeg", "Datenstruktur leer: Es gibt keinen Weg");
        break;
      default:
        break;
    }
  });
  return liste;
}

export interface Merkmal {
  /** „Woran erkenne ich, dass hier X läuft?“ */
  readonly frage: string;
  /** Beobachtbare Belege mit den aktuellen Zahlen des Laufs. */
  readonly belege: readonly string[];
}

const letzte = (werte: readonly number[], n = 8): string =>
  werte.length === 0 ? "noch keine" : `${werte.length > n ? "…, " : ""}${werte.slice(-n).map(zahl).join(", ")}`;

/**
 * Woran man das Verfahren in der Visualisierung erkennt, mit Belegen aus dem laufenden Replay.
 * Beantwortet z. B.: Woran erkenne ich, dass hier Dijkstra läuft und nicht eine Breitensuche?
 */
export function merkmal(replay: Replay): Merkmal {
  const e = replay.ergebnis;
  const n = replay.inhalt().length;
  switch (e.algo) {
    case "bfs": {
      const schicht = replay.entnommenePrio.at(-1);
      return {
        frage: "Woran erkenne ich die Breitensuche?",
        belege: [
          `Entnommen wird immer vorne, also der älteste Eintrag (FIFO). Jüngere Einträge haben bisher ${replay.ueberholt}-mal ältere überholt.`,
          `Expandiert wird Schicht für Schicht: d der entnommenen Felder: ${letzte(replay.entnommenePrio)}${schicht !== undefined ? ` (aktuelle Schicht d = ${zahl(schicht)})` : ""}.`,
          "d zählt Kanten, nicht Kosten: Ein Wald-Feld (4) und ein Weg-Feld (1) kosten für BFS gleich viel. Ein einmal gesetztes d ändert sich nie.",
          `In der Warteschlange: ${n} Felder.`,
        ],
      };
    }
    case "dfs": {
      return {
        frage: "Woran erkenne ich die Tiefensuche?",
        belege: [
          "Weiter geht es immer beim zuletzt aufgelegten Feld (LIFO): Der Pfad wächst in eine Richtung, solange es geht.",
          `Der Stapel ist der aktuelle Suchpfad: ${n} Felder hoch.`,
          `Rücksprünge (Backtracking) bisher: ${replay.ruecksprunge}. Bei jedem wird das oberste Feld vom Stapel genommen und es geht beim Feld darunter weiter.`,
          "Kantengewichte spielen keine Rolle; der gefundene Weg ist meist nicht der kürzeste.",
        ],
      };
    }
    case "dijkstra": {
      const u = replay.letztesUeberholen();
      const k = (id: FeldId) => koord({ x: id % e.breite, y: Math.floor(id / e.breite) });
      const beispiel = u
        ? ` Zuletzt: ${k(u.eintrag.v)} mit d = ${zahl(u.eintrag.prio)} wurde vor ${k(u.aelter.v)} mit d = ${zahl(u.aelter.prio)} entnommen, obwohl ${k(u.aelter.v)} früher eingefügt wurde.`
        : replay.fertig
          ? " Hier kein einziges Mal: Auf dieser Karte kosten alle Schritte gleich viel, und dann expandiert Dijkstra in derselben Reihenfolge wie BFS."
          : "";
      return {
        frage: "Woran erkenne ich, dass hier Dijkstra läuft und nicht eine Breitensuche?",
        belege: [
          `Entnommen wird der Eintrag mit dem kleinsten d, nicht der älteste: Bisher ${replay.ueberholt}-mal hat ein jüngerer Eintrag einen älteren überholt. Bei BFS (FIFO) passiert das nie.${beispiel}`,
          `Die entnommenen d-Werte steigen nie: ${letzte(replay.entnommenePrio)}. d zählt Kosten, nicht Kanten; die Front breitet sich deshalb in teurem Gelände langsamer aus.`,
          "Jede Kante kostet so viel wie das Feld, das man betritt. Deshalb ist schon der erste Fund eines Feldes der günstigste, und Dijkstra muss ein d hier nie nachträglich verbessern (bei A* kommt das vor).",
          `In der Prioritätswarteschlange: ${n} Einträge, davon ${replay.inhalt().filter((x) => replay.veraltet(x)).length} veraltet (lazy deletion).`,
        ],
      };
    }
    case "astar":
      return {
        frage: "Woran erkenne ich A* (und nicht Dijkstra)?",
        belege: [
          "Die Priorität ist f = g + h: g sind die tatsächlichen Kosten ab Start, h die geschätzten Restkosten bis zum Ziel.",
          `Entnommene f-Werte: ${letzte(replay.entnommenePrio)}. Mit konsistenter Schätzung steigen sie nie.`,
          "Felder in Zielrichtung haben kleineres h und kommen früher dran; deshalb wächst die Suche zum Ziel hin statt gleichmäßig in alle Richtungen wie bei Dijkstra.",
          `Weil A* nach f und nicht nach g expandiert, kann ein wartendes Feld später noch günstiger werden: bisher ${replay.verbesserungen}-mal (g und Vorgänger aktualisiert).`,
          `In der Prioritätswarteschlange: ${n} Einträge, davon ${replay.inhalt().filter((x) => replay.veraltet(x)).length} veraltet.`,
        ],
      };
  }
}
