// Erklärungen ohne DOM: Erklärsatz, Tooltip-Text, Ereignisprotokoll, Erkennungsmerkmale, Kartenbeschreibung.
// Der Erklärsatz nennt genau die Felder, die fokus() (info/fokus.ts) markiert.
import { RICHTUNGEN } from "../algorithms/raster";
import type { FeldZustand, Replay } from "../replay/replay";
import { ALGO_INFO } from "../info/algo-info";
import type { Algo, FeldId, Pos, TerrainKey } from "../types";
import { TERRAIN_NACH_KEY } from "../world/terrain";

export const koord = (p: Pos): string => `(${p.x}|${p.y})`;

const zahl = (x: number): string => (x === Infinity ? "∞" : String(x));

/** Erklärsatz zum zuletzt ausgeführten Step. Nennt genau die Felder, die fokus() markiert. */
export function erklaerSatz(replay: Replay): string {
  const e = replay.ergebnis;
  const s = replay.aktuell;
  const info = ALGO_INFO[e.algo];
  if (!s) return `Drücke „Abspielen“ oder → und sieh zu, wie ${info.name} Zeile für Zeile sucht.`;
  const k = (id: FeldId) => koord({ x: id % e.breite, y: Math.floor(id / e.breite) });
  const heap = e.algo === "dijkstra" || e.algo === "astar";
  switch (s.art) {
    case "init":
      return "Am Anfang sind alle Felder unbekannt: d = ∞, kein Vorgänger.";
    case "setze": {
      const g = e.algo === "astar" ? "g" : "d";
      const v = k(s.v);
      if (s.u === undefined) return `Der Start ${v} wird entdeckt und bekommt ${g} = 0.`;
      const u = k(s.u);
      if (!heap)
        return `${v} wird entdeckt: d = ${zahl(s.d)} Kanten ab Start, Vorgänger ${u}. Das Gewicht des Feldes zählt für ${info.name} nicht.`;
      if (s.altD < Infinity) return `Verbesserung: ${g}[${v}] sinkt von ${zahl(s.altD)} auf ${zahl(s.d)}, neuer Vorgänger ist ${u}.`;
      return `${v} wird entdeckt: ${g} = ${zahl(s.d)}, Vorgänger ${u}.`;
    }
    case "schaetze": {
      const formel = "Manhattan-Abstand zum Ziel mal billigstes Feld";
      if (s.u === undefined)
        return `A* schätzt die Restkosten vom Start ${k(s.v)}: h = ${formel} = ${zahl(s.wert)}. Das ist ein eigener Rechenschritt.`;
      return `Von ${k(s.u)} aus schätzt A* die Restkosten von ${k(s.v)}: h = ${formel} = ${zahl(s.wert)}.`;
    }
    case "einfuegen": {
      const g = replay.d[s.v];
      const p = s.prio ?? g;
      const wo =
        e.algo === "bfs"
          ? "hinten in die Warteschlange"
          : e.algo === "dfs"
            ? "oben auf den Stapel"
            : e.algo === "astar"
              ? `mit f = g + h = ${zahl(g)} + ${zahl(p - g)} = ${zahl(p)} in die Prioritätswarteschlange`
              : `mit Priorität d = ${zahl(p)} in die Prioritätswarteschlange`;
      const besuch = s.besuch !== undefined ? ` Das ist Besuch Nr. ${s.besuch}.` : "";
      if (s.u === undefined) return `Der Start ${k(s.v)} kommt ${wo}.${besuch}`;
      return `Von ${k(s.u)} aus kommt ${k(s.v)} ${wo}.${besuch}`;
    }
    case "schleife":
      return s.ok ? `Die ${info.liste} ist nicht leer, also geht es weiter.` : `Die ${info.liste} ist leer.`;
    case "entnehmen": {
      const u = k(s.u);
      if (e.algo === "dfs") return `${u} hat keinen ungeprüften Nachbarn mehr. DFS nimmt es vom Stapel und springt zurück.`;
      if (e.algo === "bfs")
        return `${u} wartet am längsten und wird vorne aus der Warteschlange genommen und expandiert. Das ist Besuch Nr. ${s.besuch}.`;
      const p = s.prio ?? 0;
      if (e.algo === "astar") {
        const g = replay.letzteEntnahme()?.g ?? 0;
        return `${u} hat das kleinste f = g + h = ${zahl(g)} + ${zahl(p - g)} = ${zahl(p)} und wird entnommen.`;
      }
      return `${u} hat das kleinste d = ${zahl(p)} aller Einträge und wird entnommen, auch wenn ältere Einträge warten.`;
    }
    case "oben":
      return `Oben auf dem Stapel liegt ${k(s.u)}.`;
    case "zielpruefung":
      return s.ok ? `${k(s.u)} ist das Ziel. Weg gefunden!` : `${k(s.u)} ist nicht das Ziel.`;
    case "nachbar":
      return `Nächster Nachbar von ${k(s.u)} ist ${k(s.v)}.`;
    case "keinNachbar":
      return e.algo === "dfs" ? `${k(s.u)} hat keinen ungeprüften Nachbarn mehr.` : `Alle Nachbarn von ${k(s.u)} sind geprüft.`;
    case "markiertPruefung":
      return s.ok
        ? `${k(s.v)} ist noch nicht entdeckt, also wird es von ${k(s.u)} aus entdeckt.`
        : `${k(s.v)} ist schon entdeckt und wird von ${k(s.u)} aus übersprungen.`;
    case "veraltetPruefung":
      return s.ok
        ? `${k(s.u)} ist schon abgeschlossen. Der Eintrag im Heap ist veraltet und wird übersprungen.`
        : `${k(s.u)} ist noch nicht abgeschlossen.`;
    case "abschliessen":
      return `${k(s.u)} wird expandiert und abgeschlossen: Günstiger als ${zahl(replay.d[s.u])} geht es nicht hin. Das ist Besuch Nr. ${s.besuch}.`;
    case "rechne": {
      const du = replay.d[s.u];
      return `Über ${k(s.u)} kostet ${k(s.v)}: ${zahl(du)} + ${zahl(s.wert - du)} = ${zahl(s.wert)}.`;
    }
    case "vergleiche":
      return s.ok
        ? `${zahl(s.wert)} ist kleiner als bisher ${zahl(replay.d[s.v])}: Über ${k(s.u)} ist ${k(s.v)} günstiger.`
        : `${zahl(s.wert)} ist nicht kleiner als bisher ${zahl(replay.d[s.v])}: Über ${k(s.u)} wird ${k(s.v)} nicht günstiger.`;
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
      return algo === "bfs"
        ? "wartet in der Warteschlange"
        : algo === "dfs"
          ? "liegt auf dem Stapel"
          : "wartet in der Prioritätswarteschlange";
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
  const zeilen = [`Feld ${koord(p)}${rolle}`, t.name, t.kosten === Infinity ? "Ausdauer ∞ (nicht begehbar)" : `Ausdauer ${t.kosten}`];
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
  const k = (id: FeldId) => koord({ x: id % e.breite, y: Math.floor(id / e.breite) });
  const astar = e.algo === "astar";
  const d = new Map<number, number>();
  const liste: ProtokollEintrag[] = [];
  const neu = (schritt: number, art: ProtokollArt, text: string) => liste.push({ schritt, art, text });
  e.schritte.forEach((s, i) => {
    switch (s.art) {
      case "setze": {
        d.set(s.v, s.d);
        const g = astar ? "g" : "d";
        if (s.altD < Infinity) {
          const alt = s.altVorg >= 0 ? k(s.altVorg) : "–";
          neu(i, "besser", `${k(s.v)}: ${g} ${zahl(s.altD)} → ${zahl(s.d)}, Vorgänger ${alt} → ${s.u === undefined ? "–" : k(s.u)}`);
        }
        break;
      }
      case "einfuegen": {
        const g = d.get(s.v) ?? 0;
        const p = s.prio ?? g;
        const wert =
          e.algo === "astar"
            ? `g ${zahl(g)} + h ${zahl(h(s.v))} = f ${zahl(p)}`
            : e.algo === "dijkstra"
              ? `d = ${zahl(p)}`
              : `d = ${zahl(g)}`;
        const wo = e.algo === "bfs" ? "hinten in Warteschlange" : e.algo === "dfs" ? "auf Stapel gelegt" : "in Prioritätswarteschlange";
        neu(i, "ein", `${k(s.v)} ${wo} (${wert})`);
        break;
      }
      case "entnehmen":
        if (e.algo === "dfs") neu(i, "zurueck", `${k(s.u)} vom Stapel genommen: Sackgasse, zurück`);
        else if (e.algo === "bfs") neu(i, "aus", `${k(s.u)} vorne entnommen und expandiert (d = ${zahl(d.get(s.u) ?? 0)})`);
        else {
          const p = s.prio ?? 0;
          const wert = astar ? `f = ${zahl(p)}, h = ${zahl(h(s.u))}` : `d = ${zahl(p)}`;
          neu(i, "aus", `${k(s.u)} entnommen: kleinste Priorität (${wert})`);
        }
        break;
      case "veraltetPruefung":
        if (s.ok) neu(i, "veraltet", `${k(s.u)}: veralteter Eintrag übersprungen (schon abgeschlossen)`);
        break;
      case "abschliessen":
        neu(i, "fertig", `${k(s.u)} expandiert und abgeschlossen (${astar ? "g" : "d"} = ${zahl(d.get(s.u) ?? 0)} endgültig)`);
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
          "Lernpunkt: Der Verlauf hängt an der Nachbarreihenfolge (hier fest: oben, rechts, unten, links). Mit einer anderen Reihenfolge findet DFS auf derselben Karte oft einen ganz anderen Weg und besucht viel mehr oder viel weniger Felder.",
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

/**
 * Kurzbeschreibung einer Karte für Screenreader (aria-label): Verfahren, Start, Ziel, Stand der Suche,
 * Inhalt der Datenstruktur, Ergebnis und wie man Feldinfos per Tastatur bekommt.
 */
export function kartenBeschreibung(replay: Replay): string {
  const e = replay.ergebnis;
  const info = ALGO_INFO[e.algo];
  let expandiert = 0;
  for (const x of replay.expandiert) expandiert += x;
  const wartend = replay.inhalt().filter((x) => !replay.veraltet(x)).length;
  const stand = replay.gefunden
    ? `Weg gefunden: ${zahl(e.felder)} Kanten, ${zahl(e.kosten)} Ausdauer.`
    : replay.fertig
      ? "Kein Weg gefunden."
      : replay.position === 0
        ? "Suche noch nicht gestartet."
        : "Suche läuft.";
  return (
    `Karte ${info.name}: Start ${koord(e.start)}, Ziel ${koord(e.ziel)}. ${expandiert} Felder expandiert, ` +
    `${wartend} in der ${info.liste}. ${stand} Pfeiltasten bewegen den Feld-Cursor, Esc verlässt die Karte.`
  );
}
