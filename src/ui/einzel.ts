// Einzelansicht als Debugger für Algorithmen (FA-01, FA-02, FA-06, FA-09, FA-11, FA-12):
// ein Verfahren Zeile für Zeile. Links die Karte, darunter Datenstruktur und „Woran erkenne ich …?“;
// rechts Steckbrief (mit Heuristik bei A*), Erklärsatz mit „Zeile n“, Pseudocode, Ereignisprotokoll, Besuchsreihenfolge.
import { ALGOS, PSEUDOCODE } from "../algorithms";
import { symbol, zeichneLeinwand, type SymbolArt, type Zahlen } from "../render/karte";
import type { Eintrag, Replay } from "../replay/replay";
import type { Algo, FeldId } from "../types";
import { ALGO_INFO } from "../info/algo-info";
import { erklaerSatz, kartenBeschreibung, koord, merkmal, protokoll, type ProtokollEintrag } from "./erklaerung";
import { hoverAuf, hoverOk, verbindeKarte } from "./karten-interaktion";
import { TERRAIN_NACH_KEY } from "../world/terrain";
import { Wiedergabe } from "./wiedergabe";
import { Z } from "./zustand";

/** So viele Einträge der Datenstruktur werden höchstens gezeigt; der Rest wird gezählt. */
const MAX_EINTRAEGE = 48;

const zahl = (x: number): string => (x === Infinity ? "∞" : x.toLocaleString("de-DE"));

const ZAHLEN_OPTIONEN: Readonly<Record<Algo, readonly [Zahlen, string][]>> = {
  bfs: [
    ["reihenfolge", "Besuchsnummer"],
    ["kosten", "d: Kanten ab Start"],
    ["keine", "keine"],
  ],
  dfs: [
    ["reihenfolge", "Besuchsnummer"],
    ["kosten", "d: Kanten ab Start"],
    ["keine", "keine"],
  ],
  dijkstra: [
    ["reihenfolge", "Besuchsnummer"],
    ["kosten", "d: Kosten ab Start"],
    ["keine", "keine"],
  ],
  astar: [
    ["reihenfolge", "Besuchsnummer"],
    ["kosten", "g: Kosten ab Start"],
    ["h", "h: geschätzte Restkosten"],
    ["f", "f = g + h"],
    ["keine", "keine"],
  ],
};

function element<K extends keyof HTMLElementTagNameMap>(tag: K, klasse: string, html = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = klasse;
  if (html) e.innerHTML = html;
  return e;
}

/** Zustände in der Legende, mit denselben Symbolen wie auf der Karte und den Begriffen des Verfahrens. */
function legendeFuer(a: Algo): HTMLElement[] {
  const f = ALGO_INFO[a].farbe;
  const eintraege: [SymbolArt, string][] =
    a === "dfs"
      ? [
          ["besucht", "fertig (vom Stapel)"],
          ["besuchtWartet", "auf dem Stapel"],
          ["entdeckt", "entdeckt"],
        ]
      : [
          ["besucht", "expandiert"],
          ["wartet", a === "bfs" ? "in der Warteschlange" : "in der Prioritätswarteschlange"],
          ["entdeckt", "entdeckt"],
        ];
  eintraege.push(["weg", "Weg"], ["kante", "Vorgänger"]);
  return eintraege.map(([art, text]) => {
    const span = document.createElement("span");
    span.append(symbol(art, f), text);
    return span;
  });
}

export class Einzel {
  readonly element: HTMLElement;
  readonly wiedergabe: Wiedergabe;
  private readonly tabs = new Map<Algo, HTMLButtonElement>();
  private readonly canvas: HTMLCanvasElement;
  private readonly select: HTMLSelectElement;
  private readonly panel: HTMLElement;
  private readonly hinweis: HTMLElement;
  private readonly steckbrief: HTMLElement;
  private readonly heuristik: HTMLElement;
  private readonly satz: HTMLElement;
  private readonly zeileNr: HTMLElement;
  private readonly code: HTMLOListElement;
  private readonly strukturTitel: HTMLElement;
  private readonly strukturRegel: HTMLElement;
  private readonly strukturInhalt: HTMLElement;
  private readonly merkmalFrage: HTMLElement;
  private readonly merkmalBelege: HTMLUListElement;
  private readonly protokollListe: HTMLOListElement;
  private readonly protokollZahl: HTMLElement;
  private readonly liste: HTMLOListElement;
  private readonly listeLeer: HTMLElement;
  private readonly legendeZustaende: HTMLElement;
  private gezeigtAlgo: Algo | null = null;
  private gezeigtListe = 0;
  private gezeigtVersion = -1;
  private eintraege: ProtokollEintrag[] = [];
  private gezeigtProtokoll = 0;

  constructor(private readonly geaendert: () => void) {
    const el = element("section", "ansicht einzel");
    el.setAttribute("aria-label", "Einzelansicht");

    const leiste = element("div", "einzel-kopf");
    const tabliste = element("div", "tabs");
    tabliste.setAttribute("role", "tablist");
    tabliste.setAttribute("aria-label", "Verfahren");
    for (const a of ALGOS) {
      const t = element("button", "tab", `<span class="punkt" aria-hidden="true"></span>${ALGO_INFO[a].name}`);
      t.type = "button";
      t.setAttribute("role", "tab");
      t.id = `tab-${a}`;
      t.setAttribute("aria-controls", "einzel-panel");
      t.style.setProperty("--farbe", ALGO_INFO[a].farbe);
      // Mausklick und Tastatur wechseln gleich: Die Wiedergabe hält an.
      const waehle = (b: Algo) => {
        Z.einzelAlgo = b;
        Z.spielt = false;
        geaendert();
      };
      t.onclick = () => waehle(a);
      t.onkeydown = (ev) => {
        // Tab-Muster (WAI-ARIA): Pfeiltasten wechseln, Pos1/Ende springen zum ersten/letzten Tab.
        // Roving tabindex: Nur der gewählte Tab ist per Tab-Taste erreichbar (siehe aktualisiere()).
        const n = ALGOS.length;
        const i = ALGOS.indexOf(a);
        const ziel =
          ev.key === "ArrowRight"
            ? (i + 1) % n
            : ev.key === "ArrowLeft"
              ? (i + n - 1) % n
              : ev.key === "Home"
                ? 0
                : ev.key === "End"
                  ? n - 1
                  : -1;
        if (ziel < 0) return;
        ev.preventDefault();
        ev.stopPropagation();
        waehle(ALGOS[ziel]);
        this.tabs.get(ALGOS[ziel])?.focus();
      };
      this.tabs.set(a, t);
      tabliste.append(t);
    }
    const zahlen = element("label", "auswahl", "Zahlen auf der Karte <select></select>");
    this.select = zahlen.querySelector("select") as HTMLSelectElement;
    this.select.onchange = () => {
      Z.zahlen = this.select.value as Zahlen;
      geaendert();
    };
    leiste.append(tabliste, zahlen);

    // Die Zustandssymbole hängen vom Verfahren ab und werden in aktualisiere() gezeichnet.
    const legende = element(
      "div",
      "",
      `<span class="legende-zustaende"></span>
      <span><i class="rahmen weiss"></i>bearbeitet</span>
      <span><i class="rahmen gelb"></i>geprüft</span>
      <span><i class="rahmen rot"></i>Prüfung negativ</span>`,
    );
    this.legendeZustaende = legende.querySelector(".legende-zustaende") as HTMLElement;
    this.wiedergabe = new Wiedergabe(
      {
        position: () => Z.einzel[Z.einzelAlgo].position,
        laenge: () => Z.einzel[Z.einzelAlgo].laenge,
        gehe: (k) => Z.einzel[Z.einzelAlgo].gehe(k),
      },
      {
        zumEnde: true,
        einheit: "Zeilen",
        einheitEinzahl: "Zeile",
        einheitErklaerung: "Ein Schritt ist eine ausgeführte Zeile des Pseudocodes.",
        legende,
        geaendert,
      },
    );

    this.hinweis = element("p", "hinweis-box");
    this.hinweis.setAttribute("role", "note");

    // Links: Karte, Datenstruktur, Merkmal.
    const links = element("div", "einzel-links");
    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute("role", "application");
    this.canvas.setAttribute("aria-roledescription", "Karte");
    const kartenRahmen = element("div", "karte-einzel");
    kartenRahmen.append(this.canvas);
    verbindeKarte(this.canvas, () => Z.einzel[Z.einzelAlgo], geaendert);
    const struktur = element(
      "section",
      "box struktur-box",
      `<h3><span class="struktur-titel"></span></h3><p class="struktur-regel"></p><div class="struktur-inhalt" aria-live="off"></div>`,
    );
    struktur.setAttribute("aria-label", "Datenstruktur");
    this.strukturTitel = struktur.querySelector(".struktur-titel") as HTMLElement;
    this.strukturRegel = struktur.querySelector(".struktur-regel") as HTMLElement;
    this.strukturInhalt = struktur.querySelector(".struktur-inhalt") as HTMLElement;
    const merkmalBox = element(
      "details",
      "box merkmal-box",
      `<summary><h3 class="merkmal-frage"></h3></summary><ul class="merkmal-belege"></ul>`,
    );
    merkmalBox.setAttribute("open", "");
    this.merkmalFrage = merkmalBox.querySelector(".merkmal-frage") as HTMLElement;
    this.merkmalBelege = merkmalBox.querySelector(".merkmal-belege") as HTMLUListElement;
    links.append(kartenRahmen, struktur, merkmalBox);

    // Rechts: Steckbrief, Erklärung, Pseudocode, Protokoll, Besuchsreihenfolge.
    const seite = element(
      "div",
      "einzel-seite",
      `<div class="box erklaerung"><span class="zeile-nr"></span><p class="satz" aria-live="off"></p></div>
      <div class="box code-box"><h3>Pseudocode</h3><ol class="code"></ol></div>
      <details class="box" open><summary><h3>Steckbrief</h3></summary><dl class="steckbrief"></dl><div class="heuristik"></div></details>
      <details class="box protokoll-box" open><summary><h3>Ereignisprotokoll <small class="protokoll-zahl"></small></h3></summary>
        <p class="hinweis">Klick auf einen Eintrag springt zu diesem Schritt.</p><ol class="protokoll"></ol></details>
      <details class="box liste-box"><summary><h3>Besuchsreihenfolge</h3></summary><p class="liste-leer">Noch kein Feld besucht.</p><ol class="besuchsliste"></ol></details>`,
    );
    this.steckbrief = seite.querySelector(".steckbrief") as HTMLElement;
    this.heuristik = seite.querySelector(".heuristik") as HTMLElement;
    this.satz = seite.querySelector(".satz") as HTMLElement;
    this.zeileNr = seite.querySelector(".zeile-nr") as HTMLElement;
    this.code = seite.querySelector(".code") as HTMLOListElement;
    this.protokollListe = seite.querySelector(".protokoll") as HTMLOListElement;
    this.protokollZahl = seite.querySelector(".protokoll-zahl") as HTMLElement;
    this.liste = seite.querySelector(".besuchsliste") as HTMLOListElement;
    this.listeLeer = seite.querySelector(".liste-leer") as HTMLElement;
    this.protokollListe.addEventListener("click", (ev) => {
      const b = (ev.target as HTMLElement).closest("button");
      if (!b) return;
      Z.spielt = false;
      Z.einzel[Z.einzelAlgo].gehe(Number(b.dataset.schritt) + 1);
      this.geaendert();
    });

    const inhalt = element("div", "einzel-inhalt");
    inhalt.setAttribute("role", "tabpanel");
    inhalt.id = "einzel-panel";
    this.panel = inhalt;
    inhalt.append(links, seite);

    el.append(leiste, this.wiedergabe.element, this.hinweis, inhalt);
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
      h: Z.h,
    });
  }

  aktualisiere(): void {
    const a = Z.einzelAlgo;
    const info = ALGO_INFO[a];
    const r = Z.einzel[a];
    const neu = this.gezeigtAlgo !== a || this.gezeigtVersion !== Z.version;
    this.wiedergabe.aktualisiere();
    for (const [b, t] of this.tabs) {
      t.setAttribute("aria-selected", String(a === b));
      t.tabIndex = a === b ? 0 : -1;
    }
    // Während der Wiedergabe würde jeder Schritt angesagt (bis zu 140 pro Sekunde); nur angehalten vorlesen.
    this.satz.setAttribute("aria-live", Z.spielt ? "off" : "polite");
    this.panel.setAttribute("aria-labelledby", `tab-${a}`);
    this.canvas.setAttribute("aria-label", kartenBeschreibung(r));
    this.element.style.setProperty("--farbe", info.farbe);

    if (this.gezeigtAlgo !== a) {
      this.legendeZustaende.replaceChildren(...legendeFuer(a));
      const optionen = ZAHLEN_OPTIONEN[a];
      if (!optionen.some(([w]) => w === Z.zahlen)) Z.zahlen = "kosten";
      this.select.replaceChildren(
        ...optionen.map(([w, text]) => {
          const o = document.createElement("option");
          o.value = w;
          o.textContent = text;
          return o;
        }),
      );
      this.code.replaceChildren(
        ...PSEUDOCODE[a].map((z) => {
          const li = document.createElement("li");
          li.textContent = z.text;
          return li;
        }),
      );
    }
    this.select.value = Z.zahlen;
    this.aktualisiereSteckbrief(r);
    this.aktualisiereHinweis(r);

    const zeile = r.aktuell?.zeile ?? 0;
    this.zeileNr.textContent = zeile > 0 ? `Pseudocode-Zeile ${zeile}` : "Start";
    this.satz.textContent = erklaerSatz(r);
    [...this.code.children].forEach((li, i) => {
      const aktiv = i + 1 === zeile;
      li.classList.toggle("aktiv", aktiv);
      if (aktiv) li.setAttribute("aria-current", "step");
      else li.removeAttribute("aria-current");
    });

    this.aktualisiereStruktur(r);
    const m = merkmal(r);
    this.merkmalFrage.textContent = m.frage;
    this.merkmalBelege.replaceChildren(
      ...m.belege.map((t) => {
        const li = document.createElement("li");
        li.textContent = t;
        return li;
      }),
    );
    this.aktualisiereProtokoll(r, neu);
    this.aktualisiereBesuche(r, neu);
    this.gezeigtAlgo = a;
    this.gezeigtVersion = Z.version;
  }

  private aktualisiereSteckbrief(r: Replay): void {
    const e = r.ergebnis;
    const info = ALGO_INFO[e.algo];
    let ergebnis = "– (Suche läuft noch)";
    if (r.fertig && !e.gefunden) ergebnis = "kein Weg: Die Datenstruktur ist leer";
    else if (r.fertig) {
      ergebnis =
        e.algo === "bfs"
          ? `kürzester Weg nach Anzahl der Kanten: ${zahl(e.felder)} Kanten (Ausdauer ${zahl(e.kosten)}, nicht unbedingt minimal)`
          : e.algo === "dfs"
            ? `irgendein Weg: ${zahl(e.felder)} Kanten, Ausdauer ${zahl(e.kosten)}`
            : `günstigster Weg: Ausdauer ${zahl(e.kosten)} (${zahl(e.felder)} Kanten)`;
    }
    this.steckbrief.innerHTML = `
      <div><dt>Verfahren</dt><dd>${info.verfahren}</dd></div>
      <div><dt>Prinzip</dt><dd>${info.prinzip}</dd></div>
      <div><dt>Wählt als Nächstes</dt><dd>${info.waehlt}</dd></div>
      <div><dt>Findet</dt><dd>${info.findet}</dd></div>
      <div><dt>Ergebnis</dt><dd>${ergebnis}</dd></div>`;
    this.heuristik.hidden = e.algo !== "astar";
    if (e.algo !== "astar") return;
    const s = e.start.y * e.breite + e.start.x;
    const hs = Z.h(s);
    const c = Z.billigstes;
    const pruefung = e.gefunden ? `Am Start: h = ${zahl(hs)} ≤ tatsächliche Kosten ${zahl(e.kosten)} ✓` : `Am Start: h = ${zahl(hs)}`;
    const n = Z.billigsteAnzahl;
    const c2 = Z.naechstBilligstes;
    const abhaengig =
      c2 === Infinity
        ? "Hier kosten alle begehbaren Felder gleich viel."
        : `Hier gibt es ${zahl(n)} ${n === 1 ? "Feld" : "Felder"} mit Kosten ${zahl(c)}. Ohne ${n === 1 ? "dieses" : "diese"} wäre der Faktor ${zahl(c2)} und h überall ${zahl(c2 / Math.max(c, 1e-9))}-mal so groß${c === 0 ? " (mit Kosten 0 ist h überall 0, A* rechnet dann wie Dijkstra)" : ""}.`;
    // Wenige billige Felder drücken h auf der ganzen Karte: Dann wirkt A* schwächer, ohne dass sich am Weg etwas ändert.
    const warnung =
      c2 !== Infinity && n <= 3
        ? `<p class="hinweis-box warnung klein">Nur ${zahl(n)} ${n === 1 ? "Feld bestimmt" : "Felder bestimmen"} den Faktor ${zahl(c)} für die ganze Karte. A* lenkt deshalb schwächer und besucht mehr Felder, als es mit Faktor ${zahl(c2)} müsste.</p>`
        : "";
    this.heuristik.innerHTML = `
      <h3>Heuristik (offengelegt)</h3>
      <p class="formel">h(v) = ${zahl(c)} · (|x − ${e.ziel.x}| + |y − ${e.ziel.y}|)</p>
      <ul>
        <li><b>Manhattan-Abstand</b> zum Ziel ${koord(e.ziel)}, weil nur vier Richtungen erlaubt sind (keine Diagonalen).</li>
        <li><b>× ${zahl(c)}</b> = Kosten des billigsten begehbaren Feldes dieser Karte. Jeder Schritt kostet mindestens so viel.</li>
        <li><b>Zulässig:</b> h überschätzt die tatsächlichen Restkosten nie, auch bei verschiedenen Kosten. ${pruefung}</li>
        <li><b>Konsistent:</b> h(u) ≤ kosten(u → v) + h(v); deshalb steigen die entnommenen f-Werte nie.</li>
        <li><b>Hängt von der ganzen Karte ab:</b> Der Faktor ist das billigste Feld <em>irgendwo</em> auf der Karte, nicht in der Nähe des Weges. ${abhaengig}</li>
      </ul>${warnung}
      <p class="hinweis">„Zahlen auf der Karte“ zeigt g, h und f für jedes Feld.</p>`;
  }

  private aktualisiereHinweis(r: Replay): void {
    const e = r.ergebnis;
    const info = ALGO_INFO[e.algo];
    const ignoriert = !info.gewichte;
    this.hinweis.hidden = !ignoriert;
    if (!ignoriert) return;
    const opt = Z.ergebnisse.dijkstra;
    if (Z.gewichtet) {
      this.hinweis.className = "hinweis-box warnung";
      const vergleich =
        e.gefunden && opt.gefunden && r.fertig
          ? ` Hier: ${info.name} zahlt ${zahl(e.kosten)} Ausdauer, der günstigste Weg (Dijkstra) kostet ${zahl(opt.kosten)}.`
          : "";
      this.hinweis.innerHTML = `<b>Gewichtete Karte:</b> ${info.name} ignoriert die Kantengewichte (Ausdauer ${this.spanne()}). ${
        e.algo === "bfs"
          ? "Es findet den kürzesten Weg nach <b>Anzahl der Kanten</b>, nicht den günstigsten."
          : "Es findet irgendeinen Weg, meist weder den kürzesten noch den günstigsten."
      }${vergleich} Für den günstigsten Weg: Dijkstra oder A*.`;
    } else {
      this.hinweis.className = "hinweis-box info";
      this.hinweis.innerHTML =
        e.algo === "bfs"
          ? "<b>Ungewichtete Karte:</b> Alle Felder kosten gleich viel. Der kürzeste Weg nach Anzahl der Kanten ist hier zugleich der günstigste."
          : "<b>Ungewichtete Karte:</b> Alle Felder kosten gleich viel; DFS beachtet Gewichte ohnehin nicht.";
    }
  }

  /** „1–7“: kleinste und größte Ausdauer der begehbaren Felder. */
  private spanne(): string {
    let max = 0;
    for (const zeile of Z.karte)
      for (const key of zeile) {
        const k = TERRAIN_NACH_KEY[key].kosten;
        if (k !== Infinity && k > max) max = k;
      }
    return `${zahl(Z.billigstes)}–${zahl(max)}`;
  }

  private aktualisiereStruktur(r: Replay): void {
    const e = r.ergebnis;
    const info = ALGO_INFO[e.algo];
    const inhalt = r.inhalt();
    const b = e.breite;
    const k = (id: FeldId) => koord({ x: id % b, y: Math.floor(id / b) });
    const veraltet = inhalt.filter((x) => r.veraltet(x)).length;
    this.strukturTitel.textContent = `${info.struktur}: ${inhalt.length} ${inhalt.length === 1 ? "Eintrag" : "Einträge"}${veraltet ? `, davon ${veraltet} veraltet` : ""}`;
    this.strukturRegel.textContent = info.strukturRegel;
    const s = r.aktuell;
    const neuSeq = s?.art === "einfuegen" ? Math.max(...inhalt.map((x) => x.seq)) : -1;
    const entnommen = s?.art === "entnehmen" ? r.letzteEntnahme() : undefined;
    const rest = inhalt.length - MAX_EINTRAEGE;
    const zeige = inhalt.slice(0, MAX_EINTRAEGE);
    const mehr = rest > 0 ? `<span class="mehr">… und ${rest} weitere</span>` : "";
    const leer = inhalt.length === 0 ? `<p class="hinweis">leer</p>` : "";
    const raus = entnommen ? `<p class="entnommen">Gerade entnommen: <b>${k(entnommen.v)}</b> ${this.werte(e.algo, entnommen)}</p>` : "";
    const klasse = (x: Eintrag, i: number) =>
      [i === 0 ? "naechster" : "", x.seq === neuSeq ? "neu" : "", r.veraltet(x) ? "veraltet" : ""].filter(Boolean).join(" ");

    if (e.algo === "bfs" || e.algo === "dfs") {
      const randA = e.algo === "bfs" ? "vorne ← entnehmen" : "oben ← auflegen und entnehmen";
      const randB = e.algo === "bfs" ? "hinten ← anfügen" : "unten";
      this.strukturInhalt.innerHTML = `${raus}<div class="slots ${e.algo}">
        <span class="rand">${randA}</span>
        ${zeige.map((x, i) => `<span class="slot ${klasse(x, i)}" title="d = ${zahl(x.g)} Kanten ab Start"><b>${k(x.v)}</b><small>d ${zahl(x.g)}</small></span>`).join("")}
        ${mehr}${inhalt.length > 0 ? `<span class="rand">${randB}</span>` : ""}</div>${leer}`;
      return;
    }
    const astar = e.algo === "astar";
    const kopf = astar
      ? `<tr><th scope="col">#</th><th scope="col">Feld</th><th scope="col">g</th><th scope="col">h</th><th scope="col">f = g + h</th><th scope="col">Status</th></tr>`
      : `<tr><th scope="col">#</th><th scope="col">Feld</th><th scope="col">d (Priorität)</th><th scope="col">eingefügt als</th><th scope="col">Status</th></tr>`;
    const zeilen = zeige
      .map((x, i) => {
        const status = r.veraltet(x) ? "veraltet, wird übersprungen" : i === 0 ? "wird als Nächstes entnommen" : "";
        const werte = astar
          ? `<td>${zahl(x.g)}</td><td>${zahl(x.prio - x.g)}</td><td><b>${zahl(x.prio)}</b></td>`
          : `<td><b>${zahl(x.prio)}</b></td><td>Nr. ${x.seq + 1}</td>`;
        return `<tr class="${klasse(x, i)}"><td>${i + 1}</td><td>${k(x.v)}</td>${werte}<td>${status}</td></tr>`;
      })
      .join("");
    this.strukturInhalt.innerHTML = `${raus}${
      inhalt.length
        ? `<div class="tabelle-rahmen"><table class="pq"><thead>${kopf}</thead><tbody>${zeilen}</tbody></table></div>${mehr}`
        : leer
    }`;
  }

  private werte(algo: Algo, x: Eintrag): string {
    if (algo === "astar") return `(g ${zahl(x.g)} + h ${zahl(x.prio - x.g)} = f ${zahl(x.prio)})`;
    if (algo === "dijkstra") return `(d = ${zahl(x.prio)})`;
    return `(d = ${zahl(x.g)})`;
  }

  private aktualisiereProtokoll(r: Replay, neu: boolean): void {
    if (neu) {
      this.eintraege = protokoll(r, r.ergebnis.algo === "astar" ? Z.h : () => 0);
      this.protokollListe.replaceChildren();
      this.gezeigtProtokoll = 0;
    }
    // Sichtbar sind alle Einträge, deren Step schon ausgeführt ist.
    let soll = this.gezeigtProtokoll;
    while (soll > 0 && this.eintraege[soll - 1].schritt >= r.position) soll--;
    while (soll < this.eintraege.length && this.eintraege[soll].schritt < r.position) soll++;
    while (this.gezeigtProtokoll > soll) {
      this.protokollListe.lastElementChild?.remove();
      this.gezeigtProtokoll--;
    }
    while (this.gezeigtProtokoll < soll) {
      const p = this.eintraege[this.gezeigtProtokoll];
      const li = document.createElement("li");
      li.className = p.art;
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.schritt = String(p.schritt);
      b.innerHTML = `<span class="nr">#${p.schritt + 1}</span> `;
      b.append(p.text);
      li.append(b);
      this.protokollListe.append(li);
      this.gezeigtProtokoll++;
    }
    [...this.protokollListe.querySelectorAll(".aktuell")].forEach((x) => x.classList.remove("aktuell"));
    this.protokollListe.lastElementChild?.classList.add("aktuell");
    this.protokollZahl.textContent = `(${soll} von ${this.eintraege.length})`;
    this.protokollListe.scrollTop = this.protokollListe.scrollHeight;
  }

  private aktualisiereBesuche(r: Replay, neu: boolean): void {
    // Besuchsreihenfolge nur so weit ändern, wie sie sich geändert hat.
    if (neu) {
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
  }
}
