// Wiedergabeleiste für beide Ansichten (FA-09):
// |◀ · ◀ · Abspielen/Pause/Nochmal · ▶ · [▶| nur Einzelansicht] · Tempo (mit Schritten pro Sekunde) ·
// „Zeile k von n“ bzw. „Feld k von n“ · [Loslaufen nur Vergleich] · Legende. Tastatur: ← → Schritt, Leertaste, Pos1, Ende.
import { Z } from "./zustand";

export interface Steuerung {
  position(): number;
  laenge(): number;
  gehe(k: number): void;
}

export interface WiedergabeOptionen {
  /** Nur Einzelansicht: Knopf „Zum Ende“. */
  readonly zumEnde: boolean;
  /** Was ein Schritt ist, für die Anzeige: „Zeilen“ (Einzelansicht) oder „Felder“ (Vergleich). */
  readonly einheit: string;
  /** Einzahl für die Fortschrittsanzeige, z. B. „Zeile“ → „Zeile 12 von 536“. */
  readonly einheitEinzahl: string;
  /** Erklärung der Einheit (title der Fortschrittsanzeige). */
  readonly einheitErklaerung: string;
  /** Nur Vergleich: Knopf „Loslaufen“. */
  readonly loslaufen?: { bereit(): boolean; laeuft(): boolean; starte(): void };
  readonly legende: HTMLElement;
  /** Wird nach jeder Bedienung aufgerufen. */
  readonly geaendert: () => void;
}

/** Schritte pro Sekunde für Tempo 1 … 10 (etwa 2 bis 140). */
const schritteProSekunde = (tempo: number): number => 2 * 1.6 ** (tempo - 1);

function knopf(text: string, label: string, klasse = "knopf"): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.className = klasse;
  b.textContent = text;
  b.setAttribute("aria-label", label);
  b.title = label;
  return b;
}

export class Wiedergabe {
  readonly element: HTMLElement;
  private readonly spielen: HTMLButtonElement;
  private readonly regler: HTMLInputElement;
  private readonly tempoRegler: HTMLInputElement;
  private readonly anzeige: HTMLOutputElement;
  private readonly tempoAnzeige: HTMLOutputElement;
  private readonly los: HTMLButtonElement | null = null;
  private rest = 0;

  constructor(
    private readonly s: Steuerung,
    private readonly opt: WiedergabeOptionen,
  ) {
    const leiste = document.createElement("div");
    leiste.className = "wiedergabe";
    leiste.setAttribute("role", "group");
    leiste.setAttribute("aria-label", "Wiedergabe");

    const knoepfe = document.createElement("div");
    knoepfe.className = "knoepfe";
    const anfang = knopf("|◀", "Zum Anfang (Pos1)");
    const zurueck = knopf("◀", "Schritt zurück (Pfeil links)");
    this.spielen = knopf("Abspielen", "Abspielen oder anhalten (Leertaste)", "knopf haupt");
    const vor = knopf("▶", "Schritt vor (Pfeil rechts)");
    anfang.onclick = () => this.bediene(() => this.s.gehe(0));
    zurueck.onclick = () => this.bediene(() => this.schritt(-1));
    vor.onclick = () => this.bediene(() => this.schritt(1));
    this.spielen.onclick = () => this.umschalten();
    knoepfe.append(anfang, zurueck, this.spielen, vor);
    if (opt.zumEnde) {
      const ende = knopf("▶|", "Zum Ende (Ende)");
      ende.onclick = () => this.bediene(() => this.s.gehe(this.s.laenge()));
      knoepfe.append(ende);
    }

    const tempo = document.createElement("label");
    tempo.className = "tempo";
    tempo.textContent = "Tempo";
    this.tempoRegler = document.createElement("input");
    this.tempoRegler.type = "range";
    this.tempoRegler.min = "1";
    this.tempoRegler.max = "10";
    this.tempoRegler.value = String(Z.tempo);
    this.tempoRegler.oninput = () => {
      Z.tempo = Number(this.tempoRegler.value);
      this.opt.geaendert();
    };
    this.tempoAnzeige = document.createElement("output");
    this.tempoAnzeige.className = "tempo-wert";
    tempo.append(this.tempoRegler, this.tempoAnzeige);
    this.tempoRegler.setAttribute("aria-label", "Tempo");

    const fortschritt = document.createElement("div");
    fortschritt.className = "fortschritt";
    this.regler = document.createElement("input");
    this.regler.type = "range";
    this.regler.min = "0";
    this.regler.setAttribute("aria-label", "Fortschritt");
    this.regler.oninput = () => this.bediene(() => this.s.gehe(Number(this.regler.value)));
    this.anzeige = document.createElement("output");
    fortschritt.append(this.regler, this.anzeige);

    leiste.append(knoepfe, tempo, fortschritt);
    if (opt.loslaufen) {
      this.los = knopf("Loslaufen", "Alle Figuren laufen ihren gefundenen Weg ab", "knopf los");
      const l = opt.loslaufen;
      this.los.onclick = () => {
        Z.spielt = false;
        l.starte();
        this.opt.geaendert();
      };
      leiste.append(this.los);
    }
    opt.legende.classList.add("legende");
    // Tastenhinweis direkt an der Leiste, damit die Bedienung ohne Anleitung auffällt (QA-04, QA-05).
    const tasten = document.createElement("p");
    tasten.className = "tasten";
    tasten.innerHTML = opt.zumEnde
      ? `<kbd>←</kbd><kbd>→</kbd> Schritt · <kbd>Leertaste</kbd> Abspielen/Pause · <kbd>Pos1</kbd><kbd>Ende</kbd> Anfang/Ende`
      : `<kbd>←</kbd><kbd>→</kbd> Schritt · <kbd>Leertaste</kbd> Abspielen/Pause · <kbd>Pos1</kbd> Anfang`;
    leiste.append(opt.legende, tasten);
    this.element = leiste;
  }

  private bediene(f: () => void): void {
    Z.spielt = false;
    f();
    this.opt.geaendert();
  }

  /** Ein Schritt vor (+1) oder zurück (−1). */
  schritt(richtung: number): void {
    this.s.gehe(this.s.position() + richtung);
  }

  /** Pos1 und Ende: zum Anfang bzw. (nur Einzelansicht) zum Ende springen. */
  springe(ende: boolean): void {
    if (ende && !this.opt.zumEnde) return;
    this.bediene(() => this.s.gehe(ende ? this.s.laenge() : 0));
  }

  /** Pfeiltasten: Schritt vor oder zurück. */
  taste(richtung: number): void {
    this.bediene(() => this.schritt(richtung));
  }

  /** Abspielen, Pause oder – am Ende – Nochmal. */
  umschalten(): void {
    if (Z.spielt) Z.spielt = false;
    else {
      if (this.s.position() >= this.s.laenge()) this.s.gehe(0);
      Z.spielt = true;
      this.rest = 0;
    }
    this.opt.geaendert();
  }

  /** Läuft jedes Bild; dt in Sekunden. Gibt true zurück, wenn sich etwas bewegt hat. */
  tick(dt: number): boolean {
    if (!Z.spielt) return false;
    this.rest += dt * schritteProSekunde(Z.tempo);
    const n = Math.floor(this.rest);
    if (n === 0) return false;
    this.rest -= n;
    this.s.gehe(this.s.position() + n);
    if (this.s.position() >= this.s.laenge()) Z.spielt = false;
    return true;
  }

  aktualisiere(): void {
    const k = this.s.position();
    const n = this.s.laenge();
    this.spielen.textContent = Z.spielt ? "Pause" : k >= n ? "Nochmal" : "Abspielen";
    this.spielen.setAttribute("aria-pressed", String(Z.spielt));
    this.regler.max = String(n);
    this.regler.value = String(k);
    const text = `${this.opt.einheitEinzahl} ${k} von ${n}`;
    this.regler.setAttribute("aria-valuetext", text);
    this.anzeige.textContent = text;
    this.anzeige.title = this.opt.einheitErklaerung;
    this.tempoRegler.value = String(Z.tempo);
    const sps = schritteProSekunde(Z.tempo);
    this.tempoAnzeige.textContent = `${sps < 10 ? sps.toLocaleString("de-DE", { maximumFractionDigits: 1 }) : Math.round(sps)} ${this.opt.einheit}/s`;
    if (this.los && this.opt.loslaufen) {
      this.los.disabled = !this.opt.loslaufen.bereit();
      this.los.setAttribute("aria-pressed", String(this.opt.loslaufen.laeuft()));
    }
  }
}
