// Ansicht „Alle vergleichen“ (FA-13, FA-14, FA-21): vier Karten im 2 × 2-Raster, ein Schritt = jedes
// Verfahren besucht ein weiteres Feld. Darunter beste Wahl, Fazit und Ergebnistabelle (Regeln in bewertung.ts).
import { ALGOS } from "../algorithms";
import { zeichneLeinwand } from "../render/karte";
import type { Algo } from "../types";
import { WELTEN } from "../world/worlds";
import { angekommen, besteWahl, fazitText, platz, tabellenZeilen } from "./bewertung";
import { ALGO_INFO } from "./erklaerung";
import { hoverAuf, hoverOk, verbindeKarte } from "./karten-interaktion";
import { Wiedergabe } from "./wiedergabe";
import { Z, geheVergleich, vergleichMax } from "./zustand";

const fertig = (a: Algo): boolean => Z.k >= Z.ergebnisse[a].besucht;
const alleFertig = (): boolean => ALGOS.every(fertig);
const zahl = (x: number): string => x.toLocaleString("de-DE");


export class Vergleich {
  readonly element: HTMLElement;
  readonly wiedergabe: Wiedergabe;
  private readonly karten = new Map<Algo, { canvas: HTMLCanvasElement; zaehler: HTMLElement; status: HTMLElement }>();
  private readonly wahl: HTMLParagraphElement;
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
      <p class="beste-wahl" aria-live="polite"></p>
      <p class="fazit" aria-live="polite"></p>
      <div class="tabelle-rahmen">
        <table>
          <thead><tr><th scope="col">Verfahren</th><th scope="col">Besuchte Felder</th><th scope="col" title="ausgeführte Zeilen des Pseudocodes">Rechenschritte</th><th scope="col">Weglänge (Felder)</th><th scope="col">Ausdauer des Weges</th><th scope="col">Platz beim Loslaufen</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>`;
    this.wahl = ergebnis.querySelector(".beste-wahl") as HTMLParagraphElement;
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
      else if (angekommen(Z.ergebnisse, a, Z.laufzeit)) status = `angekommen: <b>Platz ${platz(Z.ergebnisse, a)}</b>, ${zahl(e.kosten)} Ausdauer`;
      else status = `läuft … ${zahl(Math.floor(Z.laufzeit))} von ${zahl(e.kosten)} Ausdauer`;
      k.status.innerHTML = status;
    }
    this.aktualisiereErgebnis();
  }

  private aktualisiereErgebnis(): void {
    const welt = WELTEN[Z.weltIndex];
    const alle = alleFertig();
    const position = Object.fromEntries(ALGOS.map((a) => [a, Z.vergleich[a].position])) as Record<Algo, number>;
    this.tabelle.innerHTML = tabellenZeilen(welt, Z.ergebnisse, { k: Z.k, position, laufzeit: Z.laufzeit });
    const wahl = alle ? besteWahl(welt, Z.ergebnisse) : null;
    this.wahl.hidden = wahl === null;
    this.wahl.innerHTML = wahl ? `<b>Beste Wahl in dieser Welt:</b> ${wahl.satz}` : "";
    this.fazit.textContent = alle
      ? fazitText(welt, Z.ergebnisse)
      : "Drücke „Abspielen“. Alle vier Verfahren suchen gleichzeitig; pro Schritt besucht jedes genau ein weiteres Feld.";
  }
}
