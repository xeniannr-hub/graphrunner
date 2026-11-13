// Zeichnet eine Karte mit dem Zustand eines Replays: Gelände, besuchte und wartende Felder,
// Entdeckungskanten, gefundener Weg, Besuchsnummern oder Kosten, Fokusrahmen, Figur und Truhe.
import type { Replay } from "../replay/replay";
import type { FeldId, Pos, TerrainKey } from "../types";
import { ALGO_INFO } from "../info/algo-info";
import { fokus } from "../info/fokus";
import { TERRAIN_NACH_KEY } from "../world/terrain";
import { frontUmriss } from "./front";
import { sprites, textur } from "./textures";

/** Zahlen auf der Karte: Besuchsnummer, d bzw. g, und nur bei A* h und f. */
export type Zahlen = "keine" | "reihenfolge" | "kosten" | "h" | "f";

export interface KartenBild {
  readonly karte: readonly (readonly TerrainKey[])[];
  /** Ändert sich, sobald die Karte bearbeitet wird (für den Gelände-Zwischenspeicher). */
  readonly version: number;
  readonly start: Pos;
  readonly ziel: Pos;
  readonly replay: Replay;
  readonly zahlen: Zahlen;
  /** Einzelansicht: Fokusrahmen und der Weg zum gerade bearbeiteten Feld. */
  readonly details: boolean;
  /** Vergleich: Suchfront als Umrisslinie in der Verfahrensfarbe (FA-31). */
  readonly front: boolean;
  /** Ausdauer seit „Loslaufen“; null, solange niemand läuft. */
  readonly laufzeit: number | null;
  readonly hover: Pos | null;
  /** Darf auf das Feld unter der Maus gebaut werden? */
  readonly hoverOk: boolean;
  /** Zeit in ms für kleine Bewegungen der Figur. */
  readonly zeit: number;
  /** A*-Schätzung für die Zahlen h und f. */
  readonly h: (id: FeldId) => number;
}

const hintergrund = new Map<string, HTMLCanvasElement>();

function gelaende(bild: KartenBild, ts: number): HTMLCanvasElement {
  const schluessel = `${bild.version}:${ts}`;
  const vorhanden = hintergrund.get(schluessel);
  if (vorhanden) return vorhanden;
  if (hintergrund.size > 24) hintergrund.clear();
  const h = bild.karte.length;
  const b = bild.karte[0].length;
  const c = document.createElement("canvas");
  c.width = b * ts;
  c.height = h * ts;
  const g = c.getContext("2d") as CanvasRenderingContext2D;
  g.imageSmoothingEnabled = false;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < b; x++) {
      const variante = (Math.imul(y * b + x, 2654435761) >>> 0) % 4;
      g.drawImage(textur(bild.karte[y][x], variante), x * ts, y * ts, ts, ts);
    }
  }
  // Gelände nur leicht abdunkeln: Die Suche soll hervortreten, das Gelände aber erkennbar bleiben.
  g.fillStyle = "rgba(12, 10, 8, 0.12)";
  g.fillRect(0, 0, c.width, c.height);
  hintergrund.set(schluessel, c);
  return c;
}

/** Darstellungen eines Feldes; dieselbe Funktion zeichnet Karte und Legende, damit beide gleich aussehen. */
export type FeldArt = "besucht" | "wartet" | "besuchtWartet" | "entdeckt";

/**
 * Besuchte Felder: Erst wird das Gelände aufgehellt, dann kommt die Farbe des Verfahrens darüber.
 * Ohne Aufhellen mischt sich die Farbe mit dem Gelände (Gelb auf Wiese wird oliv, Rosa auf Sumpf braun) und
 * passt nicht mehr zur Farbe des Verfahrens in Kopf, Tabs und Legende. So bleibt der Farbton erhalten,
 * das Muster des Geländes scheint aber noch durch.
 */
const AUFHELLEN = 0.4;
// Etwas zurückgenommen, damit die Umrisslinie der Suchfront (FA-31) hervortritt.
const DECKKRAFT = 0.6;

function zeichneFeld(ctx: CanvasRenderingContext2D, x: number, y: number, ts: number, art: FeldArt, farbe: string): void {
  if (art === "besucht" || art === "besuchtWartet") {
    ctx.fillStyle = `rgba(255, 255, 255, ${AUFHELLEN})`;
    ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = rgba(farbe, DECKKRAFT);
    ctx.fillRect(x, y, ts, ts);
  }
  if (art === "wartet") {
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.fillRect(x, y, ts, ts);
  }
  if (art === "wartet" || art === "besuchtWartet") {
    const p = Math.max(2, Math.round(ts / 5));
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(x + (ts - p) / 2 - 1, y + (ts - p) / 2 - 1, p + 2, p + 2);
    ctx.fillStyle = "#fff";
    ctx.fillRect(x + (ts - p) / 2, y + (ts - p) / 2, p, p);
  }
  if (art === "entdeckt") {
    const l = Math.max(1.5, ts * 0.1);
    ctx.setLineDash([Math.max(2, ts * 0.18), Math.max(2, ts * 0.12)]);
    ctx.lineWidth = l;
    ctx.strokeStyle = "#fff";
    ctx.strokeRect(x + l, y + l, ts - 2 * l, ts - 2 * l);
    ctx.setLineDash([]);
  }
}

export type SymbolArt = FeldArt | "weg" | "kante" | "front";

/**
 * Legendensymbol, gezeichnet wie auf der Karte: ein Wiesenfeld mit derselben Überlagerung (QA-05).
 * So stimmen die Farben in Legende und Karte immer überein.
 */
export function symbol(art: SymbolArt, farbe: string): HTMLCanvasElement {
  const ts = 16;
  const c = document.createElement("canvas");
  c.width = ts;
  c.height = ts;
  c.className = "symbol-legende";
  c.setAttribute("aria-hidden", "true");
  const g = c.getContext("2d") as CanvasRenderingContext2D;
  g.imageSmoothingEnabled = false;
  g.drawImage(textur("gras", 0), 0, 0, ts, ts);
  if (art === "weg" || art === "kante") {
    g.lineCap = "round";
    if (art === "weg") {
      g.strokeStyle = "#111";
      g.lineWidth = 7;
      g.beginPath();
      g.moveTo(2, 8);
      g.lineTo(14, 8);
      g.stroke();
    }
    g.strokeStyle = art === "weg" ? "#fff" : farbe;
    g.lineWidth = art === "weg" ? 3.5 : 2;
    g.beginPath();
    g.moveTo(2, 8);
    g.lineTo(14, 8);
    g.stroke();
  } else if (art === "front") {
    zeichneFeld(g, 0, 0, ts, "wartet", farbe);
    umrissLinie(
      g,
      [
        { x1: 0.15, y1: 0.15, x2: 0.85, y2: 0.15 },
        { x1: 0.85, y1: 0.15, x2: 0.85, y2: 0.85 },
        { x1: 0.85, y1: 0.85, x2: 0.15, y2: 0.85 },
        { x1: 0.15, y1: 0.85, x2: 0.15, y2: 0.15 },
      ],
      ts,
      farbe,
    );
  } else zeichneFeld(g, 0, 0, ts, art, farbe);
  return c;
}

/** Umrisslinie: dunkler Rand, darüber 2 px in der Verfahrensfarbe. Kanten in Feldkoordinaten, ts = Feldgröße. */
function umrissLinie(
  ctx: CanvasRenderingContext2D,
  kanten: readonly { x1: number; y1: number; x2: number; y2: number }[],
  ts: number,
  farbe: string,
): void {
  if (kanten.length === 0) return;
  const pfad = () => {
    ctx.beginPath();
    for (const k of kanten) {
      ctx.moveTo(k.x1 * ts, k.y1 * ts);
      ctx.lineTo(k.x2 * ts, k.y2 * ts);
    }
  };
  ctx.lineCap = "square";
  ctx.lineJoin = "miter";
  pfad();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 4;
  ctx.stroke();
  pfad();
  ctx.strokeStyle = farbe;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** Position der laufenden Figur: Jeder Schritt dauert so lange, wie das betretene Feld kostet. */
function laeuferPos(bild: KartenBild, t: number): { x: number; y: number; laeuft: boolean } {
  const weg = bild.replay.ergebnis.weg;
  let rest = t;
  for (let i = 1; i < weg.length; i++) {
    const k = TERRAIN_NACH_KEY[bild.karte[weg[i].y][weg[i].x]].kosten;
    if (rest < k) {
      const f = rest / k;
      return { x: weg[i - 1].x + (weg[i].x - weg[i - 1].x) * f, y: weg[i - 1].y + (weg[i].y - weg[i - 1].y) * f, laeuft: true };
    }
    rest -= k;
  }
  const letzt = weg[weg.length - 1];
  return { x: letzt.x, y: letzt.y, laeuft: false };
}

function zeichneKarte(ctx: CanvasRenderingContext2D, ts: number, bild: KartenBild): void {
  const r = bild.replay;
  const e = r.ergebnis;
  const b = e.breite;
  const n = b * e.hoehe;
  const farbe = ALGO_INFO[e.algo].farbe;
  const mitte = (id: FeldId): [number, number] => [((id % b) + 0.5) * ts, (Math.floor(id / b) + 0.5) * ts];
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(gelaende(bild, ts), 0, 0);

  // Zustände (FA-04), jeweils mit eigener Form, nicht nur Farbe. Die Farbe des Verfahrens markiert genau die Felder,
  // die als „besucht“ gezählt sind (Zähler und Tabelle zählen dieselben). Dazu kommt der Zustand in der Datenstruktur:
  // wartend = weißer Punkt (bei DFS auf farbigem Feld, weil DFS schon beim Auflegen besucht), entdeckt = gestrichelt.
  for (let v = 0; v < n; v++) {
    const z = r.zustand(v);
    if (z === "unbekannt") continue;
    const besucht = r.besuchNr[v] > 0;
    const x = (v % b) * ts;
    const y = Math.floor(v / b) * ts;
    if (z === "wartet") zeichneFeld(ctx, x, y, ts, besucht ? "besuchtWartet" : "wartet", farbe);
    else if (besucht) zeichneFeld(ctx, x, y, ts, "besucht", farbe);
    else if (z === "entdeckt") zeichneFeld(ctx, x, y, ts, "entdeckt", farbe);
  }

  // Entdeckungskanten: von jedem Feld zu seinem Vorgänger (FA-05).
  ctx.strokeStyle = rgba(farbe, 0.95);
  ctx.lineWidth = Math.max(1, ts * 0.1);
  ctx.beginPath();
  for (let v = 0; v < n; v++) {
    const p = r.vorg[v];
    if (p < 0) continue;
    const [x1, y1] = mitte(v);
    const [x2, y2] = mitte(p);
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
  }
  ctx.stroke();

  // Suchfront (FA-31): Umriss der wartenden Felder in der Verfahrensfarbe.
  if (bild.front) umrissLinie(ctx, frontUmriss(r), ts, farbe);

  const kette = (von: FeldId): FeldId[] => {
    const k: FeldId[] = [];
    for (let v = von; v !== -1; v = r.vorg[v]) k.push(v);
    return k;
  };
  const linie = (ids: readonly FeldId[]) => {
    ctx.beginPath();
    ids.forEach((id, i) => {
      const [x, y] = mitte(id);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  };
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const f = fokus(r.aktuell);
  if (r.gefunden) {
    // Gefundener Weg: weiß mit dunklem Rand (FA-05).
    ctx.strokeStyle = "#111";
    ctx.lineWidth = Math.max(4, ts * 0.42);
    linie(e.wegIds);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = Math.max(2, ts * 0.22);
    linie(e.wegIds);
  } else if (bild.details && f.bearbeitet !== null && r.d[f.bearbeitet] < Infinity) {
    // Weg vom Start zum gerade bearbeiteten Feld, gestrichelt.
    ctx.setLineDash([ts * 0.3, ts * 0.25]);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = Math.max(1.5, ts * 0.14);
    linie(kette(f.bearbeitet));
    ctx.setLineDash([]);
  }

  // Zahlen auf der Karte: Besuchsnummer (FA-06), bisherige Kosten d bzw. g, bei A* auch h und f.
  if (bild.zahlen !== "keine" && ts >= 14) {
    ctx.font = `600 ${Math.round(ts * 0.42)}px "JetBrains Mono", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let v = 0; v < n; v++) {
      let wert: number;
      if (bild.zahlen === "reihenfolge") wert = r.besuchNr[v] || Infinity;
      else if (bild.zahlen === "kosten") wert = r.d[v];
      // h ist für jedes begehbare Feld bekannt, auch ohne Suche: So sieht man die Schätzung selbst.
      else if (bild.zahlen === "h")
        wert = TERRAIN_NACH_KEY[bild.karte[Math.floor(v / b)][v % b]].kosten === Infinity ? Infinity : bild.h(v);
      else wert = r.d[v] + bild.h(v);
      if (wert === Infinity) continue;
      const [x, y] = mitte(v);
      ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
      ctx.fillText(String(wert), x + 1, y + 1);
      ctx.fillStyle = "#fff";
      ctx.fillText(String(wert), x, y);
    }
  }

  // Fokusrahmen: weiß = wird bearbeitet, gelb = wird geprüft, rot = Prüfung negativ.
  const rahmen = (id: FeldId, farbeRahmen: string, rand: number) => {
    ctx.strokeStyle = "#000";
    ctx.lineWidth = rand + 2;
    ctx.strokeRect((id % b) * ts + rand / 2, Math.floor(id / b) * ts + rand / 2, ts - rand, ts - rand);
    ctx.strokeStyle = farbeRahmen;
    ctx.lineWidth = rand;
    ctx.strokeRect((id % b) * ts + rand / 2, Math.floor(id / b) * ts + rand / 2, ts - rand, ts - rand);
  };
  if (bild.details && !r.fertig) {
    if (f.bearbeitet !== null) rahmen(f.bearbeitet, "#ffffff", Math.max(2, ts * 0.14));
    if (f.geprueft !== null) rahmen(f.geprueft, f.negativ ? "#ff4b4b" : "#ffe14d", Math.max(2, ts * 0.14));
  }

  if (bild.hover) {
    ctx.strokeStyle = bild.hoverOk ? "rgba(255, 255, 255, 0.9)" : "#ff4b4b";
    ctx.lineWidth = Math.max(1.5, ts * 0.08);
    ctx.strokeRect(bild.hover.x * ts + 1, bild.hover.y * ts + 1, ts - 2, ts - 2);
  }

  // Start und Ziel: Leuchtrahmen, große Fahne und Truhe, Beschriftung (FA-24).
  const sp = sprites();
  const sx = (bild.start.x + 0.5) * ts;
  const sy = (bild.start.y + 0.5) * ts;
  const zx = (bild.ziel.x + 0.5) * ts;
  const zy = (bild.ziel.y + 0.5) * ts;
  markiere(ctx, ts, bild.start, START_FARBE);
  markiere(ctx, ts, bild.ziel, ZIEL_FARBE);
  const tb = ts * 1.5;
  const th = (tb * sp.truhe.height) / sp.truhe.width;
  ctx.drawImage(sp.truhe, zx - tb / 2, zy - th / 2, tb, th);
  ctx.drawImage(sp.fahne, sx - ts * 0.1, sy - ts * 1.25, ts * 0.9, ts * 0.9);
  let fx = sx;
  let fy = sy;
  let laeuft = false;
  if (bild.laufzeit !== null && e.gefunden && r.fertig) {
    const p = laeuferPos(bild, bild.laufzeit);
    fx = (p.x + 0.5) * ts;
    fy = (p.y + 0.5) * ts;
    laeuft = p.laeuft;
  }
  const gr = Math.max(ts * 1.45, 14);
  const hops = laeuft ? Math.abs(Math.sin(bild.zeit / 70)) * ts * 0.1 : 0;
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fillRect(fx - gr * 0.3, fy + gr * 0.36, gr * 0.6, gr * 0.1);
  ctx.drawImage(sp.figur, fx - gr / 2, fy - gr * 0.55 - hops, gr, gr);
  schild(ctx, ts, bild.start, "START", START_FARBE, bild.karte[0].length);
  schild(ctx, ts, bild.ziel, "ZIEL", ZIEL_FARBE, bild.karte[0].length);
}

const START_FARBE = "#4cd964";
const ZIEL_FARBE = "#ffcf33";

/** Leuchtender Rahmen um ein Feld, etwas größer als das Feld selbst. */
function markiere(ctx: CanvasRenderingContext2D, ts: number, p: Pos, farbe: string): void {
  const d = Math.max(2, Math.round(ts * 0.16));
  ctx.lineWidth = d + 2;
  ctx.strokeStyle = "#000";
  ctx.strokeRect(p.x * ts - d / 2, p.y * ts - d / 2, ts + d, ts + d);
  ctx.lineWidth = d;
  ctx.strokeStyle = farbe;
  ctx.strokeRect(p.x * ts - d / 2, p.y * ts - d / 2, ts + d, ts + d);
}

/** Beschriftung über dem Feld (in der obersten Reihe darunter), seitlich in der Karte gehalten. */
function schild(ctx: CanvasRenderingContext2D, ts: number, p: Pos, text: string, farbe: string, spalten: number): void {
  const gr = Math.max(9, Math.round(ts * 0.55));
  ctx.font = `700 ${gr}px "Rubik", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const pad = Math.round(gr * 0.35);
  const b = ctx.measureText(text).width + 2 * pad;
  const h = gr + pad;
  const x = Math.min(Math.max((p.x + 0.5) * ts, b / 2 + 1), spalten * ts - b / 2 - 1);
  const oben = p.y >= 2;
  const y = oben ? p.y * ts - ts * 0.75 - h / 2 : (p.y + 1) * ts + ts * 0.35 + h / 2;
  ctx.fillStyle = "#000";
  ctx.fillRect(Math.round(x - b / 2) - 1, Math.round(y - h / 2) - 1, Math.round(b) + 2, Math.round(h) + 2);
  ctx.fillStyle = farbe;
  ctx.fillRect(Math.round(x - b / 2), Math.round(y - h / 2), Math.round(b), Math.round(h));
  ctx.fillStyle = "#14110d";
  ctx.fillText(text, x, y + 1);
}

/**
 * Passt die Leinwand an ihre angezeigte Breite an und zeichnet die Karte.
 * Die Kachelgröße ist eine ganze Zahl Gerätepixel, damit die Pixelgrafik scharf bleibt.
 */
export function zeichneLeinwand(canvas: HTMLCanvasElement, bild: KartenBild): void {
  const spalten = bild.karte[0].length;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const breite = canvas.clientWidth || (canvas.parentElement?.clientWidth ?? 320);
  const ts = Math.max(6, Math.floor((breite * dpr) / spalten));
  if (canvas.width !== spalten * ts) {
    canvas.width = spalten * ts;
    canvas.height = bild.karte.length * ts;
  }
  zeichneKarte(canvas.getContext("2d") as CanvasRenderingContext2D, ts, bild);
}
