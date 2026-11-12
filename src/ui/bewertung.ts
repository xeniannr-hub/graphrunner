// Bewertung der Ergebnisse im Vergleich (FA-14), ohne DOM: beste Wahl je Welt, Fazit in Sätzen,
// Ergebnistabelle mit ★. Regeln in CLAUDE.md, Abschnitt 8.
import { ALGOS } from "../algorithms";
import type { Algo, SearchResult } from "../types";
import type { Welt } from "../world/worlds";
import { ALGO_INFO } from "./erklaerung";

export type Ergebnisse = Readonly<Record<Algo, SearchResult>>;

/** Was „optimaler Weg“ heißt: wenigste Felder oder wenigste Ausdauer. */
type Mass = "felder" | "kosten";
/** Wonach unter den Verfahren mit optimalem Weg gewählt wird. */
type Wahl = "schritte" | "besucht" | "ohneSchaetzung";

/** Festes Kriterium je Welt. Die Eigene Welt hat keins und deshalb keine „Beste Wahl“. */
const KRITERIUM: Readonly<Record<string, { readonly mass: Mass; readonly wahl: Wahl }>> = {
  ruinenhof: { mass: "felder", wahl: "schritte" },
  stollen: { mass: "kosten", wahl: "besucht" },
  flussmoor: { mass: "kosten", wahl: "ohneSchaetzung" },
  handelsstrasse: { mass: "kosten", wahl: "besucht" },
};

const STERN = '<span class="stern" aria-label="bester Wert" title="bester Wert">★</span>';
const zahl = (x: number): string => x.toLocaleString("de-DE");
const name = (a: Algo): string => ALGO_INFO[a].name;
const massVon = (welt: Welt): Mass => KRITERIUM[welt.id]?.mass ?? "kosten";
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
}

/** Beste Wahl nach dem festen Kriterium der Welt; null in der Eigenen Welt oder ohne Weg. */
export function besteWahl(welt: Welt, E: Ergebnisse): BesteWahl | null {
  const k = KRITERIUM[welt.id];
  if (!k) return null;
  const opt = optimale(welt, E);
  if (opt.length === 0) return null;
  const weg = k.mass === "felder" ? "den kürzesten Weg" : "den günstigsten Weg";

  if (k.wahl === "ohneSchaetzung") {
    if (!opt.includes("dijkstra")) return null;
    const d = E.dijkstra.besucht;
    const s = E.astar.besucht;
    let zusatz = "";
    if (opt.includes("astar") && s < d) {
      const prozent = (((d - s) / d) * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 });
      zusatz = ` A* spart mit seiner Schätzung nur ${prozent} % der Felder (${zahl(s)} statt ${zahl(d)}).`;
    } else if (opt.includes("astar") && s === d) {
      zusatz = " A* besucht mit seiner Schätzung genauso viele Felder.";
    }
    return { algo: "dijkstra", satz: `Dijkstra, weil es ${weg} findet, ohne eine Schätzung zu brauchen.${zusatz}` };
  }

  const wert = (a: Algo) => (k.wahl === "schritte" ? rechenschritte(E[a]) : E[a].besucht);
  // sort ist stabil: Bei Gleichstand gewinnt das Verfahren, das in ALGOS zuerst steht.
  const sortiert = [...opt].sort((a, b) => wert(a) - wert(b));
  const [algo, zweiter] = sortiert;
  const was = k.wahl === "schritte" ? "Rechenschritten" : "besuchten Feldern";
  const vergleich = zweiter ? ` (${zahl(wert(algo))} statt ${zahl(wert(zweiter))} bei ${name(zweiter)})` : "";
  return { algo, satz: `${name(algo)}, weil es ${weg} mit den wenigsten ${was} findet${vergleich}.` };
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
    const wegZelle = (wert: number, bester: number | null) => (fa && e.gefunden ? `${zahl(wert)}${stern(a, wert, bester, mitWeg)}` : fa ? "kein Weg" : "–");
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
  if (!bfs.gefunden) return "Zwischen Start und Ziel gibt es keinen Weg. Jedes Verfahren hat alle erreichbaren Felder abgesucht, bevor es aufgegeben hat.";
  const s: string[] = [];
  s.push(`BFS ignoriert die Kantengewichte und findet den kürzesten Weg nach Anzahl der Kanten (${zahl(bfs.felder)}).`);
  s.push(
    bfs.kosten === dij.kosten
      ? `Er ist hier zugleich der günstigste Weg mit ${zahl(dij.kosten)} Ausdauer.`
      : `Der günstigste Weg ist aber ein anderer: Dijkstra und A* zahlen ${zahl(dij.kosten)} statt ${zahl(bfs.kosten)} Ausdauer.`,
  );
  // Ab 85 % gilt die Ersparnis als gering, wie in der Bedingung des Ruinenhofs (CLAUDE.md, Abschnitt 7).
  if (astar.besucht === dij.besucht) s.push(`A* besucht genauso viele Felder wie Dijkstra (${zahl(astar.besucht)}); die Schätzung hilft hier nicht.`);
  else if (astar.besucht < dij.besucht && astar.besucht > 0.85 * dij.besucht)
    s.push(`A* besucht mit ${zahl(astar.besucht)} fast so viele Felder wie Dijkstra (${zahl(dij.besucht)}); die Schätzung hilft hier kaum.`);
  else if (astar.besucht < dij.besucht) s.push(`A* besucht dafür nur ${zahl(astar.besucht)} statt ${zahl(dij.besucht)} Felder, weil die Schätzung zum Ziel lenkt.`);
  else s.push(`A* besucht ${zahl(astar.besucht)} Felder, Dijkstra ${zahl(dij.besucht)}.`);
  s.push(`DFS findet irgendeinen Weg: ${zahl(dfs.felder)} Kanten und ${zahl(dfs.kosten)} Ausdauer, nach ${zahl(dfs.besucht)} besuchten Feldern.`);

  // „Am wenigsten gesucht“ nur für Verfahren mit optimalem Weg; wer schlechter läuft, bekommt den Preis dazugesagt.
  const m = massVon(welt);
  const opt = optimale(welt, E);
  const optWert = E[opt[0]][m];
  const wenigste = Math.min(...ALGOS.map((a) => E[a].besucht));
  const sparsam = ALGOS.filter((a) => E[a].besucht === wenigste);
  for (const a of sparsam.filter((x) => !opt.includes(x))) {
    const preis = m === "felder" ? `läuft aber ${zahl(E[a].felder)} statt ${zahl(optWert)} Kanten` : `zahlt aber ${zahl(E[a].kosten)} statt ${zahl(optWert)} Ausdauer`;
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
    s.push(`Unter den Verfahren mit ${weg} Weg ${sucher.length > 1 ? "haben" : "hat"} ${sucher.map(name).join(" und ")} am wenigsten gesucht.`);
  }

  // Wer die wenigsten Felder ansieht, rechnet nicht unbedingt am wenigsten: Ein Heap kostet mehr Zeilen als eine Warteschlange.
  const wenigsteSchritte = Math.min(...opt.map((a) => rechenschritte(E[a])));
  const rechner = opt.find((a) => rechenschritte(E[a]) === wenigsteSchritte);
  if (rechner && !sucher.includes(rechner)) {
    const andere = sucher.map((a) => `${zahl(rechenschritte(E[a]))} bei ${name(a)}`).join(" und ");
    const grund = rechner === "bfs" ? ", weil eine Warteschlange weniger Arbeit macht als ein Heap" : rechner === "dfs" ? ", weil ein Stapel weniger Arbeit macht als ein Heap" : "";
    s.push(`Gerechnet hat aber ${name(rechner)} am wenigsten: ${zahl(wenigsteSchritte)} Rechenschritte statt ${andere}${grund}.`);
  }
  return s.join(" ");
}
