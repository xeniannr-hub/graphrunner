// Zeichnet eine Karte mit dem Zustand eines Replays: Gelände, besuchte und wartende Felder,
// Entdeckungskanten, gefundener Weg, Besuchsnummern oder Kosten, Fokusrahmen, Figur und Truhe.
import type { Replay } from "../replay/replay";
import type { FeldId, Pos, TerrainKey } from "../types";
import { ALGO_INFO, fokus } from "../ui/erklaerung";
import { TERRAIN_NACH_KEY } from "../world/terrain";
import { sprites, textur } from "./textures";

export type Zahlen = "keine" | "reihenfolge" | "kosten";

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
  /** Ausdauer seit „Loslaufen“; null, solange niemand läuft. */
  readonly laufzeit: number | null;
  readonly hover: Pos | null;
  /** Darf auf das Feld unter der Maus gebaut werden? */
  readonly hoverOk: boolean;
  /** Zeit in ms für kleine Bewegungen der Figur. */
  readonly zeit: number;
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
  // Gelände etwas abdunkeln, damit die Suche besser hervortritt.
  g.fillStyle = "rgba(12, 10, 8, 0.22)";
  g.fillRect(0, 0, c.width, c.height);
  hintergrund.set(schluessel, c);
  return c;
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

  // Besucht: Farbe des Verfahrens. Entdeckt und wartend: weiß mit Punkt (FA-04).
  ctx.fillStyle = rgba(farbe, 0.55);
  for (let v = 0; v < n; v++) if (r.besuchNr[v] > 0) ctx.fillRect((v % b) * ts, Math.floor(v / b) * ts, ts, ts);
  for (let v = 0; v < n; v++) {
    if (!r.wartet(v)) continue;
    const x = (v % b) * ts;
    const y = Math.floor(v / b) * ts;
    ctx.fillStyle = "rgba(255, 255, 255, 0.42)";
    ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    const p = Math.max(2, Math.round(ts / 6));
    ctx.fillRect(x + (ts - p) / 2, y + (ts - p) / 2, p, p);
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

  // Zahlen auf der Karte: Besuchsnummer (FA-06) oder bisherige Kosten d.
  if (bild.zahlen !== "keine" && ts >= 14) {
    ctx.font = `600 ${Math.round(ts * 0.42)}px "JetBrains Mono", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let v = 0; v < n; v++) {
      const wert = bild.zahlen === "reihenfolge" ? r.besuchNr[v] : r.d[v];
      if (bild.zahlen === "reihenfolge" ? wert === 0 : wert === Infinity) continue;
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

  // Schatztruhe als Ziel, Fahne am Start, Spielfigur (FA-24).
  const sp = sprites();
  const zx = (bild.ziel.x + 0.5) * ts;
  const zy = (bild.ziel.y + 0.5) * ts;
  const tb = ts * 0.95;
  ctx.drawImage(sp.truhe, zx - tb / 2, zy - (tb * sp.truhe.height) / sp.truhe.width / 2, tb, (tb * sp.truhe.height) / sp.truhe.width);
  const sx = (bild.start.x + 0.5) * ts;
  const sy = (bild.start.y + 0.5) * ts;
  ctx.drawImage(sp.fahne, sx - ts * 0.05, sy - ts * 0.95, ts * 0.6, ts * 0.6);
  let fx = sx;
  let fy = sy;
  let laeuft = false;
  if (bild.laufzeit !== null && e.gefunden && r.fertig) {
    const p = laeuferPos(bild, bild.laufzeit);
    fx = (p.x + 0.5) * ts;
    fy = (p.y + 0.5) * ts;
    laeuft = p.laeuft;
  }
  const gr = Math.max(ts * 1.05, 12);
  const hops = laeuft ? Math.abs(Math.sin(bild.zeit / 70)) * ts * 0.1 : 0;
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fillRect(fx - gr * 0.3, fy + gr * 0.36, gr * 0.6, gr * 0.1);
  ctx.drawImage(sp.figur, fx - gr / 2, fy - gr * 0.55 - hops, gr, gr);
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

