// Mini-Graph (FA-29): ein 5 × 5-Ausschnitt der Karte als Knoten-Kanten-Bild, synchron zur aktuellen Pseudocode-Zeile.
// graphAusschnitt() liefert die Daten ohne DOM (testbar), zeichneMiniGraph() zeichnet sie mit Canvas 2D.
// Markiert werden dieselben Felder wie auf der Karte und im Erklärsatz, weil alle drei fokus() lesen.
import { nachbarn, schaetzung } from "../algorithms";
import { ALGO_INFO } from "../info/algo-info";
import { fokus, type Fokus } from "../info/fokus";
import type { FeldZustand, Replay } from "../replay/replay";
import type { Algo, FeldId, Pos, Step } from "../types";

export interface MiniKnoten {
  readonly id: FeldId;
  /** Lage im Ausschnitt: 0 … 4 von links bzw. oben. */
  readonly spalte: number;
  readonly zeile: number;
  readonly zustand: FeldZustand;
  /** Besucht im Sinne des Zählers „besucht“: Farbe des Verfahrens wie auf der Karte. */
  readonly besucht: boolean;
  readonly besuchNr: number;
  /** BFS/DFS: Kanten ab Start; Dijkstra: bisherige Kosten; A*: g. */
  readonly d: number;
  /** Nur A*: Schätzung h, sobald sie berechnet wurde (Step „schaetze“), sonst null. */
  readonly h: number | null;
  /** Kosten fürs Betreten = Gewicht jeder Kante in diesen Knoten. */
  readonly kosten: number;
  readonly istStart: boolean;
  readonly istZiel: boolean;
}

export interface MiniKante {
  readonly von: FeldId;
  readonly nach: FeldId;
  /** Kante von → nach kostet so viel wie das Feld nach. */
  readonly gewicht: number;
  /** vorg[nach] = von: Entdeckungskante (FA-05). */
  readonly vorgaenger: boolean;
}

export interface GraphAusschnitt {
  readonly algo: Algo;
  /** Linke obere Ecke des Ausschnitts auf der Karte. */
  readonly links: number;
  readonly oben: number;
  /** Größe des Ausschnitts in Feldern (5 × 5, auf kleinen Karten weniger). */
  readonly spalten: number;
  readonly zeilen: number;
  readonly knoten: readonly MiniKnoten[];
  /** Gerichtete Kanten zwischen begehbaren Nachbarn, beide Enden im Ausschnitt. */
  readonly kanten: readonly MiniKante[];
  /** Markierte Felder, aus fokus(replay.aktuell). */
  readonly fokus: Fokus;
  /** Der zuletzt ausgeführte Step (für Kante u → v, Ziel-Symbol usw.). */
  readonly step: Step | undefined;
}

/** Mittelpunkt des Ausschnitts: das gerade bearbeitete Feld, sonst der Start. */
export function zentrumVon(replay: Replay): Pos {
  const e = replay.ergebnis;
  const b = fokus(replay.aktuell).bearbeitet;
  return b === null ? e.start : { x: b % e.breite, y: Math.floor(b / e.breite) };
}

/**
 * Knoten und Kanten eines (2 · radius + 1)²-Ausschnitts um das Zentrum. Am Kartenrand wird das Fenster
 * verschoben statt abgeschnitten, damit es immer gleich groß bleibt; das Zentrum liegt dann nicht in der Mitte.
 * Unpassierbare Felder sind keine Knoten, also fehlen dort auch die Kanten: Wasser und Fels erscheinen als Lücke.
 */
export function graphAusschnitt(replay: Replay, zentrum: Pos, radius = 2): GraphAusschnitt {
  const e = replay.ergebnis;
  const grid = e.grid;
  const spalten = Math.min(2 * radius + 1, e.breite);
  const zeilen = Math.min(2 * radius + 1, e.hoehe);
  const links = Math.max(0, Math.min(e.breite - spalten, zentrum.x - radius));
  const oben = Math.max(0, Math.min(e.hoehe - zeilen, zentrum.y - radius));
  const imFenster = (id: FeldId) => {
    const x = id % e.breite;
    const y = Math.floor(id / e.breite);
    return x >= links && x < links + spalten && y >= oben && y < oben + zeilen;
  };
  const h = e.algo === "astar" ? schaetzung(grid, e.ziel) : null;
  const step = replay.aktuell;
  const knoten: MiniKnoten[] = [];
  const kanten: MiniKante[] = [];
  for (let y = oben; y < oben + zeilen; y++) {
    for (let x = links; x < links + spalten; x++) {
      const kosten = grid[y][x];
      if (kosten === Infinity) continue;
      const id = y * e.breite + x;
      // h ist sichtbar, sobald A* es berechnet hat: Das Feld liegt im Heap, ist abgeschlossen oder wird gerade geschätzt.
      const hBekannt = h !== null && (replay.inListe[id] > 0 || replay.expandiert[id] === 1 || (step?.art === "schaetze" && step.v === id));
      knoten.push({
        id,
        spalte: x - links,
        zeile: y - oben,
        zustand: replay.zustand(id),
        besucht: replay.besuchNr[id] > 0,
        besuchNr: replay.besuchNr[id],
        d: replay.d[id],
        h: hBekannt && h ? h(id) : null,
        kosten,
        istStart: x === e.start.x && y === e.start.y,
        istZiel: x === e.ziel.x && y === e.ziel.y,
      });
      for (const v of nachbarn(grid, id)) {
        if (!imFenster(v)) continue;
        kanten.push({ von: id, nach: v, gewicht: grid[Math.floor(v / e.breite)][v % e.breite], vorgaenger: replay.vorg[v] === id });
      }
    }
  }
  return { algo: e.algo, links, oben, spalten, zeilen, knoten, kanten, fokus: fokus(step), step };
}

/** Kurze Beschreibung für Screenreader (role="img"). */
export function miniGraphLabel(a: GraphAusschnitt): string {
  const ungerichtet = a.kanten.filter((k) => k.von < k.nach).length;
  return `Graph-Ausschnitt ab Feld (${a.links}|${a.oben}), ${a.spalten} × ${a.zeilen} Felder: ${a.knoten.length} Knoten, ${ungerichtet} Kanten.`;
}

// ---------- Zeichnen ----------

const zahl = (x: number): string => (x === Infinity ? "∞" : String(x));

function pfeil(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, spitze: number): void {
  const w = Math.atan2(y2 - y1, x2 - x1);
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.stroke();
  g.beginPath();
  g.moveTo(x2, y2);
  g.lineTo(x2 - spitze * Math.cos(w - 0.45), y2 - spitze * Math.sin(w - 0.45));
  g.lineTo(x2 - spitze * Math.cos(w + 0.45), y2 - spitze * Math.sin(w + 0.45));
  g.closePath();
  g.fill();
}

export interface MiniGraphOptionen {
  /** 0 … 1: Fortschritt des kurzen Übergangs nach einem Schritt; 1 = kein Übergang. */
  readonly uebergang: number;
  /** Ausschnitt vor dem Schritt; geänderte Knoten pulsieren während des Übergangs. */
  readonly vorher: GraphAusschnitt | null;
}

/**
 * Zeichnet den Ausschnitt: Knoten als Kreise (Füllung wie auf der Karte), im Kreis d bzw. bei A* f groß und g, h klein,
 * ein Etikett mit den Feldkosten (= Gewicht jeder Kante in diesen Knoten), Vorgängerkanten dick mit Pfeil,
 * die gerade geprüfte Kante u → v als Pfeil mit „+Kosten(v)“, Ringe aus fokus().
 */
export function zeichneMiniGraph(
  canvas: HTMLCanvasElement,
  a: GraphAusschnitt,
  f: Fokus,
  algo: Algo,
  opt: MiniGraphOptionen = { uebergang: 1, vorher: null },
): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const breite = Math.max(160, Math.round((canvas.clientWidth || 320) * dpr));
  if (canvas.width !== breite || canvas.height !== breite) {
    canvas.width = breite;
    canvas.height = breite;
  }
  const g = canvas.getContext("2d") as CanvasRenderingContext2D;
  const farbe = ALGO_INFO[algo].farbe;
  const zelle = breite / Math.max(a.spalten, a.zeilen);
  const r = zelle * 0.3;
  const schrift = Math.max(9, Math.round(zelle * 0.2));
  const mitte = (k: MiniKnoten): [number, number] => [(k.spalte + 0.5) * zelle, (k.zeile + 0.5) * zelle];
  const nachId = new Map(a.knoten.map((k) => [k.id, k]));
  const vorher = new Map((opt.vorher?.knoten ?? []).map((k) => [k.id, k]));

  g.clearRect(0, 0, breite, breite);
  g.fillStyle = "#ebebeb";
  g.fillRect(0, 0, breite, breite);
  // Lücken (Wasser, Fels): dezentes Raster, damit man sieht, dass hier kein Knoten ist.
  const belegt = new Set(a.knoten.map((k) => `${k.spalte},${k.zeile}`));
  g.fillStyle = "#d6d6d6";
  for (let y = 0; y < a.zeilen; y++)
    for (let x = 0; x < a.spalten; x++) {
      if (!belegt.has(`${x},${y}`)) g.fillRect(x * zelle + zelle * 0.2, y * zelle + zelle * 0.2, zelle * 0.6, zelle * 0.6);
    }

  // Kanten: einmal je Nachbarpaar dünn und grau.
  g.lineCap = "round";
  g.strokeStyle = "#9a9a9a";
  g.lineWidth = Math.max(1.5, zelle * 0.03);
  for (const k of a.kanten) {
    if (k.von > k.nach) continue;
    const p = nachId.get(k.von);
    const q = nachId.get(k.nach);
    if (!p || !q) continue;
    const [x1, y1] = mitte(p);
    const [x2, y2] = mitte(q);
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke();
  }

  // Vorgängerkanten (Entdeckungskanten) dick in der Verfahrensfarbe, Pfeil zum entdeckten Knoten.
  const kantePfeil = (p: MiniKnoten, q: MiniKnoten, anteil = 1) => {
    const [x1, y1] = mitte(p);
    const [x2, y2] = mitte(q);
    const l = Math.hypot(x2 - x1, y2 - y1);
    const ux = (x2 - x1) / l;
    const uy = (y2 - y1) / l;
    const sx = x1 + ux * r;
    const sy = y1 + uy * r;
    const ex = sx + (x2 - ux * (r + 2) - sx) * anteil;
    const ey = sy + (y2 - uy * (r + 2) - sy) * anteil;
    pfeil(g, sx, sy, ex, ey, zelle * 0.13);
  };
  g.strokeStyle = farbe;
  g.fillStyle = farbe;
  g.lineWidth = Math.max(3, zelle * 0.07);
  for (const k of a.kanten) {
    if (!k.vorgaenger) continue;
    const p = nachId.get(k.von);
    const q = nachId.get(k.nach);
    if (p && q) kantePfeil(p, q);
  }

  // Gerade geprüfte Kante u → v: gelb bzw. rot bei negativer Prüfung, mit „+Kosten(v)“.
  const u = f.bearbeitet !== null ? nachId.get(f.bearbeitet) : undefined;
  const v = f.geprueft !== null ? nachId.get(f.geprueft) : undefined;
  if (u && v) {
    const ton = f.negativ ? "#d62828" : "#e0a800";
    g.strokeStyle = "#1b1b1b";
    g.fillStyle = "#1b1b1b";
    g.lineWidth = Math.max(5, zelle * 0.1);
    kantePfeil(u, v, opt.uebergang);
    g.strokeStyle = ton;
    g.fillStyle = ton;
    g.lineWidth = Math.max(3, zelle * 0.06);
    kantePfeil(u, v, opt.uebergang);
  }

  // Knoten.
  for (const k of a.knoten) {
    const [x, y] = mitte(k);
    const alt = vorher.get(k.id);
    const geaendert = alt !== undefined && (alt.zustand !== k.zustand || alt.d !== k.d || alt.h !== k.h);
    const rk = geaendert ? r * (1 + 0.25 * (1 - opt.uebergang)) : r;
    let fuellung = "#b9b9b9";
    if (k.zustand === "weg") fuellung = "#ffffff";
    else if (k.besucht) fuellung = farbe;
    else if (k.zustand === "wartet") fuellung = "#f4f4f4";
    else if (k.zustand === "entdeckt") fuellung = "#e2e2e2";
    g.beginPath();
    g.arc(x, y, rk, 0, Math.PI * 2);
    g.fillStyle = fuellung;
    g.fill();
    g.lineWidth = k.zustand === "weg" ? Math.max(3, zelle * 0.06) : 2;
    g.strokeStyle = "#1b1b1b";
    if (k.zustand === "entdeckt") g.setLineDash([4, 3]);
    g.stroke();
    g.setLineDash([]);

    // Punkt: liegt in Warteschlange, Stapel oder Heap (wie auf der Karte).
    if (k.zustand === "wartet") {
      const p = Math.max(3, rk * 0.22);
      g.fillStyle = "#1b1b1b";
      g.fillRect(x + rk * 0.45 - p / 2 - 1, y + rk * 0.45 - p / 2 - 1, p + 2, p + 2);
      g.fillStyle = "#ffffff";
      g.fillRect(x + rk * 0.45 - p / 2, y + rk * 0.45 - p / 2, p, p);
    }
  }

  // Ringe aus fokus(): u weiß, v gelb bzw. rot bei negativer Prüfung.
  const ring = (k: MiniKnoten | undefined, ton: string) => {
    if (!k) return;
    const [x, y] = mitte(k);
    const rr = r * (1.28 + 0.2 * (1 - opt.uebergang));
    g.lineWidth = Math.max(5, zelle * 0.09);
    g.strokeStyle = "#1b1b1b";
    g.beginPath();
    g.arc(x, y, rr, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = Math.max(3, zelle * 0.055);
    g.strokeStyle = ton;
    g.stroke();
  };
  ring(u, "#ffffff");
  ring(v, f.negativ ? "#d62828" : "#ffd400");

  // Beschriftungen zuletzt, damit Ringe und Kanten sie nicht verdecken.
  for (const k of a.knoten) {
    const [x, y] = mitte(k);
    const alt = vorher.get(k.id);
    const geaendert = alt !== undefined && (alt.zustand !== k.zustand || alt.d !== k.d || alt.h !== k.h);
    const rk = geaendert ? r * (1 + 0.25 * (1 - opt.uebergang)) : r;
    // Zahlen im Knoten: d, bei A* f groß und g, h klein.
    g.fillStyle = "#111";
    g.textAlign = "center";
    g.textBaseline = "middle";
    if (algo === "astar" && k.d < Infinity) {
      // f groß im Kreis; g und h klein darunter, damit nichts über den Kreisrand ragt.
      const fWert = k.h === null ? null : k.d + k.h;
      g.font = `700 ${Math.round(schrift * 1.15)}px "JetBrains Mono", monospace`;
      g.fillText(fWert === null ? "f?" : zahl(fWert), x, y);
      etikett(
        g,
        x,
        y + rk + schrift * 0.55,
        `g${zahl(k.d)} h${k.h === null ? "?" : zahl(k.h)}`,
        "#ffffff",
        "#1b1b1b",
        Math.round(schrift * 0.7),
      );
    } else {
      g.font = `700 ${Math.round(schrift * 1.15)}px "JetBrains Mono", monospace`;
      g.fillText(zahl(k.d), x, y);
    }

    // Etikett: Kosten des Feldes = Gewicht jeder Kante in diesen Knoten.
    etikett(g, x - rk * 0.95, y - rk * 0.95, zahl(k.kosten), "#ffffff", "#1b1b1b", Math.round(schrift * 0.8));

    // Start und Ziel.
    if (k.istStart || k.istZiel) {
      etikett(
        g,
        x + rk * 0.95,
        y - rk * 0.95,
        k.istStart ? "S" : "Z",
        k.istStart ? "#4cd964" : "#ffcf33",
        "#1b1b1b",
        Math.round(schrift * 0.8),
      );
    }
  }

  // Gewicht der geprüften Kante u → v auf der Kantenmitte.
  if (u && v) {
    const [x1, y1] = mitte(u);
    const [x2, y2] = mitte(v);
    // Waagerecht: auf der Kantenmitte. Senkrecht: rechts daneben, sonst verdeckt es die g/h-Zeile.
    const senkrecht = x1 === x2;
    const tx = (x1 + x2) / 2 + (senkrecht ? zelle * 0.46 : 0);
    etikett(g, tx, (y1 + y2) / 2, `+${zahl(v.kosten)}`, f.negativ ? "#d62828" : "#ffd400", "#1b1b1b", schrift);
  }

  // Zielprüfung: Ziel-Symbol am geprüften Feld.
  const s = a.step;
  if (s?.art === "zielpruefung" && u) {
    const [x, y] = mitte(u);
    etikett(g, x, y + r * 1.75, s.ok ? "Ziel ✓" : "Ziel?", s.ok ? "#4cd964" : "#ffffff", "#1b1b1b", schrift);
  }
}

/** Kleines eckiges Etikett mit Rand, mittig um (x, y). */
function etikett(g: CanvasRenderingContext2D, x: number, y: number, text: string, grund: string, rand: string, groesse: number): void {
  g.font = `700 ${groesse}px "JetBrains Mono", monospace`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  const b = g.measureText(text).width + groesse * 0.6;
  const h = groesse * 1.35;
  g.fillStyle = rand;
  g.fillRect(Math.round(x - b / 2) - 1, Math.round(y - h / 2) - 1, Math.round(b) + 2, Math.round(h) + 2);
  g.fillStyle = grund;
  g.fillRect(Math.round(x - b / 2), Math.round(y - h / 2), Math.round(b), Math.round(h));
  g.fillStyle = "#111";
  g.fillText(text, x, y + 1);
}
