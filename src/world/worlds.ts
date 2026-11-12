// Die fünf Welten (CLAUDE.md, Abschnitt 7). Jede Textkarte hat 20 Zeilen × 32 Zeichen.
// Zeichen: = Weg, # Brücke, . Wiese, T Wald, % Sumpf, ~ Wasser, ^ Fels.
// Die Aussagen in `wann` und `warum` hält worlds.test.ts mit Messungen fest.
import type { Algo, Pos } from "../types";

export interface Welt {
  readonly id: string;
  readonly titel: string;
  /** Verfahren, für das die Welt gebaut ist; null bei der Eigenen Welt. */
  readonly algo: Algo | null;
  /** Ergänzt den Satz „X ist am besten, wenn …“. */
  readonly wann: string;
  /** Begründung in zwei bis drei Sätzen. */
  readonly warum: string;
  readonly karte: readonly string[];
  readonly start: Pos;
  readonly ziel: Pos;
}

export const WELTEN: readonly Welt[] = [
  {
    id: "ruinenhof",
    titel: "Ruinenhof",
    algo: "bfs",
    wann: "jeder Schritt gleich viel kostet",
    warum:
      "Im Ruinenhof gibt es nur Wiese, jeder Schritt kostet 2 Ausdauer. Dann ist der kürzeste Weg nach Anzahl der Kanten zugleich der günstigste, und BFS findet ihn mit einer einfachen Warteschlange. Dijkstra und A* finden denselben Weg, sparen aber kaum Felder, weil die Mauern die Schätzung von A* in die Irre führen; DFS irrt mit der festen Nachbarreihenfolge lange über die Wiese, mit einer anderen könnte es auch Glück haben.",
    karte: [
      "................................",
      "........^^...^..................",
      ".............^...^^^^.^^........",
      ".................^.....^......^.",
      "..^^^^^^^^^^^..........^^.......",
      "..^....................^........",
      "..^.^^^^^^^^^..........^........",
      "..^.^.......^...................",
      "..^.^.^^^^^.^.............^^^^..",
      "..^.^.^...^.^...................",
      "..^.^.^^^.^.^......^.....^......",
      "..^.^.....^.^......^..^..^......",
      "..^.^^^^^^^.^..^............^...",
      "..^.........^..^...^........^...",
      "..^^^^^^^^^^^......^........^...",
      "...................^^^^.^^..^.^.",
      "............................^...",
      "....^^^^.^^^................^...",
      ".^...................^..........",
      "................................",
    ],
    start: { x: 7, y: 9 },
    ziel: { x: 14, y: 5 },
  },
  {
    id: "stollen",
    titel: "Stollen",
    algo: "dfs",
    wann: "es nur einen Weg gibt, das Ziel tief liegt und DFS die passenden Gänge zuerst probiert",
    warum:
      "Im Stollen führt genau ein Weg zum Ziel, deshalb finden alle vier Verfahren denselben. DFS folgt einem Gang bis zum Ende, bevor es umkehrt, und hat hier Glück: Mit der festen Reihenfolge oben, rechts, unten, links probiert es die passenden Gänge zuerst (mit einer Reihenfolge, die mit „rechts“ beginnt, würde es über 240 statt 61 Felder besuchen). BFS, Dijkstra und A* suchen dagegen alle Abzweigungen gleichzeitig ab und besuchen deutlich mehr Felder.",
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
    karte: Array.from({ length: 20 }, () => ".".repeat(32)),
    start: { x: 3, y: 10 },
    ziel: { x: 28, y: 10 },
  },
];
