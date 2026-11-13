// Die fünf Welten (CLAUDE.md, Abschnitt 7). Jede Textkarte hat 20 Zeilen × 32 Zeichen.
// Zeichen: = Weg, # Brücke, . Wiese, T Wald, % Sumpf, ~ Wasser, ^ Fels.
// Die Aussagen in `wann` und `warum` hält worlds.test.ts mit Messungen fest.
import type { Algo, Pos } from "../types";

/** Was in einer Welt „optimaler Weg“ heißt: wenigste Kanten oder wenigste Ausdauer. */
export type Mass = "felder" | "kosten";
/** Wonach unter den Verfahren mit optimalem Weg gewählt wird; nur gemessene Größen. */
export type Wahl = "schritte" | "besucht";

/** Festes Bewertungskriterium der Welt für „Beste Wahl“, ★ und Fazit (ui/bewertung.ts). */
export interface Kriterium {
  readonly mass: Mass;
  readonly wahl: Wahl;
}

export interface Welt {
  readonly id: string;
  readonly titel: string;
  /** Verfahren, für das die Welt gebaut ist; null bei der Eigenen Welt. */
  readonly algo: Algo | null;
  /** Ergänzt den Satz „X ist am besten, wenn …“. */
  readonly wann: string;
  /** Begründung in zwei bis drei Sätzen. */
  readonly warum: string;
  /** Bewertungskriterium; null bei der Eigenen Welt (dort gibt es keine „Beste Wahl“). */
  readonly kriterium: Kriterium | null;
  /** Lernpunkt, der über die Welt hinaus gilt (z. B. Grenzen der Aussage); leer, wenn es keinen gibt. */
  readonly lernpunkt: string;
  readonly karte: readonly string[];
  readonly start: Pos;
  readonly ziel: Pos;
}

/** Wörter eines Textes (für die Längengrenze der Kurzfassung). */
const woerter = (t: string): number => t.split(/\s+/).filter(Boolean).length;

/**
 * Kurzfassung der Begründung für die Seitenleiste: die ersten Sätze, höchstens maxSaetze und maxWoerter;
 * der Rest kommt in den Aufklapper „Mehr“. kurz + " " + rest ergibt wieder den ganzen Text.
 */
export function kurzfassung(text: string, maxSaetze = 2, maxWoerter = 35): { kurz: string; rest: string } {
  const saetze = text.split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ„])/);
  let n = 0;
  let w = 0;
  while (n < saetze.length && n < maxSaetze && w + woerter(saetze[n]) <= maxWoerter) w += woerter(saetze[n++]);
  return { kurz: saetze.slice(0, n).join(" "), rest: saetze.slice(n).join(" ") };
}

export const WELTEN: readonly Welt[] = [
  {
    id: "ruinenhof",
    titel: "Ruinenhof",
    algo: "bfs",
    wann: "jeder Schritt gleich viel kostet",
    warum:
      "Im Ruinenhof gibt es nur Wiese und Mauerreste, jeder Schritt kostet 2 Ausdauer; dann ist der kürzeste Weg nach Anzahl der Kanten zugleich der günstigste. Start und Ziel liegen in gegenüberliegenden Ecken des offenen Hofes, deshalb liegen fast alle Felder auf einem gleich kurzen Weg, und die Schätzung von A* kann kaum eines ausschließen: A* besucht fast so viele Felder wie BFS. BFS findet denselben Weg wie Dijkstra und A* mit den wenigsten Rechenschritten, weil eine Warteschlange keine Prioritäten verwalten muss.",
    kriterium: { mass: "felder", wahl: "schritte" },
    lernpunkt:
      "DFS findet hier mit der festen Reihenfolge oben, rechts, unten, links einen Weg von 456 statt 50 Kanten. Mit 8 der 24 möglichen Reihenfolgen (etwa unten, links, oben, rechts) liefe es dagegen direkt zum Ziel: DFS kann Glück oder Pech haben, BFS nicht.",
    karte: [
      "................................",
      "................................",
      "...^^^^.......^^^^^.....^^^^....",
      "...^.............^.........^....",
      "...^.....^^......^.....^...^....",
      ".........^.......^.....^........",
      ".........^^^^..........^^^^.....",
      "................................",
      ".....^^^^^^.........^^.....^^...",
      ".....^...............^......^...",
      ".....^.......^^^^....^......^...",
      ".............^.......^^^^.......",
      ".............^..................",
      "..^^^^.......^^^^.....^^^^^.....",
      ".....^.................^........",
      ".....^.....^^^^........^....^...",
      "...........^..^........^....^...",
      "...^^^.....^.......^^^^^....^...",
      "................................",
      "................................",
    ],
    start: { x: 31, y: 0 },
    ziel: { x: 0, y: 19 },
  },
  {
    id: "stollen",
    titel: "Stollen",
    algo: "dfs",
    wann: "ein Labyrinth nur einen Weg hat und die feste Nachbarreihenfolge zufällig zu den richtigen Gängen passt",
    warum:
      "Im Stollen führt genau ein Weg zum Ziel, deshalb finden alle vier Verfahren denselben. DFS folgt einem Gang bis zum Ende, bevor es umkehrt, und hat hier Glück: Mit der festen Reihenfolge oben, rechts, unten, links probiert es die passenden Gänge zuerst (mit einer Reihenfolge, die mit „rechts“ beginnt, würde es über 240 statt 61 Felder besuchen). BFS, Dijkstra und A* suchen dagegen alle Abzweigungen gleichzeitig ab und besuchen deutlich mehr Felder.",
    kriterium: { mass: "kosten", wahl: "besucht" },
    lernpunkt:
      "Der Vorteil von DFS ist hier Glück, keine Eigenschaft von DFS: Nur 12 der 24 möglichen Nachbarreihenfolgen erfüllen „DFS besucht weniger als 70 % jedes anderen Verfahrens“. Beginnt die Reihenfolge mit „rechts“, besucht DFS über 240 statt 61 Felder. In einem Labyrinth mit einem einzigen Weg ist DFS also nur dann am besten, wenn seine Reihenfolge zum Ziel passt.",
    karte: [
      "=^===^=^===^===============^===^",
      "=^^^=^=^=^^^=^^^^^=^^^^^=^=^=^=^",
      "===^=^=========^=====^=^=^===^=^",
      "^^=^=^^^=^^^^^^^^^^^=^=^^^^^=^^^",
      "=^=^=====^=^===^=========^=^===^",
      "=^=^^^=^^^=^=^^^^^^^^^^^^^=^=^^^",
      "=^=^=^=^===^=^===^=^=^=====^===^",
      "=^=^=^=^^^=^=^=^^^=^=^=^^^=^^^=^",
      "=^=======^=^=====^=======^=^=^=^",
      "=^^^^^=^^^=^=^^^^^=^^^^^=^^^=^^^",
      "=======================^===^=^=^",
      "^^=^^^^^^^^^=^^^=^^^^^^^=^=^=^=^",
      "===^=======^=^=^=^===^===^=====^",
      "^^=^=^^^^^^^^^=^=^=^=^^^^^^^^^^^",
      "=^=^=======^=^=^===^=^=========^",
      "=^=^=^^^=^=^=^=^^^^^^^^^=^^^=^=^",
      "=======^=^=================^=^=^",
      "=^=^^^=^^^=^^^=^^^^^=^=^^^=^^^=^",
      "=^===^===^===^=====^=^=^=====^=^",
      "^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^",
    ],
    start: { x: 0, y: 18 },
    ziel: { x: 30, y: 2 },
  },
  {
    id: "flussmoor",
    titel: "Flussmoor",
    algo: "dijkstra",
    wann: "Felder verschieden viel kosten und eine Schätzung kaum hilft",
    warum:
      "Der günstige Weg führt über die Brücke im Osten, weit weg vom Ziel; die Furt durch den Sumpf hat weniger Felder, kostet aber viel mehr. Dijkstra findet den günstigsten Weg mit den wenigsten Rechenschritten. A* findet denselben Weg und besucht kaum weniger Felder, weil die Schätzung den Umweg nicht kennt, muss aber für jedes eingefügte Feld h(v) ausrechnen; BFS nimmt die Furt, DFS zahlt mehr als das Doppelte.",
    kriterium: { mass: "kosten", wahl: "schritte" },
    lernpunkt: "",
    karte: [
      "^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^",
      "%%%%%%%%%%%%%%%%%TTTTTTT^^^^^~~~",
      "%%%%%%%%%%%%%%%%%TTTTTTT^^^^^~~~",
      "%%%%=========================~~~",
      "%%%%=%%%%TTTTTT%%%TTTTT~~~~~=~~~",
      "%%%%=%%%%TTTTTT%%%TTTTT~~~~~=~~~",
      "%%%%=%%%%TTTTTT%%%TTTTT~~~~~=~~~",
      "%%%%=%%%%TTTTTT%%%TTTTT~~~~~=~~~",
      "%%%%%%%%%%%%%%%%%%%%%%%~~~~~=~~~",
      "~~~~~~~~~~~~~~~~%~~~~~~~~~~~#~~~",
      "~~~~~~~~~~~~~~~~%~~~~~~~~~~~#~~~",
      "%%%%%%%%%%%%%%%%%%%%%%%%~~~~=~~~",
      "%%%%%=%%%%%%%%%%%%%%%%%%~~~~=~~~",
      "%%%%%=~~~~~~~~~~~~~~~~~~~~~~=~~~",
      "%%%%%========================~~~",
      "%%%%%%~~~~~~~~~~~~~~~~~~~~~~%~~~",
      "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
      "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
      "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
      "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
    ],
    start: { x: 4, y: 7 },
    ziel: { x: 5, y: 12 },
  },
  {
    id: "handelsstrasse",
    titel: "Handelsstraße",
    algo: "astar",
    wann: "das Ziel weit weg liegt und seine Richtung bekannt ist",
    warum:
      "Die Straße führt vom Start bis zur Schatztruhe am anderen Ende der Karte. A* schätzt den Restweg und bleibt deshalb auf der Straße, während Dijkstra sich in alle Richtungen ausbreitet. Beide finden denselben günstigsten Weg, A* besucht dabei weniger als ein Viertel der Felder; BFS geht quer über Wiese und Wald und zahlt mehr.",
    kriterium: { mass: "kosten", wahl: "besucht" },
    lernpunkt: "",
    karte: [
      "^^^.....TTTTT...~~........^^^^^^",
      "^^^.....TTTTT...~~..TTTTTTT^^^^^",
      "........TTTTT...~~..TTTTTTT^^^^^",
      ".======.........~~..TTTTTTT.....",
      "......=.........~~..TTTTTTT.....",
      "......========..~~..TTTTTTT.....",
      "TTTTT........=..~~..........TTTT",
      "TTTTT........=..~~..........TTTT",
      "TTTTT.%%%%%..=..~~..........TTTT",
      "TTTTT.%%%%%..===##=====.....TTTT",
      "TTTTT.%%%%%.....~~....=.....TTTT",
      "TTTTT.....TTTTT.~~....=.........",
      "..........TTTTT.~~....======....",
      "..........TTTTT.~~.........=....",
      "...TTTTTTTTTTTT.~~.%%%%....=....",
      "...TTTTTTTTTTTT.~~.%%%%.TTT=TTTT",
      "...TTTTTTTTTTTT.~~.%%%%.TTT====T",
      "...TTTTTTT......~~.%%%%.TTTTTTTT",
      "...TTTTTTT......##......TTTTTTTT",
      "...TTTTTTT......~~......TTTTTTTT",
    ],
    start: { x: 1, y: 3 },
    ziel: { x: 30, y: 16 },
  },
  {
    id: "eigene",
    titel: "Eigene Welt",
    algo: null,
    wann: "",
    warum:
      "Male Gelände auf eine der Karten und setze Start und Ziel. Alle vier Verfahren rechnen nach jeder Änderung sofort neu. Probiere aus, wann welches Verfahren am besten ist.",
    kriterium: null,
    lernpunkt:
      "Die Schätzung von A* ist h(v) = Manhattan-Abstand × billigstes Feld der ganzen Karte. Auf reiner Wiese ist der Faktor 2. Schon ein einziges Weg- oder Brückenfeld irgendwo senkt ihn auf 1 und halbiert damit h auf allen Feldern; A* lenkt dann schwächer und besucht mehr Felder, obwohl sich am Weg nichts geändert hat.",
    karte: Array.from({ length: 20 }, () => ".".repeat(32)),
    start: { x: 3, y: 10 },
    ziel: { x: 28, y: 10 },
  },
];
