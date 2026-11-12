// Bewertung der Ergebnisse im Vergleich (FA-14), ohne DOM: beste Wahl je Welt, Fazit in Sätzen,
// Ergebnistabelle mit ★. Regeln in CLAUDE.md, Abschnitt 8.
import { ALGOS } from "../algorithms";
import type { Algo, SearchResult } from "../types";
import type { Mass, Welt } from "../world/worlds";
import { ALGO_INFO } from "../info/algo-info";

export type Ergebnisse = Readonly<Record<Algo, SearchResult>>;

/**
 * Schwelle nur für den Fazit-Satz „die Schätzung hilft hier kaum“: A* besucht mehr als 85 % der Felder von Dijkstra.
 * Eigene Festlegung für den Text, unabhängig von den Weltbedingungen in worlds.test.ts, die anders bezogen sind
 * (Ruinenhof: A* > 85 % von BFS; Flussmoor: A* > 95 % von Dijkstra).
 */
const KAUM_ERSPARNIS = 0.85;

const STERN = '<span class="stern" aria-label="bester Wert" title="bester Wert">★</span>';
const zahl = (x: number): string => x.toLocaleString("de-DE");
const name = (a: Algo): string => ALGO_INFO[a].name;
const massVon = (welt: Welt): Mass => welt.kriterium?.mass ?? "kosten";
const rechenschritte = (e: SearchResult): number => e.schritte.length;

/** Verfahren, die den optimalen Weg der Welt gefunden haben (Ruinenhof: wenigste Felder, sonst wenigste Ausdauer). */
function optimale(welt: Welt, E: Ergebnisse): Algo[] {
  const m = massVon(welt);
  const mitWeg = ALGOS.filter((a) => E[a].gefunden);
  if (mitWeg.length === 0) return [];
  const bester = Math.min(...mitWeg.map((a) => E[a][m]));
  return mitWeg.filter((a) => E[a][m] === bester);
}

export interface BesteWahl {
  readonly algo: Algo;
  /** Ergänzt „Beste Wahl in dieser Welt: …“. */
  readonly satz: string;
  /** Das feste Kriterium der Welt in Worten, damit ★ und beste Wahl nachvollziehbar zusammenpassen. */
  readonly kriterium: string;
}

/** Beste Wahl nach dem festen Kriterium der Welt; null in der Eigenen Welt oder ohne Weg. */
export function besteWahl(welt: Welt, E: Ergebnisse): BesteWahl | null {
  const k = welt.kriterium;
  if (!k) return null;
  const opt = optimale(welt, E);
  if (opt.length === 0) return null;
  const weg = k.mass === "felder" ? "den kürzesten Weg" : "den günstigsten Weg";

  const wert = (a: Algo) => (k.wahl === "schritte" ? rechenschritte(E[a]) : E[a].besucht);
  // sort ist stabil: Bei Gleichstand gewinnt das Verfahren, das in ALGOS zuerst steht.
  const sortiert = [...opt].sort((a, b) => wert(a) - wert(b));
  const [algo, zweiter] = sortiert;
  const was = k.wahl === "schritte" ? "Rechenschritten" : "besuchten Feldern";
  const vergleich = zweiter ? ` (${zahl(wert(algo))} statt ${zahl(wert(zweiter))} bei ${name(zweiter)})` : "";
  const optWeg = k.mass === "felder" ? "kürzester Weg (wenigste Kanten)" : "günstigster Weg (wenigste Ausdauer)";
  const kriterium = `${optWeg}, dann ${k.wahl === "schritte" ? "wenigste Rechenschritte" : "wenigste besuchte Felder"}`;
  // Wer weniger Felder besucht, aber mehr rechnet, wird ausdrücklich genannt, damit der ★ dort nicht widersprüchlich wirkt.
  let zusatz = "";
  if (k.wahl === "schritte") {
    const sparsamer = opt.filter((a) => E[a].besucht < E[algo].besucht).sort((a, b) => E[a].besucht - E[b].besucht)[0];
    if (sparsamer) {
      const grund = sparsamer === "astar" ? ", weil es für jedes eingefügte Feld die Schätzung h(v) berechnet" : "";
      zusatz = ` ${name(sparsamer)} besucht zwar nur ${zahl(E[sparsamer].besucht)} statt ${zahl(E[algo].besucht)} Felder, braucht dafür aber ${zahl(rechenschritte(E[sparsamer]))} Rechenschritte${grund}.`;
    }
  }
  return { algo, satz: `${name(algo)}, weil es ${weg} mit den wenigsten ${was} findet${vergleich}.${zusatz}`, kriterium };
}

/** Platz beim Loslaufen: 1 + Zahl der Verfahren mit strikt günstigerem Weg. */
export function platz(E: Ergebnisse, a: Algo): number {
  return 1 + ALGOS.filter((b) => E[b].gefunden && E[b].kosten < E[a].kosten).length;
}

export const angekommen = (E: Ergebnisse, a: Algo, laufzeit: number | null): boolean =>
  laufzeit !== null && E[a].gefunden && laufzeit >= E[a].kosten;

/** Stand der Wiedergabe im Vergleich. */
export interface Stand {
  /** Besuchte Felder je Verfahren bisher. */
  readonly k: number;
  /** Bisher ausgeführte Rechenschritte je Verfahren. */
  readonly position: Readonly<Record<Algo, number>>;
  readonly laufzeit: number | null;
}

/** Zeilen der Ergebnistabelle als HTML. ★ gibt es erst, wenn alle Verfahren fertig sind. */
export function tabellenZeilen(welt: Welt, E: Ergebnisse, stand: Stand): string {
  const fertig = (a: Algo) => stand.k >= E[a].besucht;
  const alle = ALGOS.every(fertig);
  const mitWeg = ALGOS.filter((a) => E[a].gefunden);
  const opt = optimale(welt, E);
  // Ohne Weg bleibt jede Menge leer, dann gibt es nirgends einen ★.
  const best = (f: (a: Algo) => number, menge: readonly Algo[]) => (alle && menge.length > 0 ? Math.min(...menge.map(f)) : null);
  const bBesucht = best((a) => E[a].besucht, opt);
  const bSchritte = best((a) => rechenschritte(E[a]), opt);
  const bFelder = best((a) => E[a].felder, mitWeg);
  const bKosten = best((a) => E[a].kosten, mitWeg);
  const stern = (a: Algo, wert: number, bester: number | null, menge: readonly Algo[]) =>
    bester !== null && menge.includes(a) && wert === bester ? STERN : "";

  return ALGOS.map((a) => {
    const e = E[a];
    const fa = fertig(a);
    const wegZelle = (wert: number, bester: number | null) =>
      fa && e.gefunden ? `${zahl(wert)}${stern(a, wert, bester, mitWeg)}` : fa ? "kein Weg" : "–";
    const pl = angekommen(E, a, stand.laufzeit) ? platz(E, a) : 0;
    return `<tr>
        <th scope="row"><span class="punkt" style="background:${ALGO_INFO[a].farbe}" aria-hidden="true"></span>${name(a)}</th>
        <td>${zahl(Math.min(stand.k, e.besucht))}${fa ? stern(a, e.besucht, bBesucht, opt) : ""}</td>
        <td>${zahl(stand.position[a])}${fa ? stern(a, rechenschritte(e), bSchritte, opt) : ""}</td>
        <td>${wegZelle(e.felder, bFelder)}</td>
        <td>${wegZelle(e.kosten, bKosten)}</td>
        <td>${pl > 0 ? `Platz ${pl}${pl === 1 ? STERN : ""}` : "–"}</td></tr>`;
  }).join("");
}

/** Fazit in ganzen Sätzen, aus den Messwerten gebildet (FA-14). */
export function fazitText(welt: Welt, E: Ergebnisse): string {
  const { bfs, dfs, dijkstra: dij, astar } = E;
  if (!bfs.gefunden)
    return "Zwischen Start und Ziel gibt es keinen Weg. Jedes Verfahren hat alle erreichbaren Felder abgesucht, bevor es aufgegeben hat.";
  const s: string[] = [];
  s.push(`BFS findet den kürzesten Weg nach Anzahl der Kanten (${zahl(bfs.felder)}), ohne auf die Kosten der Felder zu achten.`);
  s.push(
    bfs.kosten === dij.kosten
      ? `Er ist hier zugleich der günstigste Weg mit ${zahl(dij.kosten)} Ausdauer.`
      : `Der günstigste Weg ist aber ein anderer: Dijkstra und A* zahlen ${zahl(dij.kosten)} statt ${zahl(bfs.kosten)} Ausdauer.`,
  );
  if (astar.besucht === dij.besucht)
    s.push(`A* besucht genauso viele Felder wie Dijkstra (${zahl(astar.besucht)}); die Schätzung hilft hier nicht.`);
  else if (astar.besucht < dij.besucht && astar.besucht > KAUM_ERSPARNIS * dij.besucht)
    s.push(
      `A* besucht mit ${zahl(astar.besucht)} fast so viele Felder wie Dijkstra (${zahl(dij.besucht)}); die Schätzung hilft hier kaum.`,
    );
  else if (astar.besucht < dij.besucht)
    s.push(`A* besucht dafür nur ${zahl(astar.besucht)} statt ${zahl(dij.besucht)} Felder, weil die Schätzung zum Ziel lenkt.`);
  else s.push(`A* besucht ${zahl(astar.besucht)} Felder, Dijkstra ${zahl(dij.besucht)}.`);
  s.push(
    `DFS findet irgendeinen Weg: ${zahl(dfs.felder)} Kanten und ${zahl(dfs.kosten)} Ausdauer, nach ${zahl(dfs.besucht)} besuchten Feldern.`,
  );

  // „Am wenigsten gesucht“ nur für Verfahren mit optimalem Weg; wer schlechter läuft, bekommt den Preis dazugesagt.
  const m = massVon(welt);
  const opt = optimale(welt, E);
  const optWert = E[opt[0]][m];
  const wenigste = Math.min(...ALGOS.map((a) => E[a].besucht));
  const sparsam = ALGOS.filter((a) => E[a].besucht === wenigste);
  for (const a of sparsam.filter((x) => !opt.includes(x))) {
    const preis =
      m === "felder"
        ? `läuft aber ${zahl(E[a].felder)} statt ${zahl(optWert)} Kanten`
        : `zahlt aber ${zahl(E[a].kosten)} statt ${zahl(optWert)} Ausdauer`;
    s.push(`${name(a)} hat zwar nur ${zahl(E[a].besucht)} Felder angesehen, ${preis}.`);
  }
  const gut = sparsam.filter((a) => opt.includes(a));
  let sucher: Algo[];
  if (gut.length > 0) {
    sucher = gut;
    s.push(`Am wenigsten gesucht ${gut.length > 1 ? "haben" : "hat"} ${gut.map(name).join(" und ")}.`);
  } else {
    const wenigsteOpt = Math.min(...opt.map((a) => E[a].besucht));
    sucher = opt.filter((a) => E[a].besucht === wenigsteOpt);
    const weg = m === "felder" ? "kürzestem" : "günstigstem";
    s.push(
      `Unter den Verfahren mit ${weg} Weg ${sucher.length > 1 ? "haben" : "hat"} ${sucher.map(name).join(" und ")} am wenigsten gesucht.`,
    );
  }

  // Wer die wenigsten Felder ansieht, rechnet nicht unbedingt am wenigsten: Ein Heap kostet mehr Zeilen als eine Warteschlange.
  const wenigsteSchritte = Math.min(...opt.map((a) => rechenschritte(E[a])));
  const rechner = opt.find((a) => rechenschritte(E[a]) === wenigsteSchritte);
  if (rechner && !sucher.includes(rechner)) {
    const andere = sucher.map((a) => `${zahl(rechenschritte(E[a]))} bei ${name(a)}`).join(" und ");
    const grund =
      rechner === "bfs"
        ? ", weil eine Warteschlange weniger Zeilen braucht als ein Heap"
        : rechner === "dfs"
          ? ", weil ein Stapel weniger Zeilen braucht als ein Heap"
          : rechner === "dijkstra"
            ? ", weil es keine Schätzung h(v) berechnen muss"
            : "";
    s.push(`Gerechnet hat aber ${name(rechner)} am wenigsten: ${zahl(wenigsteSchritte)} Rechenschritte statt ${andere}${grund}.`);
  }
  return s.join(" ");
}
