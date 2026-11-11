// Pseudocode je Verfahren. Step.zeile zeigt auf eine Zeile (ab 1); `arten` sagt, welche Steps
// zu dieser Zeile gehören dürfen. Ein Test prüft, dass jeder Step auf eine passende Zeile zeigt.
import type { Algo, StepArt } from "../types";

export interface PseudoZeile {
  readonly text: string;
  readonly arten: readonly StepArt[];
}

const z = (text: string, ...arten: StepArt[]): PseudoZeile => ({ text, arten });

function bestensuche(name: string, startPrio: string, prio: string): PseudoZeile[] {
  return [
    z(name),
    z("  für jedes Feld v: d[v] ← ∞, vorg[v] ← –", "init"),
    z("  d[s] ← 0", "setze"),
    z(`  H.einfügen(s, ${startPrio})`, "einfuegen"),
    z("  solange H nicht leer:", "schleife"),
    z("    u ← H.entnimmKleinste()", "entnehmen"),
    z("    wenn u schon abgeschlossen: weiter", "veraltetPruefung"),
    z("    schließe u ab", "abschliessen"),
    z("    wenn u = z: Weg gefunden, fertig", "zielpruefung"),
    z("    für jeden Nachbarn v von u:", "nachbar", "keinNachbar"),
    z("      neu ← d[u] + kosten(v)", "rechne"),
    z("      wenn neu < d[v]:", "vergleiche"),
    z("        d[v] ← neu; vorg[v] ← u", "setze"),
    z(`        H.einfügen(v, ${prio})`, "einfuegen"),
    z("  kein Weg", "keinWeg"),
  ];
}

export const PSEUDOCODE: Readonly<Record<Algo, readonly PseudoZeile[]>> = {
  bfs: [
    z("BFS(Karte, s, z):"),
    z("  für jedes Feld v: d[v] ← ∞, vorg[v] ← –", "init"),
    z("  d[s] ← 0", "setze"),
    z("  Q.hintenAnfügen(s)", "einfuegen"),
    z("  solange Q nicht leer:", "schleife"),
    z("    u ← Q.vorneEntnehmen()", "entnehmen"),
    z("    wenn u = z: Weg gefunden, fertig", "zielpruefung"),
    z("    für jeden Nachbarn v von u:", "nachbar", "keinNachbar"),
    z("      wenn d[v] = ∞:", "markiertPruefung"),
    z("        d[v] ← d[u] + 1; vorg[v] ← u", "setze"),
    z("        Q.hintenAnfügen(v)", "einfuegen"),
    z("  kein Weg", "keinWeg"),
  ],
  dfs: [
    z("DFS(Karte, s, z):"),
    z("  für jedes Feld v: d[v] ← ∞, vorg[v] ← –", "init"),
    z("  d[s] ← 0", "setze"),
    z("  S.auflegen(s)", "einfuegen"),
    z("  solange S nicht leer:", "schleife"),
    z("    u ← S.oben()", "oben"),
    z("    wenn u = z: Weg gefunden, fertig", "zielpruefung"),
    z("    wenn u einen ungeprüften Nachbarn v hat:", "nachbar", "keinNachbar"),
    z("      wenn d[v] = ∞:", "markiertPruefung"),
    z("        d[v] ← d[u] + 1; vorg[v] ← u", "setze"),
    z("        S.auflegen(v)", "einfuegen"),
    z("    sonst: S.entnehmen()", "entnehmen"),
    z("  kein Weg", "keinWeg"),
  ],
  dijkstra: bestensuche("Dijkstra(Karte, s, z):", "0", "neu"),
  astar: bestensuche("A*(Karte, s, z):   h(v) = Manhattan(v, z) · billigstes Feld", "h(s)", "neu + h(v)"),
};
