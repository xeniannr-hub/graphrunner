// Tooltip über jedem Feld (FA-23) und Bauen auf jeder Karte (FA-03), mit Maus, Touch und Tastatur (QA-05):
// - Maus: Feldinfo beim Darüberfahren, Bauen durch Klicken oder Ziehen.
// - Touch: Antippen zeigt die Feldinfo (bleibt stehen, bis woanders hingetippt wird); in der Eigenen Welt wird gebaut.
// - Tastatur: Tab auf die Karte, Pfeiltasten bewegen einen Feld-Cursor, Enter oder Leertaste baut, Esc verlässt die Karte.
//   Die Feldinfo wird zusätzlich über eine aria-live-Region vorgelesen.
import type { Replay } from "../replay/replay";
import type { Pos } from "../types";
import { BREITE, HOEHE } from "../world/terrain";
import { feldInfo } from "./erklaerung";
import { Z, baue, darfBauen, istEigeneWelt } from "./zustand";

let tooltip: HTMLDivElement | null = null;
let ansage: HTMLDivElement | null = null;
let hover: { canvas: HTMLCanvasElement; pos: Pos } | null = null;
/** Tooltip per Antippen: bleibt stehen, bis woanders hingetippt wird. */
let festgehalten = false;

function tooltipElement(): HTMLDivElement {
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.className = "tooltip";
    tooltip.setAttribute("role", "tooltip");
    tooltip.id = "feld-tooltip";
    tooltip.hidden = true;
    document.body.append(tooltip);
    // Antippen außerhalb einer Karte schließt einen festgehaltenen Tooltip.
    document.addEventListener("pointerdown", (ev) => {
      if (festgehalten && !(ev.target instanceof HTMLCanvasElement)) verstecke();
    });
  }
  return tooltip;
}

/** Unsichtbare Region, über die Screenreader die Feldinfo des Tastatur-Cursors vorlesen. */
function ansageElement(): HTMLDivElement {
  if (!ansage) {
    ansage = document.createElement("div");
    ansage.className = "nur-vorlesen";
    ansage.setAttribute("aria-live", "polite");
    ansage.id = "feld-ansage";
    document.body.append(ansage);
  }
  return ansage;
}

function verstecke(): void {
  festgehalten = false;
  tooltipElement().hidden = true;
}

/** Feld unter der Maus oder dem Tastatur-Cursor, falls es zu dieser Karte gehört. */
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
function platziere(t: HTMLDivElement, px: number, py: number): void {
  const abstand = 14;
  const b = t.offsetWidth;
  const h = t.offsetHeight;
  let x = px + abstand;
  let y = py + abstand;
  if (x + b > window.innerWidth - 4) x = px - abstand - b;
  if (y + h > window.innerHeight - 4) y = py - abstand - h;
  t.style.left = `${Math.max(4, x)}px`;
  t.style.top = `${Math.max(4, y)}px`;
}

/** Bildschirmposition der Mitte eines Feldes (für Tastatur und Touch). */
function feldMitte(canvas: HTMLCanvasElement, p: Pos): [number, number] {
  const r = canvas.getBoundingClientRect();
  return [r.left + ((p.x + 0.5) / BREITE) * r.width, r.top + ((p.y + 0.5) / HOEHE) * r.height];
}

export function verbindeKarte(canvas: HTMLCanvasElement, replay: () => Replay, geaendert: () => void): void {
  let malt = false;
  canvas.tabIndex = 0;
  canvas.setAttribute("aria-describedby", "feld-ansage");
  const zeige = (p: Pos, px: number, py: number, vorlesen: boolean) => {
    const zeilen = feldInfo(Z.karte, p, Z.start, Z.ziel, replay(), Z.h);
    const t = tooltipElement();
    t.replaceChildren(
      ...zeilen.map((zeile, i) => {
        const d = document.createElement("div");
        if (i === 0) d.className = "tt-kopf";
        d.textContent = zeile;
        return d;
      }),
    );
    t.hidden = false;
    platziere(t, px, py);
    if (vorlesen) ansageElement().textContent = zeilen.join(". ");
  };
  const setze = (p: Pos) => {
    const neu = !hover || hover.canvas !== canvas || hover.pos.x !== p.x || hover.pos.y !== p.y;
    hover = { canvas, pos: p };
    if (neu) geaendert();
  };

  // Ein Mausklick soll der Karte keinen Tastaturfokus geben, sonst steuern die Pfeiltasten nicht mehr die Wiedergabe.
  canvas.addEventListener("mousedown", (ev) => ev.preventDefault());
  canvas.addEventListener("pointermove", (ev) => {
    if (ev.pointerType !== "mouse" && !malt) return;
    const p = feldBei(canvas, ev);
    if (!p) return;
    setze(p);
    if (malt) baue(p);
    zeige(p, ev.clientX, ev.clientY, false);
  });
  canvas.addEventListener("pointerdown", (ev) => {
    const p = feldBei(canvas, ev);
    if (!p) return;
    if (ev.pointerType !== "mouse") {
      // Touch und Stift: Antippen zeigt die Feldinfo an der Feldmitte und hält sie fest.
      setze(p);
      festgehalten = true;
      const [x, y] = feldMitte(canvas, p);
      zeige(p, x, y, true);
    }
    if (!istEigeneWelt()) return;
    malt = Z.werkzeug !== "start" && Z.werkzeug !== "ziel";
    if (malt) canvas.setPointerCapture(ev.pointerId);
    baue(p);
  });
  const ende = () => {
    malt = false;
  };
  canvas.addEventListener("pointerup", ende);
  canvas.addEventListener("pointercancel", ende);
  canvas.addEventListener("pointerleave", (ev) => {
    malt = false;
    if (ev.pointerType !== "mouse" || festgehalten) return;
    if (hover?.canvas === canvas) hover = null;
    verstecke();
    geaendert();
  });

  // Tastatur: Feld-Cursor. Pfeiltasten bleiben auf der Karte und spulen hier nicht die Wiedergabe.
  canvas.addEventListener("keydown", (ev) => {
    const alt = hoverAuf(canvas) ?? Z.start;
    let p: Pos | null = null;
    if (ev.key === "ArrowLeft") p = { x: Math.max(0, alt.x - 1), y: alt.y };
    else if (ev.key === "ArrowRight") p = { x: Math.min(BREITE - 1, alt.x + 1), y: alt.y };
    else if (ev.key === "ArrowUp") p = { x: alt.x, y: Math.max(0, alt.y - 1) };
    else if (ev.key === "ArrowDown") p = { x: alt.x, y: Math.min(HOEHE - 1, alt.y + 1) };
    else if ((ev.key === "Enter" || ev.key === " ") && istEigeneWelt()) {
      ev.preventDefault();
      ev.stopPropagation();
      baue(alt);
      const [x, y] = feldMitte(canvas, alt);
      zeige(alt, x, y, true);
      return;
    } else if (ev.key === "Escape") {
      canvas.blur();
      return;
    }
    if (!p) return;
    ev.preventDefault();
    ev.stopPropagation();
    setze(p);
    const [x, y] = feldMitte(canvas, p);
    zeige(p, x, y, true);
  });
  canvas.addEventListener("blur", () => {
    if (hover?.canvas === canvas) hover = null;
    verstecke();
    geaendert();
  });
}

/** Rahmen unter Maus oder Cursor: rot, wenn das Bauwerkzeug dort nicht erlaubt ist. */
export function hoverOk(p: Pos | null): boolean {
  return p !== null && (!istEigeneWelt() || darfBauen(p));
}
