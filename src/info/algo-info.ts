// Steckbrief je Verfahren: Name, feste Farbe, Datenstruktur und Prinzip.
// Neutrales Modul: render/ und ui/ lesen es, es selbst kennt nur die gemeinsamen Typen.
import type { Algo } from "../types";

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
  /** Form der Suchfront im Vergleich (FA-31): woran man das Verfahren auf einen Blick erkennt. */
  readonly front: string;
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
    front: "gleich viele Kanten vom Start",
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
    front: "ein Ast so tief wie möglich",
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
    front: "gleiche Kosten vom Start",
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
    front: "gleiches f, zum Ziel gestreckt",
  },
};
