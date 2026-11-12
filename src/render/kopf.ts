// Grafik für den Kopf (eigene Entwürfe): schwebende Block-Insel mit leuchtendem Graphen als Logo
// und eine Pixel-Landschaft (Himmel, Wolken, Berge, Tannen) als Banner.

/** Reproduzierbarer Zufall, damit Logo und Banner bei jedem Laden gleich aussehen. */
function zufall(seed: number): () => number {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

function px(g: CanvasRenderingContext2D, x: number, y: number, farbe: string, b = 1, h = 1): void {
  g.fillStyle = farbe;
  g.fillRect(Math.round(x), Math.round(y), b, h);
}

const wahl = <T>(r: () => number, liste: readonly T[]): T => liste[Math.floor(r() * liste.length)];

/** Logo, 48 × 48 Pixel: isometrischer Block aus Gras und Erde, darauf ein Weg durch leuchtende Knoten bis zur Fahne. */
export function zeichneLogo(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 48;
  c.height = 48;
  const g = c.getContext("2d") as CanvasRenderingContext2D;
  const r = zufall(42);
  const cx = 24;
  const oben = 12;
  const halbB = 21;
  const halbH = 10.5;
  const tiefe = 13;
  // Unterkante je Spalte etwas ausgefranst: Die Insel schwebt.
  const fransen = Array.from({ length: 48 }, () => Math.floor(r() * 4));

  for (let y = 0; y < 48; y++) {
    for (let x = 0; x < 48; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - (oben + halbH);
      if (Math.abs(dx) / halbB + Math.abs(dy) / halbH <= 1) {
        px(g, x, y, wahl(r, ["#4caf3a", "#56bb40", "#45a234", "#5cc244", "#4caf3a"]));
        continue;
      }
      if (Math.abs(dx) > halbB) continue;
      // Oberkante der Seitenfläche an dieser Spalte.
      const kanteY = oben + halbH + (halbH * (halbB - Math.abs(dx))) / halbB;
      const tief = y + 0.5 - kanteY;
      if (tief < 0 || tief > tiefe - fransen[x]) continue;
      const links = dx < 0;
      let farbe: string;
      if (tief < 2 || (tief < 4 && r() < 0.5)) farbe = links ? "#3f9a31" : "#4caf3a";
      else if (r() < 0.08) farbe = links ? "#6d6d6d" : "#868686";
      else farbe = links ? wahl(r, ["#7a4e25", "#6c4421", "#83552a"]) : wahl(r, ["#9b6732", "#8a5a2b", "#a87238"]);
      px(g, x, y, farbe);
    }
  }

  // Punkt auf der Oberseite: u, v ∈ [0, 1].
  const iso = (u: number, v: number): [number, number] => [cx + (u - v) * halbB, oben + (u + v) * halbH];

  // Baum hinten links.
  const [bx, by] = iso(0.12, 0.42);
  px(g, bx - 1, by - 6, "#5b3a1f", 2, 7);
  for (let k = 0; k < 26; k++)
    px(g, bx - 4 + Math.floor(r() * 8), by - 13 + Math.floor(r() * 8), wahl(r, ["#2f8a36", "#3fa043", "#24702b", "#4fb24a"]));

  // Weg durch die Knoten, mit Schein.
  const knoten = [iso(0.78, 0.2), iso(0.62, 0.5), iso(0.32, 0.62), iso(0.55, 0.85)].map(
    ([x, y]) => [Math.round(x), Math.round(y)] as const,
  );
  for (let i = 1; i < knoten.length; i++) {
    const [x1, y1] = knoten[i - 1];
    const [x2, y2] = knoten[i];
    const n = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    for (let t = 0; t <= n; t++) {
      const x = x1 + ((x2 - x1) * t) / n;
      const y = y1 + ((y2 - y1) * t) / n;
      px(g, x - 1, y - 1, "rgba(255, 200, 40, 0.35)", 3, 3);
      px(g, x, y, "#ffd23a");
    }
  }
  for (const [x, y] of knoten) {
    px(g, x - 3, y - 3, "rgba(255, 200, 40, 0.3)", 7, 7);
    px(g, x - 2, y - 2, "#e09a10", 5, 5);
    px(g, x - 1, y - 2, "#ffe066", 3, 4);
    px(g, x - 1, y - 1, "#fff6c0", 2, 2);
  }

  // Fahne am letzten Knoten.
  const [fx, fy] = knoten[0];
  px(g, fx, fy - 12, "#9aa3ad", 1, 11);
  px(g, fx + 1, fy - 12, "#e23b2e", 6, 4);
  px(g, fx + 1, fy - 12, "#ff6a4d", 6, 1);
  px(g, fx + 5, fy - 9, "#b52a20", 2, 1);
  return c;
}

/**
 * Banner hinter dem Kopf: Nachthimmel in Stufen, Wolken, Blockberge und Tannen.
 * Gezeichnet in groben Pixeln (je 3 × 3 Bildschirmpixel) und auf die Breite des Kopfes angepasst.
 */
export function zeichneBanner(canvas: HTMLCanvasElement): void {
  const korn = 3;
  const b = Math.max(1, Math.ceil(canvas.clientWidth / korn));
  const h = Math.max(1, Math.ceil(canvas.clientHeight / korn));
  if (canvas.width === b && canvas.height === h) return;
  canvas.width = b;
  canvas.height = h;
  const g = canvas.getContext("2d") as CanvasRenderingContext2D;
  const r = zufall(7);

  const himmel = ["#0b1a33", "#0f2242", "#132b52", "#183563", "#1d4074", "#234c86"];
  himmel.forEach((f, i) => px(g, 0, Math.floor((i * h) / himmel.length), f, b, Math.ceil(h / himmel.length) + 1));
  for (let k = 0; k < b / 6; k++) px(g, Math.floor(r() * b), Math.floor(r() * h * 0.4), "rgba(255, 255, 255, 0.5)");

  // Wolken aus Rechtecken.
  for (let k = 0; k < Math.max(3, b / 70); k++) {
    const x = Math.floor(b * 0.35 + r() * b * 0.65);
    const y = Math.floor(2 + r() * h * 0.35);
    const w = 10 + Math.floor(r() * 14);
    px(g, x, y, "#2d5c97", w, 2);
    px(g, x + 3, y - 2, "#2d5c97", w - 7, 2);
    px(g, x + 1, y + 2, "#26518a", w - 2, 1);
  }

  // Berge: Höhe je Spalte als Summe von Spitzen, in Stufen zu 2 Pixeln.
  const spitzen = Array.from({ length: Math.max(4, Math.floor(b / 45)) }, () => ({
    x: b * 0.3 + r() * b * 0.75,
    hoehe: h * (0.45 + r() * 0.4),
    breite: 18 + r() * 26,
  }));
  for (let x = 0; x < b; x++) {
    let berg = 0;
    for (const s of spitzen) berg = Math.max(berg, s.hoehe - (Math.abs(x - s.x) * s.hoehe) / s.breite);
    berg = Math.floor(berg / 2) * 2;
    for (let y = h - berg; y < h; y++) {
      const hang = y - (h - berg);
      const farbe =
        hang < 2 && berg > h * 0.55
          ? "#d7dde6"
          : (x + y) % 7 === 0
            ? "#4f5d70"
            : (Math.floor(x / 3) + Math.floor(y / 3)) % 2
              ? "#5d6c80"
              : "#677890";
      px(g, x, y, farbe);
    }
  }

  // Tannen am unteren Rand.
  for (let x = Math.floor(b * 0.28); x < b; x += 5 + Math.floor(r() * 6)) {
    const t = 8 + Math.floor(r() * 10);
    const fuss = h - Math.floor(r() * 3);
    for (let i = 0; i < t; i++) {
      const halb = Math.floor((i * 4) / t) + (i % 3 === 2 ? 1 : 0);
      px(g, x - halb, fuss - t + i, i % 3 === 0 ? "#2c7a3a" : "#1f5a2e", 2 * halb + 1, 1);
    }
    px(g, x, fuss, "#4a2f17", 1, 2);
  }
}
