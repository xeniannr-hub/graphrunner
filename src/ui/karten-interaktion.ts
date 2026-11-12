// Tooltip über jedem Feld (FA-23) und Bauen per Klicken oder Ziehen auf jeder Karte (FA-03).
import type { Replay } from "../replay/replay";
import type { Pos } from "../types";
import { BREITE, HOEHE } from "../world/terrain";
import { feldInfo } from "./erklaerung";
import { Z, baue, darfBauen, istEigeneWelt } from "./zustand";

let tooltip: HTMLDivElement | null = null;
let hover: { canvas: HTMLCanvasElement; pos: Pos } | null = null;

function tooltipElement(): HTMLDivElement {
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.className = "tooltip";
    tooltip.setAttribute("role", "tooltip");
    tooltip.hidden = true;
    document.body.append(tooltip);
  }
  return tooltip;
}

/** Feld unter der Maus, falls sie gerade über dieser Karte ist. */
export function hoverAuf(canvas: HTMLCanvasElement): Pos | null {
  return hover && hover.canvas === canvas ? hover.pos : null;
}

function feldBei(canvas: HTMLCanvasElement, ev: PointerEvent): Pos | null {
  const r = canvas.getBoundingClientRect();
  const x = Math.floor(((ev.clientX - r.left) / r.width) * BREITE);
  const y = Math.floor(((ev.clientY - r.top) / r.height) * HOEHE);
  return x >= 0 && y >= 0 && x < BREITE && y < HOEHE ? { x, y } : null;
}

/** Hält den Tooltip im sichtbaren Bereich, auch am rechten und unteren Rand. */
function platziere(t: HTMLDivElement, ev: PointerEvent): void {
  const abstand = 14;
  const b = t.offsetWidth;
  const h = t.offsetHeight;
  let x = ev.clientX + abstand;
  let y = ev.clientY + abstand;
  if (x + b > window.innerWidth - 4) x = ev.clientX - abstand - b;
  if (y + h > window.innerHeight - 4) y = ev.clientY - abstand - h;
  t.style.left = `${Math.max(4, x)}px`;
  t.style.top = `${Math.max(4, y)}px`;
}

export function verbindeKarte(canvas: HTMLCanvasElement, replay: () => Replay, geaendert: () => void): void {
  let malt = false;
  const zeige = (ev: PointerEvent, p: Pos) => {
    const t = tooltipElement();
    t.replaceChildren(
      ...feldInfo(Z.karte, p, Z.start, Z.ziel, replay(), Z.h).map((zeile, i) => {
        const d = document.createElement("div");
        if (i === 0) d.className = "tt-kopf";
        d.textContent = zeile;
        return d;
      }),
    );
    t.hidden = false;
    platziere(t, ev);
  };
  canvas.addEventListener("pointermove", (ev) => {
    const p = feldBei(canvas, ev);
    if (!p) return;
    const neu = !hover || hover.canvas !== canvas || hover.pos.x !== p.x || hover.pos.y !== p.y;
    hover = { canvas, pos: p };
    if (malt) baue(p);
    zeige(ev, p);
    if (neu) geaendert();
  });
  canvas.addEventListener("pointerdown", (ev) => {
    const p = feldBei(canvas, ev);
    if (!p || !istEigeneWelt()) return;
    malt = Z.werkzeug !== "start" && Z.werkzeug !== "ziel";
    if (malt) canvas.setPointerCapture(ev.pointerId);
    baue(p);
  });
  const ende = () => {
    malt = false;
  };
  canvas.addEventListener("pointerup", ende);
  canvas.addEventListener("pointercancel", ende);
  canvas.addEventListener("pointerleave", () => {
    malt = false;
    if (hover?.canvas === canvas) hover = null;
    tooltipElement().hidden = true;
    geaendert();
  });
}

/** Rahmen unter der Maus: rot, wenn das Bauwerkzeug dort nicht erlaubt ist. */
export function hoverOk(p: Pos | null): boolean {
  return p !== null && (!istEigeneWelt() || darfBauen(p));
}
