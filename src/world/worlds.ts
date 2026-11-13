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
  /** Beobachtungshinweis vor dem Abspielen im Vergleich (ein Satz). Keine Aufgabe: AB-05 und FA-20 bleiben Won't. */
  readonly achteAuf: string;
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
      "Wenn jeder Schritt gleich viel kostet, ist der kürzeste Weg nach Kanten zugleich der günstigste, und BFS garantiert genau diesen Weg mit einer einfachen Warteschlange. Im Ruinenhof kostet jedes Feld 2 Ausdauer; Dijkstra und A* finden denselben Weg, rechnen aber mehr, weil sie Prioritäten verwalten und A* zusätzlich schätzt. Die Schätzung hilft hier kaum, weil von Ecke zu Ecke fast alle Felder auf einem gleich kurzen Weg liegen.",
    kriterium: { mass: "felder", wahl: "schritte" },
    achteAuf:
      "Achte darauf, wie BFS und A* am Ende fast gleich viele Felder des Hofes absuchen, während DFS in langen Bahnen hin und her läuft.",
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
    wann: "es nur einen Weg gibt und DFS mit seiner Nachbarreihenfolge Glück hat",
    warum:
      "Im Stollen führt genau ein Weg zum Ziel; jeder gefundene Weg ist also der günstigste, und die Garantien der anderen Verfahren bringen hier nichts. DFS hat hier Glück mit der Reihenfolge oben, rechts, unten, links: Es probiert die passenden Gänge zuerst und besucht nur 61 Felder, mit „rechts“ zuerst wären es über 240. BFS, Dijkstra und A* suchen dagegen alle Abzweigungen gleichzeitig ab und besuchen deutlich mehr Felder.",
    kriterium: { mass: "kosten", wahl: "besucht" },
    achteAuf: "Achte darauf, wie DFS einen Gang bis zum Ende verfolgt, während die anderen alle Abzweigungen gleichzeitig absuchen.",
    lernpunkt:
      "Nur 12 der 24 möglichen Nachbarreihenfolgen erfüllen „DFS besucht weniger als 70 % jedes anderen Verfahrens“. Der Vorteil ist also Glück, keine Eigenschaft von DFS: DFS garantiert weder den kürzesten noch den günstigsten Weg.",
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
    wann: "Felder verschieden viel kosten und keine Schätzung wirklich hilft",
    warum:
      "Weil die Felder verschieden viel kosten, braucht man ein Verfahren mit Garantie für den günstigsten Weg; Dijkstra liefert ihn bei Kosten ≥ 0 immer, ganz ohne Schätzung. A* liegt hier praktisch gleichauf (226 statt 230 besuchte Felder), weil der günstige Weg über die Brücke weit vom Ziel wegführt und die Schätzung das nicht kennt; ihr Mehraufwand lohnt sich deshalb nicht. BFS nimmt die Furt durch den Sumpf mit weniger Kanten und zahlt fast das Dreifache.",
    kriterium: { mass: "kosten", wahl: "schritte" },
    achteAuf:
      "Achte darauf, wie die Front von Dijkstra auf dem Weg schnell vorankommt und im Sumpf kaum, während die Front von BFS überall gleich schnell wächst.",
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
      "Mit einer zulässigen Schätzung findet A* garantiert denselben günstigsten Weg wie Dijkstra, sucht aber gezielt in Richtung Ziel. Hier führt die Straße vom Start bis zur Schatztruhe, also lenkt die Schätzung richtig: A* besucht weniger als ein Viertel der Felder von Dijkstra. BFS geht quer über Wiese und Wald und zahlt mehr.",
    kriterium: { mass: "kosten", wahl: "besucht" },
    achteAuf: "Achte darauf, wie A* auf der Straße bleibt, während Dijkstra sich in alle Richtungen ausbreitet.",
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
    achteAuf: "Achte darauf, wie sich die Form der Fronten ändert, wenn du teures Gelände oder Hindernisse malst.",
    lernpunkt:
      "Die Schätzung von A* ist h(v) = Manhattan-Abstand × billigstes Feld der ganzen Karte. Auf reiner Wiese ist der Faktor 2. Schon ein einziges Weg- oder Brückenfeld irgendwo senkt ihn auf 1 und halbiert damit h auf allen Feldern; A* lenkt dann schwächer und besucht mehr Felder, obwohl sich am Weg nichts geändert hat.",
    karte: Array.from({ length: 20 }, () => ".".repeat(32)),
    start: { x: 3, y: 10 },
    ziel: { x: 28, y: 10 },
  },
];
