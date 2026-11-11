// A*: Bestensuche mit h(v) = Manhattan-Abstand × billigstes begehbares Feld (zulässig, konsistent).
import type { Grid, Pos } from "../types";
import { bestensuche } from "./bestensuche";
import type { SuchLauf } from "./ergebnis";
import { schaetzung } from "./raster";

export function astar(grid: Grid, start: Pos, ziel: Pos): SuchLauf {
  return bestensuche(schaetzung(grid, ziel), grid, start, ziel);
}
