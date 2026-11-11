// Ansicht „Alle vergleichen“ (FA-13, FA-14, FA-21): vier Karten im 2 × 2-Raster, ein Schritt = jedes
// Verfahren besucht ein weiteres Feld. Darunter Fazit in Sätzen und Ergebnistabelle mit ★ beim besten Wert.
import { ALGOS } from "../algorithms";
import { zeichneLeinwand } from "../render/karte";
import type { Algo } from "../types";
import { ALGO_INFO } from "./erklaerung";
import { hoverAuf, hoverOk, verbindeKarte } from "./karten-interaktion";
import { Wiedergabe } from "./wiedergabe";
import { Z, geheVergleich, vergleichMax } from "./zustand";

const STERN = '<span class="stern" aria-label="bester Wert" title="bester Wert">★</span>';

const fertig = (a: Algo): boolean => Z.k >= Z.ergebnisse[a].besucht;
const alleFertig = (): boolean => ALGOS.every(fertig);
const zahl = (x: number): string => x.toLocaleString("de-DE");

/** Platz beim Loslaufen: 1 + Zahl der Verfahren mit strikt günstigerem Weg. */
function platz(a: Algo): number {
  const k = Z.ergebnisse[a].kosten;
  return 1 + ALGOS.filter((b) => Z.ergebnisse[b].gefunden && Z.ergebnisse[b].kosten < k).length;
}

const angekommen = (a: Algo): boolean => Z.laufzeit !== null && Z.ergebnisse[a].gefunden && Z.laufzeit >= Z.ergebnisse[a].kosten;

export class Vergleich {
  readonly element: HTMLElement;
  readonly wiedergabe: Wiedergabe;
  private readonly karten = new Map<Algo, { canvas: HTMLCanvasElement; zaehler: HTMLElement; status: HTMLElement }>();
  private readonly fazit: HTMLParagraphElement;
  private readonly tabelle: HTMLTableSectionElement;

  constructor(geaendert: () => void) {
    const el = document.createElement("section");
    el.className = "ansicht vergleich";
    el.setAttribute("aria-label", "Alle vergleichen");

    const legende = document.createElement("div");
    legende.innerHTML = `
      <span><i class="farben">${ALGOS.map((a) => `<b style="color:${ALGO_INFO[a].farbe}"></b>`).join("")}</i>besucht</span>
      <span><i class="wartet"></i>entdeckt, wartet</span>
      <span><i class="kante"></i>Entdeckungskante</span>
      <span><i class="weg"></i>gefundener Weg</span>`;
    this.wiedergabe = new Wiedergabe(
      { position: () => Z.k, laenge: vergleichMax, gehe: geheVergleich },
      {
        zumEnde: false,
        legende,
        geaendert,
        loslaufen: {
          bereit: () => alleFertig() && ALGOS.some((a) => Z.ergebnisse[a].gefunden),
          laeuft: () => Z.laufzeit !== null,
          starte: () => {
            Z.laufzeit = 0;
          },
        },
      },
    );

    const raster = document.createElement("div");
    raster.className = "raster";
    for (const a of ALGOS) {
      const info = ALGO_INFO[a];
      const karte = document.createElement("article");
      karte.className = "karte-box";
      karte.style.setProperty("--farbe", info.farbe);
      karte.innerHTML = `
        <header>
          <div class="name"><span class="punkt" aria-hidden="true"></span><h2>${info.name}</h2><span class="kurz">${info.kurz}</span></div>
          <div class="zaehler" aria-live="off"></div>
          <div class="status"></div>
        </header>`;
      const canvas = document.createElement("canvas");
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", `Karte ${info.name}`);
      karte.append(canvas);
      raster.append(karte);
      verbindeKarte(canvas, () => Z.vergleich[a], geaendert);
      this.karten.set(a, {
        canvas,
        zaehler: karte.querySelector(".zaehler") as HTMLElement,
        status: karte.querySelector(".status") as HTMLElement,
      });
    }

    const ergebnis = document.createElement("section");
    ergebnis.className = "ergebnis";
    ergebnis.innerHTML = `
      <h2>Ergebnis</h2>
      <p class="fazit" aria-live="polite"></p>
      <div class="tabelle-rahmen">
        <table>
          <thead><tr><th scope="col">Verfahren</th><th scope="col">Besuchte Felder</th><th scope="col">Weglänge (Felder)</th><th scope="col">Ausdauer des Weges</th><th scope="col">Platz beim Loslaufen</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>`;
    this.fazit = ergebnis.querySelector(".fazit") as HTMLParagraphElement;
    this.tabelle = ergebnis.querySelector("tbody") as HTMLTableSectionElement;

    el.append(this.wiedergabe.element, raster, ergebnis);
    this.element = el;
  }

  /** Lässt die Figuren laufen; dt in Sekunden. Gibt true zurück, solange jemand läuft. */
  laufe(dt: number): boolean {
    if (Z.laufzeit === null) return false;
    const kosten = ALGOS.filter((a) => Z.ergebnisse[a].gefunden).map((a) => Z.ergebnisse[a].kosten);
    const max = Math.max(...kosten);
    if (Z.laufzeit >= max) return false;
    // Der teuerste Weg dauert bei mittlerem Tempo etwa 8 Sekunden; die Reihenfolge der Ankunft folgt den Kosten.
    Z.laufzeit = Math.min(max, Z.laufzeit + ((dt * Math.max(max, 8)) / 8) * (Z.tempo / 5));
    return true;
  }

  zeichne(zeit: number): void {
    for (const a of ALGOS) {
      const k = this.karten.get(a);
      if (!k) continue;
      const hover = hoverAuf(k.canvas);
      zeichneLeinwand(k.canvas, {
        karte: Z.karte,
        version: Z.version,
        start: Z.start,
        ziel: Z.ziel,
        replay: Z.vergleich[a],
        zahlen: "keine",
        details: false,
        laufzeit: Z.laufzeit,
        hover,
        hoverOk: hoverOk(hover),
        zeit,
      });
    }
  }

  aktualisiere(): void {
    this.wiedergabe.aktualisiere();
    for (const a of ALGOS) {
      const k = this.karten.get(a);
      if (!k) continue;
      const e = Z.ergebnisse[a];
      k.zaehler.innerHTML = `<b>${zahl(Math.min(Z.k, e.besucht))}</b> besucht`;
      let status: string;
      if (Z.k === 0) status = "bereit";
      else if (!fertig(a)) status = "sucht …";
      else if (!e.gefunden) status = "kein Weg gefunden";
      else if (Z.laufzeit === null) status = `Ziel gefunden: ${zahl(e.felder)} Felder, ${zahl(e.kosten)} Ausdauer`;
      else if (angekommen(a)) status = `angekommen: <b>Platz ${platz(a)}</b>, ${zahl(e.kosten)} Ausdauer`;
      else status = `läuft … ${zahl(Math.floor(Z.laufzeit))} von ${zahl(e.kosten)} Ausdauer`;
      k.status.innerHTML = status;
    }
    this.aktualisiereErgebnis();
  }

  private aktualisiereErgebnis(): void {
    const E = Z.ergebnisse;
    const alle = alleFertig();
    const gefunden = ALGOS.filter((a) => E[a].gefunden);
    const best = (f: (a: Algo) => number, menge: readonly Algo[]) => (alle && menge.length > 0 ? Math.min(...menge.map(f)) : null);
    const bBesucht = best((a) => E[a].besucht, ALGOS);
    const bFelder = best((a) => E[a].felder, gefunden);
    const bKosten = best((a) => E[a].kosten, gefunden);
    const stern = (wert: number, bester: number | null) => (bester !== null && wert === bester ? STERN : "");
    this.tabelle.innerHTML = ALGOS.map((a) => {
      const e = E[a];
      const fa = fertig(a);
      const besucht = Math.min(Z.k, e.besucht);
      const zelle = (wert: number, bester: number | null) => (fa && e.gefunden ? `${zahl(wert)}${stern(wert, bester)}` : fa ? "kein Weg" : "–");
      const p = angekommen(a) ? `Platz ${platz(a)}${platz(a) === 1 ? STERN : ""}` : "–";
      return `<tr>
        <th scope="row"><span class="punkt" style="background:${ALGO_INFO[a].farbe}" aria-hidden="true"></span>${ALGO_INFO[a].name}</th>
        <td>${zahl(besucht)}${fa ? stern(e.besucht, bBesucht) : ""}</td>
        <td>${zelle(e.felder, bFelder)}</td>
        <td>${zelle(e.kosten, bKosten)}</td>
        <td>${p}</td></tr>`;
    }).join("");
    this.fazit.textContent = alle ? fazitText() : "Drücke „Abspielen“. Alle vier Verfahren suchen gleichzeitig; pro Schritt besucht jedes genau ein weiteres Feld.";
  }
}

/** Fazit in ganzen Sätzen, aus den Messwerten gebildet (FA-14). */
function fazitText(): string {
  const { bfs, dfs, dijkstra: dij, astar } = Z.ergebnisse;
  if (!bfs.gefunden) return `Zwischen Start und Ziel gibt es keinen Weg. Jedes Verfahren hat alle erreichbaren Felder abgesucht, bevor es aufgegeben hat.`;
  const s: string[] = [];
  s.push(`BFS findet den Weg mit den wenigsten Feldern (${zahl(bfs.felder)}).`);
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
  s.push(`DFS findet irgendeinen Weg: ${zahl(dfs.felder)} Felder und ${zahl(dfs.kosten)} Ausdauer, nach ${zahl(dfs.besucht)} besuchten Feldern.`);
  const wenigste = Math.min(...ALGOS.map((a) => Z.ergebnisse[a].besucht));
  const namen = ALGOS.filter((a) => Z.ergebnisse[a].besucht === wenigste).map((a) => ALGO_INFO[a].name);
  s.push(`Am wenigsten gesucht ${namen.length > 1 ? "haben" : "hat"} ${namen.join(" und ")}.`);
  return s.join(" ");
}
