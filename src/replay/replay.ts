// Replay: spielt die Aufzeichnung eines Laufs Step für Step vor und zurück.
// Jeder Step wird beim Vorspielen angewendet und beim Zurückspielen exakt rückgängig gemacht
// (setze kennt die alten Werte). So ergibt hin und zurück immer denselben Zustand (QA-02).
import type { FeldId, SearchResult, Step } from "../types";

export class Replay {
  readonly ergebnis: SearchResult;
  /** d[v]: BFS/DFS Feldzahl ab Start, Dijkstra/A* bisher günstigste Kosten. */
  readonly d: Float64Array;
  readonly vorg: Int32Array;
  /** Besuchsnummer je Feld, 0 = noch nicht besucht. */
  readonly besuchNr: Int32Array;
  /** Wie oft das Feld gerade in Warteschlange, Stapel oder Heap liegt. */
  readonly inListe: Int32Array;
  /** Besuchte Felder in Besuchsreihenfolge. */
  readonly reihenfolge: FeldId[] = [];
  private k = 0;
  private zielErreicht = false;

  constructor(ergebnis: SearchResult) {
    this.ergebnis = ergebnis;
    const n = ergebnis.breite * ergebnis.hoehe;
    this.d = new Float64Array(n).fill(Infinity);
    this.vorg = new Int32Array(n).fill(-1);
    this.besuchNr = new Int32Array(n);
    this.inListe = new Int32Array(n);
  }

  /** Anzahl ausgeführter Steps (0 … laenge). */
  get position(): number {
    return this.k;
  }

  get laenge(): number {
    return this.ergebnis.schritte.length;
  }

  get fertig(): boolean {
    return this.k === this.laenge;
  }

  /** true, sobald die Zielprüfung positiv war. */
  get gefunden(): boolean {
    return this.zielErreicht;
  }

  /** Zuletzt ausgeführter Step, undefined vor dem ersten. */
  get aktuell(): Step | undefined {
    return this.k > 0 ? this.ergebnis.schritte[this.k - 1] : undefined;
  }

  vor(): boolean {
    if (this.k >= this.laenge) return false;
    this.anwenden(this.ergebnis.schritte[this.k++]);
    return true;
  }

  zurueck(): boolean {
    if (this.k <= 0) return false;
    this.rueckgaengig(this.ergebnis.schritte[--this.k]);
    return true;
  }

  /** Springt zu Position k (wird auf 0 … laenge begrenzt). */
  gehe(k: number): void {
    const ziel = Math.max(0, Math.min(this.laenge, Math.round(k)));
    while (this.k < ziel) this.vor();
    while (this.k > ziel) this.zurueck();
  }

  /** Position direkt nach dem n-ten Besuch (n ab 1); 0 für n = 0; Ende, wenn es so viele Besuche nicht gibt. */
  positionNachBesuch(n: number): number {
    if (n <= 0) return 0;
    const idx = this.ergebnis.besuchsIndizes;
    return n > idx.length ? this.laenge : idx[n - 1] + 1;
  }

  /** Wartet das Feld in der Datenstruktur, ohne schon besucht zu sein? */
  wartet(v: FeldId): boolean {
    return this.inListe[v] > 0 && this.besuchNr[v] === 0;
  }

  private besuchen(v: FeldId, nr: number): void {
    this.besuchNr[v] = nr;
    this.reihenfolge.push(v);
  }

  private besuchZuruecknehmen(v: FeldId): void {
    this.besuchNr[v] = 0;
    this.reihenfolge.pop();
  }

  private anwenden(s: Step): void {
    switch (s.art) {
      case "setze":
        this.d[s.v as FeldId] = s.d as number;
        this.vorg[s.v as FeldId] = s.vorg as FeldId;
        break;
      case "einfuegen":
        this.inListe[s.v as FeldId]++;
        if (s.besuch !== undefined) this.besuchen(s.v as FeldId, s.besuch);
        break;
      case "entnehmen":
        this.inListe[s.u as FeldId]--;
        if (s.besuch !== undefined) this.besuchen(s.u as FeldId, s.besuch);
        break;
      case "abschliessen":
        this.besuchen(s.u as FeldId, s.besuch as number);
        break;
      case "zielpruefung":
        if (s.ok) this.zielErreicht = true;
        break;
      default:
        break;
    }
  }

  private rueckgaengig(s: Step): void {
    switch (s.art) {
      case "setze":
        this.d[s.v as FeldId] = s.altD as number;
        this.vorg[s.v as FeldId] = s.altVorg as FeldId;
        break;
      case "einfuegen":
        this.inListe[s.v as FeldId]--;
        if (s.besuch !== undefined) this.besuchZuruecknehmen(s.v as FeldId);
        break;
      case "entnehmen":
        this.inListe[s.u as FeldId]++;
        if (s.besuch !== undefined) this.besuchZuruecknehmen(s.u as FeldId);
        break;
      case "abschliessen":
        this.besuchZuruecknehmen(s.u as FeldId);
        break;
      case "zielpruefung":
        if (s.ok) this.zielErreicht = false;
        break;
      default:
        break;
    }
  }
}
