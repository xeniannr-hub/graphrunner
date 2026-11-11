// Einzelansicht (FA-01, FA-02, FA-06, FA-11): ein Verfahren Zeile für Zeile. Links die Karte, rechts
// Steckbrief, Erklärsatz mit „Zeile n“, Pseudocode mit hervorgehobener Zeile und Besuchsreihenfolge.
import { ALGOS, PSEUDOCODE } from "../algorithms";
import { zeichneLeinwand, type Zahlen } from "../render/karte";
import type { Algo } from "../types";
import { ALGO_INFO, erklaerSatz, koord } from "./erklaerung";
import { hoverAuf, hoverOk, verbindeKarte } from "./karten-interaktion";
import { Wiedergabe } from "./wiedergabe";
import { Z } from "./zustand";

export class Einzel {
  readonly element: HTMLElement;
  readonly wiedergabe: Wiedergabe;
  private readonly tabs = new Map<Algo, HTMLButtonElement>();
  private readonly canvas: HTMLCanvasElement;
  private readonly steckbrief: HTMLElement;
  private readonly satz: HTMLElement;
  private readonly zeileNr: HTMLElement;
  private readonly code: HTMLOListElement;
  private readonly liste: HTMLOListElement;
  private readonly listeLeer: HTMLElement;
  private readonly legendeFarbe: HTMLElement;
  private gezeigtAlgo: Algo | null = null;
  private gezeigtListe = 0;
  private gezeigtVersion = -1;

  constructor(geaendert: () => void) {
    const el = document.createElement("section");
    el.className = "ansicht einzel";
    el.setAttribute("aria-label", "Einzelansicht");

    const leiste = document.createElement("div");
    leiste.className = "einzel-kopf";
    const tabliste = document.createElement("div");
    tabliste.className = "tabs";
    tabliste.setAttribute("role", "tablist");
    tabliste.setAttribute("aria-label", "Verfahren");
    for (const a of ALGOS) {
      const t = document.createElement("button");
      t.type = "button";
      t.className = "tab";
      t.setAttribute("role", "tab");
      t.style.setProperty("--farbe", ALGO_INFO[a].farbe);
      t.innerHTML = `<span class="punkt" aria-hidden="true"></span>${ALGO_INFO[a].name}`;
      t.onclick = () => {
        Z.einzelAlgo = a;
        Z.spielt = false;
        geaendert();
      };
      t.onkeydown = (ev) => {
        // Pfeiltasten wechseln zwischen den Tabs (übliches Tab-Muster).
        if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
        ev.preventDefault();
        ev.stopPropagation();
        const i = (ALGOS.indexOf(a) + (ev.key === "ArrowRight" ? 1 : ALGOS.length - 1)) % ALGOS.length;
        Z.einzelAlgo = ALGOS[i];
        geaendert();
        this.tabs.get(ALGOS[i])?.focus();
      };
      this.tabs.set(a, t);
      tabliste.append(t);
    }
    const zahlen = document.createElement("label");
    zahlen.className = "auswahl";
    zahlen.innerHTML = `Zahlen auf der Karte
      <select>
        <option value="reihenfolge">Besuchsnummer</option>
        <option value="kosten">bisherige Kosten d</option>
        <option value="keine">keine</option>
      </select>`;
    const select = zahlen.querySelector("select") as HTMLSelectElement;
    select.value = Z.zahlen;
    select.onchange = () => {
      Z.zahlen = select.value as Zahlen;
      geaendert();
    };
    leiste.append(tabliste, zahlen);

    const legende = document.createElement("div");
    legende.innerHTML = `
      <span><i class="besucht"></i>besucht</span>
      <span><i class="wartet"></i>entdeckt, wartet</span>
      <span><i class="kante"></i>Entdeckungskante</span>
      <span><i class="weg"></i>gefundener Weg</span>
      <span><i class="rahmen weiss"></i>wird bearbeitet</span>
      <span><i class="rahmen gelb"></i>wird geprüft</span>
      <span><i class="rahmen rot"></i>Prüfung negativ</span>`;
    this.legendeFarbe = legende.querySelector(".besucht") as HTMLElement;
    this.wiedergabe = new Wiedergabe(
      {
        position: () => Z.einzel[Z.einzelAlgo].position,
        laenge: () => Z.einzel[Z.einzelAlgo].laenge,
        gehe: (k) => Z.einzel[Z.einzelAlgo].gehe(k),
      },
      { zumEnde: true, legende, geaendert },
    );

    const inhalt = document.createElement("div");
    inhalt.className = "einzel-inhalt";
    inhalt.setAttribute("role", "tabpanel");
    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute("role", "img");
    const kartenRahmen = document.createElement("div");
    kartenRahmen.className = "karte-einzel";
    kartenRahmen.append(this.canvas);
    verbindeKarte(this.canvas, () => Z.einzel[Z.einzelAlgo], geaendert);

    const seite = document.createElement("div");
    seite.className = "einzel-seite";
    seite.innerHTML = `
      <dl class="steckbrief"></dl>
      <div class="erklaerung"><span class="zeile-nr"></span><p class="satz" aria-live="polite"></p></div>
      <div class="code-box"><h3>Pseudocode</h3><ol class="code"></ol></div>
      <div class="liste-box"><h3>Besuchsreihenfolge</h3><p class="liste-leer">Noch kein Feld besucht.</p><ol class="besuchsliste"></ol></div>`;
    this.steckbrief = seite.querySelector(".steckbrief") as HTMLElement;
    this.satz = seite.querySelector(".satz") as HTMLElement;
    this.zeileNr = seite.querySelector(".zeile-nr") as HTMLElement;
    this.code = seite.querySelector(".code") as HTMLOListElement;
    this.liste = seite.querySelector(".besuchsliste") as HTMLOListElement;
    this.listeLeer = seite.querySelector(".liste-leer") as HTMLElement;
    inhalt.append(kartenRahmen, seite);

    el.append(leiste, this.wiedergabe.element, inhalt);
    this.element = el;
  }

  zeichne(zeit: number): void {
    const hover = hoverAuf(this.canvas);
    zeichneLeinwand(this.canvas, {
      karte: Z.karte,
      version: Z.version,
      start: Z.start,
      ziel: Z.ziel,
      replay: Z.einzel[Z.einzelAlgo],
      zahlen: Z.zahlen,
      details: true,
      laufzeit: null,
      hover,
      hoverOk: hoverOk(hover),
      zeit,
    });
  }

  aktualisiere(): void {
    const a = Z.einzelAlgo;
    const info = ALGO_INFO[a];
    const r = Z.einzel[a];
    this.wiedergabe.aktualisiere();
    for (const [b, t] of this.tabs) t.setAttribute("aria-selected", String(a === b));
    this.canvas.setAttribute("aria-label", `Karte ${info.name}`);
    this.legendeFarbe.style.background = info.farbe;

    if (this.gezeigtAlgo !== a) {
      this.steckbrief.innerHTML = `
        <div><dt>Verfahren</dt><dd>${info.verfahren}</dd></div>
        <div><dt>Wählt als Nächstes</dt><dd>${info.waehlt}</dd></div>
        <div><dt>Findet</dt><dd>${info.findet}</dd></div>`;
      this.code.replaceChildren(
        ...PSEUDOCODE[a].map((z) => {
          const li = document.createElement("li");
          li.textContent = z.text;
          return li;
        }),
      );
    }
    const zeile = r.aktuell?.zeile ?? 0;
    this.zeileNr.textContent = zeile > 0 ? `Zeile ${zeile}` : "Start";
    this.satz.textContent = erklaerSatz(r);
    [...this.code.children].forEach((li, i) => {
      const aktiv = i + 1 === zeile;
      li.classList.toggle("aktiv", aktiv);
      if (aktiv) li.setAttribute("aria-current", "step");
      else li.removeAttribute("aria-current");
    });

    // Besuchsreihenfolge nur so weit ändern, wie sie sich geändert hat.
    if (this.gezeigtAlgo !== a || this.gezeigtVersion !== Z.version) {
      this.liste.replaceChildren();
      this.gezeigtListe = 0;
    }
    const b = r.ergebnis.breite;
    while (this.gezeigtListe > r.reihenfolge.length) {
      this.liste.lastElementChild?.remove();
      this.gezeigtListe--;
    }
    while (this.gezeigtListe < r.reihenfolge.length) {
      const id = r.reihenfolge[this.gezeigtListe];
      const li = document.createElement("li");
      li.textContent = koord({ x: id % b, y: Math.floor(id / b) });
      this.liste.append(li);
      this.gezeigtListe++;
    }
    this.listeLeer.hidden = this.gezeigtListe > 0;
    // Nur die Liste selbst scrollen, nicht die Seite.
    this.liste.scrollTop = this.liste.scrollHeight;
    this.gezeigtAlgo = a;
    this.gezeigtVersion = Z.version;
  }
}
