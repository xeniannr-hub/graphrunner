// Binärer Min-Heap. Bei gleicher Priorität gewinnt der ältere Eintrag (seq), damit jeder Lauf
// reproduzierbar ist (QA-02).

interface Eintrag<T> {
  readonly prio: number;
  readonly seq: number;
  readonly wert: T;
}

export class Heap<T> {
  private readonly daten: Eintrag<T>[] = [];
  private naechsteSeq = 0;

  get groesse(): number {
    return this.daten.length;
  }

  einfuegen(wert: T, prio: number): void {
    this.daten.push({ prio, seq: this.naechsteSeq++, wert });
    this.hoch(this.daten.length - 1);
  }

  /** Entnimmt den Eintrag mit kleinster Priorität; undefined, wenn leer. */
  entnehmen(): { wert: T; prio: number } | undefined {
    const d = this.daten;
    if (d.length === 0) return undefined;
    const oben = d[0];
    const letzter = d.pop() as Eintrag<T>;
    if (d.length > 0) {
      d[0] = letzter;
      this.runter(0);
    }
    return { wert: oben.wert, prio: oben.prio };
  }

  private kleiner(i: number, j: number): boolean {
    const a = this.daten[i];
    const b = this.daten[j];
    return a.prio < b.prio || (a.prio === b.prio && a.seq < b.seq);
  }

  private tausche(i: number, j: number): void {
    const t = this.daten[i];
    this.daten[i] = this.daten[j];
    this.daten[j] = t;
  }

  private hoch(i: number): void {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.kleiner(i, p)) return;
      this.tausche(i, p);
      i = p;
    }
  }

  private runter(i: number): void {
    const n = this.daten.length;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let m = i;
      if (l < n && this.kleiner(l, m)) m = l;
      if (r < n && this.kleiner(r, m)) m = r;
      if (m === i) return;
      this.tausche(i, m);
      i = m;
    }
  }
}
