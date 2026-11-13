// Seitenleiste (FA-22, FA-03): Weltliste mit Algorithmus-Kürzel, „X ist am besten, wenn …“ mit Begründung,
// darunter „Bauen“ in der Eigenen Welt, sonst „Ausdauer pro Feld“.
import { sprites, textur } from "../render/textures";
import type { TerrainKey } from "../types";
import { TERRAIN } from "../world/terrain";
import { WELTEN, kurzfassung } from "../world/worlds";
import { ALGO_INFO } from "../info/algo-info";
import { Z, istEigeneWelt, ladeWelt, leereKarte, type Werkzeug } from "./zustand";

function symbol(bild: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 16;
  c.height = 16;
  c.className = "symbol";
  c.setAttribute("aria-hidden", "true");
  const g = c.getContext("2d") as CanvasRenderingContext2D;
  g.imageSmoothingEnabled = false;
  const h = (16 * bild.height) / bild.width;
  g.drawImage(bild, 0, (16 - h) / 2, 16, h);
  return c;
}

/**
 * Symbol je Welt, aus den Geländetexturen zusammengesetzt, damit es zum Aussehen der Welt passt:
 * Grundgelände plus Rechtecke (x, y, b, h in 16 × 16 Pixeln) aus einem zweiten Gelände.
 */
interface WeltSymbol {
  readonly grund: TerrainKey;
  readonly muster?: TerrainKey;
  readonly teile?: readonly [number, number, number, number][];
  /** Dunkler Rand um die Teile, damit sie sich vom Grund abheben (z. B. ein in den Fels gehauener Gang). */
  readonly rand?: string;
}

const WELT_SYMBOL: Readonly<Record<string, WeltSymbol>> = {
  // Wiese mit einem Mauerrest in L-Form.
  ruinenhof: {
    grund: "gras",
    muster: "fels",
    teile: [
      [2, 3, 3, 10],
      [2, 10, 10, 3],
    ],
  },
  // Fels mit einem gewundenen Gang aus Weg: ein Stück Labyrinth.
  stollen: {
    grund: "fels",
    muster: "weg",
    teile: [
      [0, 3, 10, 3],
      [7, 3, 3, 10],
      [7, 10, 9, 3],
    ],
    rand: "#1f1d1a",
  },
  // Sumpf mit einem Wasserlauf.
  flussmoor: { grund: "sumpf", muster: "wasser", teile: [[10, 0, 3, 16]] },
  // Wiese mit einer Straße.
  handelsstrasse: { grund: "gras", muster: "weg", teile: [[0, 6, 16, 4]] },
  eigene: { grund: "gras" },
};

function weltSymbol(id: string): HTMLCanvasElement {
  const m: WeltSymbol = WELT_SYMBOL[id] ?? { grund: "gras" };
  const c = symbol(textur(m.grund, 1));
  const g = c.getContext("2d") as CanvasRenderingContext2D;
  if (m.muster && m.teile) {
    const t = textur(m.muster, 1);
    const f = t.width / 16;
    if (m.rand) {
      g.fillStyle = m.rand;
      for (const [x, y, b, h] of m.teile) g.fillRect(x - 1, y - 1, b + 2, h + 2);
    }
    for (const [x, y, b, h] of m.teile) g.drawImage(t, x * f, y * f, b * f, h * f, x, y, b, h);
  }
  return c;
}

/** Kosten fürs Betreten; ∞ wie im Modell: Wasser und Fels kosten unendlich viel und sind damit Hindernisse. */
const kosten = (k: number): string => (k === Infinity ? "∞" : String(k));

export class Seitenleiste {
  /** Weltliste und (in der Eigenen Welt) Bauen: steht auf dem Handy über der Karte. */
  readonly element: HTMLElement;
  /** Begründung und Ausdauer pro Feld: steht auf dem Handy unter der Karte, damit die Steuerung früh kommt. */
  readonly info: HTMLElement;
  private readonly welten: HTMLButtonElement[] = [];
  private readonly wannEl: HTMLElement;
  private readonly warumEl: HTMLElement;
  private readonly lernEl: HTMLElement;
  private gezeigteWelt = -1;
  private readonly bauen: HTMLElement;
  private readonly ausdauer: HTMLElement;
  private readonly werkzeuge = new Map<Werkzeug, HTMLButtonElement>();

  constructor(geaendert: () => void) {
    const el = document.createElement("aside");
    el.className = "seitenleiste";
    el.setAttribute("aria-label", "Welten");

    const titel = document.createElement("h2");
    titel.textContent = "Welten";
    const liste = document.createElement("div");
    liste.className = "weltliste";
    WELTEN.forEach((w, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "welt";
      const kuerzel = w.algo
        ? `<span class="kuerzel" style="--farbe:${ALGO_INFO[w.algo].farbe}">${ALGO_INFO[w.algo].name}</span>`
        : `<span class="kuerzel bauen-kuerzel">bauen</span>`;
      b.innerHTML = `<span class="welt-titel">${w.titel}</span>${kuerzel}`;
      b.prepend(weltSymbol(w.id));
      b.onclick = () => {
        ladeWelt(i);
        geaendert();
      };
      this.welten.push(b);
      liste.append(b);
    });

    const begruendung = document.createElement("div");
    begruendung.className = "begruendung";
    this.wannEl = document.createElement("p");
    this.wannEl.className = "wann";
    this.warumEl = document.createElement("p");
    // Aufklapper „Mehr“: Rest der Begründung und Lernpunkt.
    this.lernEl = document.createElement("details");
    this.lernEl.className = "lernpunkt";
    begruendung.append(this.wannEl, this.warumEl, this.lernEl);

    // Bauen: Start, Ziel und die sieben Geländearten.
    this.bauen = document.createElement("section");
    this.bauen.className = "panel";
    this.bauen.innerHTML = `<h2>Bauen</h2><p class="hinweis">Werkzeug wählen, dann auf eine Karte klicken oder darüber ziehen.</p>`;
    const werkzeugListe = document.createElement("div");
    werkzeugListe.className = "werkzeuge";
    werkzeugListe.setAttribute("role", "group");
    werkzeugListe.setAttribute("aria-label", "Bauwerkzeug");
    const sp = sprites();
    const eintraege: [Werkzeug, string, HTMLCanvasElement, string][] = [
      ["start", "Start", sp.fahne, ""],
      ["ziel", "Ziel", sp.truhe, ""],
      ...TERRAIN.map((t): [Werkzeug, string, HTMLCanvasElement, string] => [t.key, t.name, textur(t.key, 1), kosten(t.kosten)]),
    ];
    for (const [w, name, bild, preis] of eintraege) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "werkzeug";
      b.append(symbol(bild));
      const n = document.createElement("span");
      n.textContent = name;
      b.append(n);
      if (preis) {
        const p = document.createElement("b");
        p.textContent = preis;
        p.title = preis === "∞" ? "unendlich: nicht begehbar" : `Ausdauer ${preis}`;
        b.append(p);
      }
      b.onclick = () => {
        Z.werkzeug = w;
        geaendert();
      };
      this.werkzeuge.set(w, b);
      werkzeugListe.append(b);
    }
    const leeren = document.createElement("button");
    leeren.type = "button";
    leeren.className = "knopf leeren";
    leeren.textContent = "Karte leeren";
    leeren.title = "Alle Felder werden Wiese; Start und Ziel bleiben";
    leeren.onclick = () => {
      leereKarte();
      geaendert();
    };
    this.bauen.append(werkzeugListe, leeren);

    // Ausdauer pro Feld.
    this.ausdauer = document.createElement("section");
    this.ausdauer.className = "panel";
    this.ausdauer.innerHTML = `<h2>Ausdauer pro Feld</h2>`;
    // Kompakte Zeile mit Chips: Symbol und Kosten, der Name steht im Tooltip und für Screenreader im Label.
    const tabelle = document.createElement("ul");
    tabelle.className = "kosten-chips";
    for (const t of TERRAIN) {
      const li = document.createElement("li");
      const text = `${t.name}: ${t.kosten === Infinity ? "∞, nicht begehbar" : t.kosten}`;
      li.title = text;
      li.setAttribute("aria-label", text);
      li.append(symbol(textur(t.key, 1)));
      const p = document.createElement("b");
      p.textContent = kosten(t.kosten);
      p.setAttribute("aria-hidden", "true");
      li.append(p);
      tabelle.append(li);
    }
    const fuss = document.createElement("p");
    fuss.className = "hinweis";
    fuss.textContent = "Kosten = Feld, das man betritt · ∞ = nicht begehbar";
    this.ausdauer.append(tabelle, fuss);

    el.append(titel, liste, this.bauen);
    this.element = el;
    const info = document.createElement("aside");
    info.className = "seiten-info";
    info.setAttribute("aria-label", "Begründung und Ausdauer");
    info.append(begruendung, this.ausdauer);
    this.info = info;
  }

  aktualisiere(): void {
    const w = WELTEN[Z.weltIndex];
    this.welten.forEach((b, i) => b.setAttribute("aria-pressed", String(i === Z.weltIndex)));
    if (w.algo) {
      this.wannEl.textContent = `${ALGO_INFO[w.algo].name} ist am besten, wenn ${w.wann}.`;
    } else {
      this.wannEl.textContent = "Baue deine eigene Welt.";
    }
    // Höchstens 2 Sätze (≤ 35 Wörter) sichtbar; der Rest und der Lernpunkt stehen unter „Mehr“.
    const { kurz, rest } = kurzfassung(w.warum);
    this.warumEl.textContent = kurz;
    this.lernEl.hidden = rest === "" && w.lernpunkt === "";
    // Nur beim Weltwechsel neu schreiben, sonst klappt „Mehr“ bei jeder Aktualisierung wieder zu.
    if (this.gezeigteWelt !== Z.weltIndex) {
      this.gezeigteWelt = Z.weltIndex;
      this.lernEl.innerHTML = "<summary>Mehr</summary>";
      if (rest) {
        const p = document.createElement("p");
        p.textContent = rest;
        this.lernEl.append(p);
      }
      if (w.lernpunkt) {
        const p = document.createElement("p");
        p.innerHTML = "<b>Lernpunkt:</b> ";
        p.append(w.lernpunkt);
        this.lernEl.append(p);
      }
    }
    const eigen = istEigeneWelt();
    this.bauen.hidden = !eigen;
    this.ausdauer.hidden = eigen;
    for (const [k, b] of this.werkzeuge) b.setAttribute("aria-pressed", String(k === Z.werkzeug));
  }
}
