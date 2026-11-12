// Ansicht „Alle vergleichen“ (FA-13, FA-14, FA-21): vier Karten im 2 × 2-Raster, ein Schritt = jedes
// Verfahren besucht ein weiteres Feld. Darunter beste Wahl, Fazit und Ergebnistabelle (Regeln in bewertung.ts).
import { ALGOS } from "../algorithms";
import { symbol, zeichneLeinwand } from "../render/karte";
import type { Algo } from "../types";
import { WELTEN } from "../world/worlds";
import { angekommen, besteWahl, fazitText, platz, tabellenZeilen } from "./bewertung";
import { ALGO_INFO } from "../info/algo-info";
import { kartenBeschreibung } from "./erklaerung";
import { hoverAuf, hoverOk, verbindeKarte } from "./karten-interaktion";
import { Wiedergabe } from "./wiedergabe";
import { Z, geheVergleich, vergleichMax } from "./zustand";

const fertig = (a: Algo): boolean => Z.k >= Z.ergebnisse[a].besucht;
const alleFertig = (): boolean => ALGOS.every(fertig);
const zahl = (x: number): string => x.toLocaleString("de-DE");

export class Vergleich {
  readonly element: HTMLElement;
  readonly wiedergabe: Wiedergabe;
  private readonly karten = new Map<
    Algo,
    { canvas: HTMLCanvasElement; zaehler: HTMLElement; status: HTMLElement; struktur: HTMLElement; gewicht: HTMLElement }
  >();
  private readonly wahl: HTMLParagraphElement;
  private readonly fazit: HTMLParagraphElement;
  private readonly tabelle: HTMLTableSectionElement;

  constructor(geaendert: () => void) {
    const el = document.createElement("section");
    el.className = "ansicht vergleich";
    el.setAttribute("aria-label", "Alle vergleichen");

    // Symbole wie auf der Karte gezeichnet, damit die Farben übereinstimmen.
    const legende = document.createElement("div");
    const eintrag = (symbole: HTMLCanvasElement[], text: string) => {
      const span = document.createElement("span");
      span.append(...symbole, text);
      return span;
    };
    legende.append(
      eintrag(
        ALGOS.map((a) => symbol("besucht", ALGO_INFO[a].farbe)),
        "besucht",
      ),
      eintrag([symbol("wartet", "#fff")], "wartet"),
      eintrag([symbol("besuchtWartet", ALGO_INFO.dfs.farbe)], "auf dem Stapel (DFS)"),
      eintrag([symbol("weg", "#fff")], "Weg"),
      eintrag([symbol("kante", "#1e1e1e")], "Vorgänger"),
    );
    // Genaue Bedeutung für Neugierige im Tooltip, damit die Legende kurz bleibt.
    legende.title =
      "besucht: wie der Zähler „besucht“ (DFS zählt beim Auflegen, die anderen beim Expandieren) · wartet: in Warteschlange oder Prioritätswarteschlange · Vorgänger: Entdeckungskante in der Farbe des Verfahrens";
    this.wiedergabe = new Wiedergabe(
      { position: () => Z.k, laenge: vergleichMax, gehe: geheVergleich },
      {
        zumEnde: false,
        einheit: "Felder",
        einheitEinzahl: "Feld",
        einheitErklaerung: "Ein Schritt heißt: Jedes Verfahren besucht ein weiteres Feld.",
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
          <div class="name"><span class="farbfeld"></span><h2>${info.name}</h2><span class="kurz">${info.kurz}</span>
            <span class="gewicht-marke" title="Bei dieser Karte kosten Felder verschieden viel; ${info.name} beachtet das nicht.">ignoriert Gewichte</span></div>
          <div class="zaehler" aria-live="off"></div>
          <div class="status"></div>
          <div class="struktur-zeile"></div>
        </header>`;
      // Farbfeld im Kopf: dasselbe Symbol wie ein besuchtes Feld auf der Karte, damit die Farben sicher übereinstimmen.
      karte.querySelector(".farbfeld")?.replaceWith(symbol("besucht", info.farbe));
      const canvas = document.createElement("canvas");
      canvas.setAttribute("role", "application");
      canvas.setAttribute("aria-roledescription", "Karte");
      karte.append(canvas);
      raster.append(karte);
      verbindeKarte(canvas, () => Z.vergleich[a], geaendert);
      this.karten.set(a, {
        canvas,
        zaehler: karte.querySelector(".zaehler") as HTMLElement,
        status: karte.querySelector(".status") as HTMLElement,
        struktur: karte.querySelector(".struktur-zeile") as HTMLElement,
        gewicht: karte.querySelector(".gewicht-marke") as HTMLElement,
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
          <thead><tr><th scope="col">Verfahren</th><th scope="col">Besuchte Felder</th><th scope="col" title="ausgeführte Zeilen des Pseudocodes (Modellannahme, siehe unten)">Rechenschritte</th><th scope="col" title="Anzahl der Kanten (Schritte) des Weges">Weglänge (Kanten)</th><th scope="col">Ausdauer des Weges</th><th scope="col">Platz beim Loslaufen</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
      <p class="hinweis modell"><b>Modellannahme Rechenschritte:</b> gezählt werden ausgeführte Zeilen des Pseudocodes. Jede Zeile zählt 1, auch eine Heap-Operation (eigentlich O(log n)) und das Berechnen der Schätzung h(v) bei A*. Das Maß hängt also davon ab, wie der Pseudocode geschrieben ist; es ist kein Zeitmaß.</p>`;
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
        h: Z.h,
      });
    }
  }

  aktualisiere(): void {
    this.wiedergabe.aktualisiere();
    for (const a of ALGOS) {
      const k = this.karten.get(a);
      if (!k) continue;
      const e = Z.ergebnisse[a];
      const r = Z.vergleich[a];
      k.canvas.setAttribute("aria-label", kartenBeschreibung(r));
      k.zaehler.innerHTML = `<b>${zahl(Math.min(Z.k, e.besucht))}</b> besucht`;
      k.gewicht.hidden = ALGO_INFO[a].gewichte || !Z.gewichtet;
      // Inhalt der Datenstruktur kurz: Größe und das Feld, das als Nächstes drankommt.
      const inhalt = r.inhalt().filter((x) => !r.veraltet(x));
      const b = e.breite;
      const fertigA = r.fertig;
      const naechster =
        inhalt[0] && !fertigA
          ? ` · als Nächstes (${inhalt[0].v % b}|${Math.floor(inhalt[0].v / b)})`
          : fertigA && inhalt.length
            ? " übrig (Suche beendet)"
            : "";
      const wert =
        inhalt[0] && !fertigA && a === "dijkstra"
          ? `, d = ${zahl(inhalt[0].prio)}`
          : inhalt[0] && !fertigA && a === "astar"
            ? `, f = ${zahl(inhalt[0].prio)}`
            : "";
      k.struktur.textContent = `${ALGO_INFO[a].liste}: ${inhalt.length}${naechster}${wert}`;
      let status: string;
      if (Z.k === 0) status = "bereit";
      else if (!fertig(a)) status = "sucht …";
      else if (!e.gefunden) status = "kein Weg gefunden";
      else if (Z.laufzeit === null)
        status =
          a === "bfs"
            ? `Ziel gefunden: kürzester Weg nach Kantenzahl, ${zahl(e.felder)} Kanten, ${zahl(e.kosten)} Ausdauer`
            : `Ziel gefunden: ${zahl(e.felder)} Kanten, ${zahl(e.kosten)} Ausdauer`;
      else if (angekommen(Z.ergebnisse, a, Z.laufzeit))
        status = `angekommen: <b>Platz ${platz(Z.ergebnisse, a)}</b>, ${zahl(e.kosten)} Ausdauer`;
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
    this.wahl.innerHTML = wahl
      ? `<b>Beste Wahl in dieser Welt:</b> ${wahl.satz}<br><small>Kriterium dieser Welt: ${wahl.kriterium}.</small>`
      : "";
    this.fazit.textContent = alle
      ? fazitText(welt, Z.ergebnisse)
      : "Drücke „Abspielen“. Alle vier Verfahren suchen gleichzeitig; pro Schritt besucht jedes genau ein weiteres Feld.";
  }
}
