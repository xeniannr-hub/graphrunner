// Replay: spielt die Aufzeichnung eines Laufs Step für Step vor und zurück.
// Jeder Step wird beim Vorspielen angewendet und beim Zurückspielen exakt rückgängig gemacht
// (setze kennt die alten Werte). So ergibt hin und zurück immer denselben Zustand (QA-02).
import type { FeldId, SearchResult, Step } from "../types";

/** Ein Eintrag in Warteschlange, Stapel oder Heap. */
export interface Eintrag {
  readonly v: FeldId;
  /** Kosten d[v] (A*: g) beim Einfügen. */
  readonly g: number;
  /** Priorität im Heap (Dijkstra: d, A*: f = g + h); bei BFS und DFS gleich g. */
  readonly prio: number;
  /** Laufende Nummer des Einfügens; bei gleicher Priorität gewinnt die kleinere (ältere). */
  readonly seq: number;
}

/**
 * Algorithmisch verschiedene Zustände eines Feldes (FA-04):
 * unbekannt → entdeckt (d gesetzt) → wartet (in Warteschlange, Stapel oder Heap) → expandiert → ggf. Weg.
 */
export type FeldZustand = "unbekannt" | "entdeckt" | "wartet" | "expandiert" | "weg";

/** Was beim Entnehmen geschah, damit das Zurückspulen exakt ist. */
interface Entnahme {
  readonly eintrag: Eintrag;
  /** Heap: ältester Eintrag, der noch wartet und überholt wurde (keine FIFO-Reihenfolge); sonst undefined. */
  readonly aelter: Eintrag | undefined;
  /** Wurde das Feld dabei expandiert (BFS, DFS)? */
  readonly expandiert: boolean;
}

export class Replay {
  readonly ergebnis: SearchResult;
  /** d[v]: BFS/DFS Feldzahl ab Start, Dijkstra/A* bisher günstigste Kosten. */
  readonly d: Float64Array;
  readonly vorg: Int32Array;
  /** Besuchsnummer je Feld, 0 = noch nicht besucht. */
  readonly besuchNr: Int32Array;
  /** Wie oft das Feld gerade in Warteschlange, Stapel oder Heap liegt. */
  readonly inListe: Int32Array;
  /** 1 = expandiert: BFS entnommen, DFS vom Stapel genommen (alle Nachbarn geprüft), Dijkstra/A* abgeschlossen. */
  readonly expandiert: Uint8Array;
  /** Besuchte Felder in Besuchsreihenfolge. */
  readonly reihenfolge: FeldId[] = [];
  /** Prioritäten der entnommenen Heap-Einträge bzw. d der entnommenen Felder, in Reihenfolge. */
  readonly entnommenePrio: number[] = [];
  /**
   * Wie oft ein schon entdecktes Feld einen kleineren d-Wert bekam. BFS und DFS: nie. Dijkstra hier auch nie,
   * weil jede Kante in ein Feld gleich viel kostet (Kosten des Feldes); A* kann es (Expansion nach f, nicht nach g).
   */
  verbesserungen = 0;
  /** Heap: Wie oft ein jüngerer Eintrag vor einem älteren entnommen wurde (bei FIFO unmöglich). */
  ueberholt = 0;
  /** DFS: Rücksprünge (Feld vom Stapel genommen). */
  ruecksprunge = 0;
  private k = 0;
  private zielErreicht = false;
  private readonly heap: boolean;
  /** Inhalt der Datenstruktur: BFS ab `kopf`, DFS als Stapel, Heap ungeordnet. */
  private readonly liste: Eintrag[] = [];
  private kopf = 0;
  private seq = 0;
  private readonly entnahmen: Entnahme[] = [];
  private readonly wegSet: ReadonlySet<FeldId>;

  constructor(ergebnis: SearchResult) {
    this.ergebnis = ergebnis;
    const n = ergebnis.breite * ergebnis.hoehe;
    this.d = new Float64Array(n).fill(Infinity);
    this.vorg = new Int32Array(n).fill(-1);
    this.besuchNr = new Int32Array(n);
    this.inListe = new Int32Array(n);
    this.expandiert = new Uint8Array(n);
    this.wegSet = new Set(ergebnis.wegIds);
    this.heap = ergebnis.algo === "dijkstra" || ergebnis.algo === "astar";
  }

  /**
   * Inhalt der Datenstruktur in der Reihenfolge, in der entnommen wird:
   * BFS vorne → hinten, DFS oben → unten, Dijkstra/A* nach Priorität, bei Gleichstand der ältere zuerst.
   */
  inhalt(): Eintrag[] {
    if (this.ergebnis.algo === "bfs") return this.liste.slice(this.kopf);
    if (this.ergebnis.algo === "dfs") return [...this.liste].reverse();
    return [...this.liste].sort((a, b) => a.prio - b.prio || a.seq - b.seq);
  }

  /** Zuletzt entnommener Eintrag (für Erklärsatz und Protokoll). */
  letzteEntnahme(): Eintrag | undefined {
    return this.entnahmen.at(-1)?.eintrag;
  }

  /** Letztes Überholen im Heap: entnommener Eintrag und der ältere, der weiter warten musste. */
  letztesUeberholen(): { eintrag: Eintrag; aelter: Eintrag } | undefined {
    for (let i = this.entnahmen.length - 1; i >= 0; i--) {
      const { eintrag, aelter } = this.entnahmen[i];
      if (aelter) return { eintrag, aelter };
    }
    return undefined;
  }

  /** Heap mit lazy deletion: Ein Eintrag ist veraltet, wenn sein Feld abgeschlossen ist oder inzwischen günstiger wurde. */
  veraltet(e: Eintrag): boolean {
    return this.heap && (this.expandiert[e.v] === 1 || e.g > this.d[e.v]);
  }

  /** Zustand eines Feldes für Karte, Legende und Tooltip. */
  zustand(v: FeldId): FeldZustand {
    if (this.zielErreicht && this.wegSet.has(v)) return "weg";
    if (this.expandiert[v] === 1) return "expandiert";
    if (this.inListe[v] > 0) return "wartet";
    if (this.d[v] < Infinity) return "entdeckt";
    return "unbekannt";
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

  /**
   * Position direkt nach dem n-ten Besuch (n ab 1); 0 für n = 0.
   * Ab dem letzten Besuch das Ende, damit Zielprüfung und gefundener Weg sichtbar sind.
   */
  positionNachBesuch(n: number): number {
    if (n <= 0) return 0;
    const idx = this.ergebnis.besuchsIndizes;
    return n >= idx.length ? this.laenge : idx[n - 1] + 1;
  }

  /** Wartet das Feld in der Datenstruktur, ohne schon besucht zu sein? */
  wartet(v: FeldId): boolean {
    return this.inListe[v] > 0 && this.expandiert[v] === 0;
  }

  private besuchen(v: FeldId, nr: number): void {
    this.besuchNr[v] = nr;
    this.reihenfolge.push(v);
  }

  private besuchZuruecknehmen(v: FeldId): void {
    this.besuchNr[v] = 0;
    this.reihenfolge.pop();
  }

  /** Entfernt den Eintrag, den das Verfahren entnimmt, und merkt sich alles fürs Zurückspulen. */
  private entnimm(): void {
    const algo = this.ergebnis.algo;
    let eintrag: Eintrag;
    let aelter: Eintrag | undefined;
    if (algo === "bfs") eintrag = this.liste[this.kopf++];
    else if (algo === "dfs") eintrag = this.liste.pop() as Eintrag;
    else {
      // Wie der Heap: kleinste Priorität, bei Gleichstand der ältere Eintrag.
      let i = 0;
      for (let j = 1; j < this.liste.length; j++) {
        const a = this.liste[j];
        const b = this.liste[i];
        if (a.prio < b.prio || (a.prio === b.prio && a.seq < b.seq)) i = j;
      }
      eintrag = this.liste[i];
      this.liste.splice(i, 1);
      for (const e of this.liste) if (e.seq < eintrag.seq && (!aelter || e.seq < aelter.seq)) aelter = e;
    }
    const expandiert = algo === "bfs" || algo === "dfs";
    if (expandiert) this.expandiert[eintrag.v] = 1;
    if (aelter) this.ueberholt++;
    if (algo === "dfs") this.ruecksprunge++;
    else this.entnommenePrio.push(eintrag.prio);
    this.entnahmen.push({ eintrag, aelter, expandiert });
  }

  private entnahmeZuruecknehmen(): void {
    const { eintrag, aelter, expandiert } = this.entnahmen.pop() as Entnahme;
    const algo = this.ergebnis.algo;
    if (algo === "bfs") this.kopf--;
    else this.liste.push(eintrag);
    if (expandiert) this.expandiert[eintrag.v] = 0;
    if (aelter) this.ueberholt--;
    if (algo === "dfs") this.ruecksprunge--;
    else this.entnommenePrio.pop();
  }

  private anwenden(s: Step): void {
    switch (s.art) {
      case "setze":
        if ((s.altD as number) < Infinity) this.verbesserungen++;
        this.d[s.v as FeldId] = s.d as number;
        this.vorg[s.v as FeldId] = s.vorg as FeldId;
        break;
      case "einfuegen": {
        const v = s.v as FeldId;
        this.inListe[v]++;
        this.liste.push({ v, g: this.d[v], prio: s.prio ?? this.d[v], seq: this.seq++ });
        if (s.besuch !== undefined) this.besuchen(v, s.besuch);
        break;
      }
      case "entnehmen":
        this.inListe[s.u as FeldId]--;
        this.entnimm();
        if (s.besuch !== undefined) this.besuchen(s.u as FeldId, s.besuch);
        break;
      case "abschliessen":
        this.expandiert[s.u as FeldId] = 1;
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
        if ((s.altD as number) < Infinity) this.verbesserungen--;
        this.d[s.v as FeldId] = s.altD as number;
        this.vorg[s.v as FeldId] = s.altVorg as FeldId;
        break;
      case "einfuegen":
        this.inListe[s.v as FeldId]--;
        // Beim Heap kann ein zurückgelegter Eintrag hinter diesem liegen; deshalb über seq suchen.
        this.seq--;
        let i = this.liste.length - 1;
        while (this.liste[i].seq !== this.seq) i--;
        this.liste.splice(i, 1);
        if (s.besuch !== undefined) this.besuchZuruecknehmen(s.v as FeldId);
        break;
      case "entnehmen":
        this.inListe[s.u as FeldId]++;
        this.entnahmeZuruecknehmen();
        if (s.besuch !== undefined) this.besuchZuruecknehmen(s.u as FeldId);
        break;
      case "abschliessen":
        this.expandiert[s.u as FeldId] = 0;
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
