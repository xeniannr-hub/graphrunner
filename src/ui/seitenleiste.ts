// Seitenleiste (FA-22, FA-03): Weltliste mit Algorithmus-Kürzel, „X ist am besten, wenn …“ mit Begründung,
// darunter „Bauen“ in der Eigenen Welt, sonst „Ausdauer pro Feld“.
import { sprites, textur } from "../render/textures";
import { TERRAIN } from "../world/terrain";
import { WELTEN } from "../world/worlds";
import { ALGO_INFO } from "./erklaerung";
import { Z, istEigeneWelt, ladeWelt, type Werkzeug } from "./zustand";

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

const kosten = (k: number): string => (k === Infinity ? "–" : String(k));

export class Seitenleiste {
  readonly element: HTMLElement;
  private readonly welten: HTMLButtonElement[] = [];
  private readonly wannEl: HTMLElement;
  private readonly warumEl: HTMLElement;
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
      const kuerzel = w.algo ? `<span class="kuerzel" style="--farbe:${ALGO_INFO[w.algo].farbe}">${ALGO_INFO[w.algo].name}</span>` : `<span class="kuerzel bauen-kuerzel">bauen</span>`;
      b.innerHTML = `<span class="welt-titel">${w.titel}</span>${kuerzel}`;
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
    begruendung.append(this.wannEl, this.warumEl);

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
        p.title = preis === "–" ? "nicht begehbar" : `Ausdauer ${preis}`;
        b.append(p);
      }
      b.onclick = () => {
        Z.werkzeug = w;
        geaendert();
      };
      this.werkzeuge.set(w, b);
      werkzeugListe.append(b);
    }
    this.bauen.append(werkzeugListe);

    // Ausdauer pro Feld.
    this.ausdauer = document.createElement("section");
    this.ausdauer.className = "panel";
    this.ausdauer.innerHTML = `<h2>Ausdauer pro Feld</h2>`;
    const tabelle = document.createElement("ul");
    tabelle.className = "kosten";
    for (const t of TERRAIN) {
      const li = document.createElement("li");
      li.append(symbol(textur(t.key, 1)));
      const n = document.createElement("span");
      n.textContent = t.name;
      const p = document.createElement("b");
      p.textContent = kosten(t.kosten);
      li.append(n, p);
      tabelle.append(li);
    }
    const fuss = document.createElement("p");
    fuss.className = "hinweis";
    fuss.textContent = "„–“ heißt: nicht begehbar. Ein Schritt kostet so viel wie das Feld, das man betritt.";
    this.ausdauer.append(tabelle, fuss);

    el.append(titel, liste, begruendung, this.bauen, this.ausdauer);
    this.element = el;
  }

  aktualisiere(): void {
    const w = WELTEN[Z.weltIndex];
    this.welten.forEach((b, i) => b.setAttribute("aria-pressed", String(i === Z.weltIndex)));
    if (w.algo) {
      this.wannEl.textContent = `${ALGO_INFO[w.algo].name} ist am besten, wenn ${w.wann}.`;
    } else {
      this.wannEl.textContent = "Baue deine eigene Welt.";
    }
    this.warumEl.textContent = w.warum;
    const eigen = istEigeneWelt();
    this.bauen.hidden = !eigen;
    this.ausdauer.hidden = eigen;
    for (const [k, b] of this.werkzeuge) b.setAttribute("aria-pressed", String(k === Z.werkzeug));
  }
}
