# CLAUDE.md: GraphRunner

Diese Datei liest Claude Code zu Beginn jeder Sitzung. Sie gilt für alle vier Gruppenmitglieder und ist die verbindliche Beschreibung des Projekts. Wer etwas Grundsätzliches ändert (Typen, Regeln, Anforderungen), ändert zuerst diese Datei, und zwar per Pull Request.

---

## 1. Projektkontext

- **Was:** Hochschulprojekt im Modul *Theoretische Informatik* an der DHBW Ravensburg, Gruppe aus vier Studierenden. Thema: „Visualisierung grundlegender Graphensuchalgorithmen mit GUI oder Web-App“.
- **Lernziel:** BFS, DFS, Dijkstra und A* verständlich machen, vor allem die Frage: **Wann ist welcher Algorithmus der beste?**
- **Zielgruppe:** Studierende, die Graphensuche lernen, und Lehrende, die das Werkzeug in der Vorlesung zeigen. Die App muss **ohne Tutorial** verständlich sein.
- **Idee:** ein Pixel-Spiel „GraphRunner“ (Gamification) in einer Klötzchenwelt: Gelände als Blöcke, eine blockige Spielfigur. Für jeden Algorithmus gibt es eine Welt, deren Gelände zeigt, wann er am besten passt. Alle Grafiken sind eigene Entwürfe, nichts stammt aus Minecraft oder anderen Spielen (keine Texturen, Figuren, Logos oder Schriften daraus).
- **Name:** Das Spiel heißt nur „GraphRunner“ („Graph“ steingrau, „Runner“ orange). Designvorlage: die beiden Entwürfe in `docs/` (Logo und Oberfläche). Das Repo und die Live-Adresse behalten den Namen `kieselmark`.
- **Abgabe:** als **GitHub-Repo** mit laufender Live-Version auf GitHub Pages, dazu Projektbericht (PDF) und Präsentation. Die Anforderungs-IDs in Abschnitt 9 sind dieselben wie im Bericht (Anhang C). Code, Tests und Bericht verweisen aufeinander.

---

## 2. Regeln für Claude Code

1. **Weiterentwickeln, nicht neu bauen.** Das Repo enthält eine lauffähige Version. Ändere gezielt und behalte Struktur, Typen und Tests bei. `prototype/` ist der erste Prototyp, nur zum Nachschlagen: nicht ändern, nichts daraus importieren.
2. **Nur bauen, was in Abschnitt 9 steht.** Was dort als *Won't* steht, baust du nicht ein, auch nicht „nebenbei“.
3. **Erst fragen, dann bauen,** wenn eine Anforderung unklar ist oder dieser Datei widerspricht. Rate nicht.
4. **Kleine Schritte:** ein Thema pro Branch und Pull Request. Vor jedem Commit laufen `npm test` und `npm run build` fehlerfrei durch.
5. **Sollwerte in Tests legst du nicht fest** (Abschnitt 10). Du schreibst den Rechenweg als Kommentar und markierst neue Werte mit `// TODO: von Hand nachrechnen`.
6. **Bei Änderungen an Welten oder Texten:** Prüfe, ob die Aussagen in `worlds.ts` noch stimmen; die Tests in `worlds.test.ts` halten sie fest.
7. **Sprache:** Deutsch in Oberfläche, Kommentaren, Commit-Nachrichten und Dokumentation (einzige Ausnahme: der Untertitel „Explore the World of Pathfinding“). Bezeichner im Code ebenfalls deutsch (`kosten`, `besucht`, `weg`), Fachbegriffe wie `Step`, `Replay` und `Heap` bleiben englisch.
8. Nach jeder Aufgabe nennst du kurz: Was wurde geändert, welche Anforderung (FA/QA) betrifft es, was ist offen.

---

## 3. Tech-Stack

| Bereich | Festlegung | Warum |
| --- | --- | --- |
| Framework | **keins**: Vanilla TypeScript mit DOM-API | wenig Schichten, Algorithmen bleiben prüfbar |
| Sprache | **TypeScript**, `strict`, `noUnusedLocals`, `noUnusedParameters` | Fehler fallen schon beim Schreiben auf, auch die der KI |
| Build | **Vite** | schneller Dev-Server, einfacher Build |
| Rendering | **Canvas 2D**, Pixelgrafik ohne Glättung | die Karte hat 640 Felder; Canvas ist dafür schneller und einfacher als SVG |
| Tests | **Vitest**, Umgebung `node` | passt zu Vite, läuft ohne Browser |
| Schriften | lokal über `@fontsource` (Pixelify Sans, Rubik, JetBrains Mono), nur `latin` | keine externen Server zur Laufzeit |
| Backend | **keins** | alles läuft im Browser |
| Deployment | **GitHub Pages** über GitHub Actions | Abgabe als Repo mit Live-Link |
| Paketmanager | **npm**, `package-lock.json` wird eingecheckt, in CI `npm ci` | reproduzierbare Installation |
| Node | 22 | |
| Editor | VS Code für alle | gleiche Formatierung |

**Nicht verwenden:** React, Vue, Svelte, Game Engines (Phaser o. ä.), UI- oder CSS-Bibliotheken, CDNs, Backend, Datenbank, `localStorage`.

Befehle:

```bash
npm install        # einmalig
npm run dev        # Entwicklung
npm test           # Unit Tests im Terminal
npm run build      # Typprüfung + Build nach dist/
npm run typecheck  # nur Typprüfung
npm run format     # Formatieren mit Prettier (format:check prüft nur, läuft in der CI)
```

---

## 4. Architektur

**Grundregel: Die Algorithmen sind strikt von Oberfläche und Rendering getrennt.** Sie kennen weder DOM noch Canvas. Sie bekommen ein Raster und liefern Steps und ein Ergebnis. Nur deshalb laufen die Tests ohne Browser.

```text
src/
  types.ts            gemeinsame Typen (Abschnitt 5)
  main.ts             Einstieg: baut die UI, Zeichenschleife, Tastatur
  styles.css
  algorithms/         bfs, dfs, bestensuche (Dijkstra + A*), dijkstra, astar,
                      raster (Graph aus Karte, Nachbarreihenfolge, Schätzung),
                      heap, ergebnis (Generator-Typ, Aufzeichnung), pseudocode, index
                      + *.test.ts direkt daneben
  replay/             Replay: Steps vor- und zurückspielen
  world/              terrain (Gelände), worlds (die Welten als Textkarten)
  info/               algo-info (ALGO_INFO: Name, Farbe, Datenstruktur je Verfahren), fokus (markierte Felder eines Steps)
  render/             textures (Pixelgrafik), karte (Karte zeichnen), kopf (Banner, Logo)
  ui/                 zustand, wiedergabe (Wiedergabeleiste), vergleich, bewertung, einzel,
                      seitenleiste, karten-interaktion (Tooltip, Bauen), erklaerung
prototype/            erster Prototyp, nur Referenz
docs/                 screenshot.png
.github/workflows/    deploy.yml
```

| Modul | darf importieren |
| --- | --- |
| `types.ts` | nichts |
| `algorithms/` | nur `types` |
| `replay/` | `algorithms`, `types` |
| `world/` | `types` |
| `info/` | `types` |
| `render/` | `algorithms`, `replay`, `world`, `types`, `info` |
| `ui/` | alles |

Datenfluss: Karte (`world`) → `Grid` → Generator (`algorithms`) → Aufzeichnung (`SearchResult`) → `Replay` → `render` und `ui`.

---

## 5. Modell und Typen

### Geländekarte

- **Größe:** 32 × 20 Felder. Koordinaten `x` nach rechts, `y` nach unten, ab 0. Feldnummer `id = y * 32 + x`.
- **Graph:** Jedes begehbare Feld ist ein Knoten. **4er-Nachbarschaft**, also keine Diagonalen. Zwischen begehbaren Nachbarn gibt es gerichtete Kanten.
- **Kosten fürs Betreten:** Die Kante u → v kostet so viel wie das Feld v. Das Startfeld zählt nicht. Hin- und Rückweg können deshalb verschieden teuer sein.
- **Nachbarreihenfolge fest: oben, rechts, unten, links.** Sie ist nicht einstellbar, steht als `RICHTUNGEN` in `algorithms/raster.ts` und ist im README dokumentiert. Sie bestimmt den Verlauf der DFS und entscheidet bei den anderen Verfahren über Gleichstände.

| Gelände | `TerrainKey` | Ausdauer (Kosten) | Zeichen in Karten |
| --- | --- | --- | --- |
| Weg | `weg` | 1 | `=` |
| Brücke | `bruecke` | 1 | `#` |
| Wiese | `gras` | 2 | `.` |
| Wald | `wald` | 4 | `T` |
| Sumpf | `sumpf` | 7 | `%` |
| Wasser | `wasser` | unpassierbar (`Infinity`) | `~` |
| Fels | `fels` | unpassierbar (`Infinity`) | `^` |

Nur diese sieben. Jedes Gelände ist auf der Karte durch eigene Farbe **und** eigenes Muster erkennbar (16 × 16 Pixel); Fels hat einen Schatten an der Unterkante.

### Typen (`src/types.ts`, Änderungen nur gemeinsam)

- `Pos { x, y }`, `FeldId = number`
- `Grid = readonly (readonly number[])[]`: `grid[y][x]` = Kosten fürs Betreten, `Infinity` = unpassierbar
- `TerrainKey`, `Terrain { key, name, kosten }`
- `Algo = "bfs" | "dfs" | "dijkstra" | "astar"`
- `Step`: genau eine ausgeführte Pseudocode-Zeile, als **discriminated union** über `art`: Jede Art hat genau ihre Felder (z. B. `setze` immer `v`, `d`, `vorg`, `altD`, `altVorg`; `entnehmen` immer `u`), sodass der Compiler fehlende Felder meldet und keine `as`-Casts nötig sind. Arten: `init`, `setze`, `einfuegen`, `schaetze` (nur A*: h(v) berechnen), `schleife`, `entnehmen`, `oben`, `zielpruefung`, `nachbar`, `keinNachbar`, `markiertPruefung`, `veraltetPruefung`, `abschliessen`, `rechne`, `vergleiche`, `keinWeg`. `setze` speichert die alten Werte (`altD`, `altVorg`), damit das Zurückspulen exakt ist.
- `SearchResult { algo, breite, hoehe, start, ziel, gefunden, weg, wegIds, kosten, felder, besucht, besuchsIndizes, schritte }`. Ohne Weg gilt: `weg = []`, `kosten = felder = Infinity`.

---

## 6. Algorithmen

### Schrittweise Ausführung als Generator

Jedes Verfahren ist eine **Generatorfunktion** (`function*`) vom Typ `SuchLauf = Generator<Step, Abschluss>`. Jedes `next()` führt **genau eine Pseudocode-Zeile** aus und liefert den passenden `Step`. Am Ende gibt der Generator den `Abschluss` zurück (`gefunden`, Vorgänger).

```ts
SCHRITTE.bfs(grid, start, ziel)   // Generator, liefert Step für Step
SUCHE.bfs(grid, start, ziel)      // = aufzeichnen("bfs", SCHRITTE.bfs(...)) → SearchResult
```

`aufzeichnen()` sammelt alle Steps in `SearchResult.schritte`. Die Oberfläche arbeitet mit dieser Aufzeichnung, weil sie auch **zurückspulen** können muss, was ein Generator allein nicht kann. `Replay` spielt die Aufzeichnung vor und zurück. Es führt dabei auch den **Inhalt der Datenstruktur** (Warteschlange, Stapel, Heap-Einträge mit g und Priorität; `inhalt()`, `veraltet()`), den **Zustand jedes Feldes** (`zustand()`) und Kennzahlen für die Erkennungsmerkmale (`ueberholt`, `verbesserungen`, `ruecksprunge`, `entnommenePrio`).

### Zustände eines Feldes (FA-04)

| Zustand | Bedeutung | Darstellung |
| --- | --- | --- |
| unbekannt | d = ∞ | nur Gelände |
| entdeckt | d gesetzt, noch nicht in der Datenstruktur (eine Codezeile lang, nur in der Einzelansicht) | gestrichelter weißer Rahmen |
| wartet | liegt in Warteschlange, Stapel oder Heap | heller Schleier mit weißem Punkt |
| expandiert | BFS: entnommen; DFS: vom Stapel genommen (alle Nachbarn geprüft); Dijkstra/A*: abgeschlossen | durchscheinende Farbe des Verfahrens |
| Weg | Teil des gefundenen Weges | weiße Linie mit dunklem Rand |

### Die vier Verfahren

| Verfahren | Datenstruktur | Findet | Besuch zählt beim |
| --- | --- | --- | --- |
| BFS | Warteschlange (FIFO) | kürzesten Weg nach Anzahl der Kanten (Gewichte ignoriert) | Entnehmen |
| DFS | Stapel, iterativ: oben ansehen → nächster Nachbar → vorstoßen oder zurückspringen | irgendeinen Weg | Auflegen |
| Dijkstra | binärer Min-Heap, *lazy deletion* | günstigsten Weg | Abschließen |
| A* | wie Dijkstra mit f = g + h | günstigsten Weg | Abschließen |

- Dijkstra und A* teilen sich den Kern `bestensuche(h, …)`; Dijkstra ist A* mit h = 0 (`h = null`: es wird nichts geschätzt). **Bei A* ist das Berechnen von h(v) ein eigener Rechenschritt** (Step `schaetze`, eigene Pseudocode-Zeilen `hs ← h(s)` und `hv ← h(v)`): Die Schätzung kostet Arbeit, und nur so zeigt „Rechenschritte“, was A* für weniger besuchte Felder bezahlt.
- Gleichstand im Heap: Der ältere Eintrag gewinnt (`seq`). Jeder Lauf ist damit reproduzierbar (QA-02).
- **A*-Heuristik:** `h(v) = Manhattan-Abstand(v, Ziel) × billigstes begehbares Feld der Karte`.
  - **Hängt von der ganzen Karte ab:** Ein einziges billiges Feld irgendwo (z. B. ein Weg-Feld in der Eigenen Welt) senkt den Faktor von 2 auf 1 und halbiert h überall; A* lenkt dann schwächer. Die Oberfläche erklärt das im Heuristik-Kasten (mit Warnung, wenn ≤ 3 Felder den Faktor bestimmen) und im Lernpunkt der Eigenen Welt; ein Test hält es fest.
  - **Zulässig:** Jeder Weg braucht mindestens so viele Schritte wie der Manhattan-Abstand, und jeder Schritt kostet mindestens das billigste Feld. Die Schätzung liegt also nie zu hoch, und A* findet immer den günstigsten Weg.
  - **Konsistent:** Ein Schritt ändert den Abstand um genau 1 und kostet mindestens das Minimum.
  - Warum nicht Euklid: Auch Euklid wäre zulässig, liegt bei 4er-Nachbarschaft aber immer unter Manhattan und lenkt A* deshalb schwächer.
  - Warum mal Minimum: Reiner Manhattan-Abstand wäre nur zulässig, solange das billigste Feld 1 kostet. In der Eigenen Welt ohne Weg kostet das billigste Feld 2.
- **Kantengewichte ≥ 0.** Negative Kosten werfen `RangeError` („Negative Kantengewichte sind nicht erlaubt …“), Kosten 0 sind erlaubt und werden korrekt behandelt (Tests in `dijkstra.test.ts`, Zufallskarten mit 0 in `vergleich.test.ts`). Weitere ungültige Eingaben (leere Karte, Start außerhalb oder auf Hindernis) werfen ebenfalls `RangeError` mit deutscher Meldung.
- **Folge der Kostenregel:** Alle Kanten in ein Feld kosten gleich viel. Weil Dijkstra mit aufsteigendem d expandiert, ist der erste Fund eines Feldes schon der günstigste; Dijkstra verbessert ein gesetztes d hier nie (Test in `replay.test.ts`). A* kann es, weil es nach f expandiert. Dijkstra unterscheidet sich von BFS deshalb an der **Entnahmereihenfolge** (Priorität d statt FIFO), sichtbar nur auf Karten mit verschiedenen Kosten.
- Heuristik-Tests (`astar.test.ts`): zulässig (h ≤ tatsächliche Restkosten) und konsistent auf Zufallskarten mit Kosten 0 bis 7.
- `pseudocode.ts` enthält den Pseudocode je Verfahren. `Step.zeile` zeigt auf die passende Zeile, ein Test prüft das.

---

## 7. Welten

Genau fünf Welten in `world/worlds.ts`, jede als Textkarte (20 Zeilen × 32 Zeichen, Zeichen aus Abschnitt 5) mit `titel`, `algo`, `wann`, `warum`, `start` und `ziel`. `wann` ergänzt den Satz „*X* ist am besten, wenn …“, `warum` begründet es in zwei bis drei Sätzen.

| Welt | Algo | „… am besten, wenn …“ | Messbare Bedingung (Test) |
| --- | --- | --- | --- |
| Ruinenhof | BFS | jeder Schritt gleich viel kostet | offener Hof, nur Wiese und Mauerreste, Start und Ziel in gegenüberliegenden Ecken; BFS sucht > 60 % der Felder ab; alle optimalen Kosten gleich; A* und Dijkstra besuchen > 85 % von BFS; BFS braucht die wenigsten Rechenschritte; DFS-Weg > 3 × so lang (456 statt 50), mit 8 von 24 Reihenfolgen wäre DFS direkt am Ziel |
| Stollen | DFS | es nur einen Weg gibt, das Ziel tief liegt und DFS die passenden Gänge zuerst probiert | perfektes Labyrinth; alle finden denselben Weg; DFS besucht < 70 % jedes anderen; Modellannahme: nur 12 von 24 Nachbarreihenfolgen erfüllen das, mit „rechts“ vorne > 240 Felder |
| Flussmoor | Dijkstra | Felder verschieden viel kosten und eine Schätzung kaum hilft | A*-Kosten = Dijkstra; A* besucht > 95 % von Dijkstra; Dijkstra braucht weniger Rechenschritte als A*; BFS zahlt > 1,5 ×, DFS > 2 × |
| Handelsstraße | A* | das Ziel weit weg liegt und seine Richtung bekannt ist | A*-Kosten = Dijkstra; A* besucht < 25 % von Dijkstra und am wenigsten; A* braucht < 25 % der Rechenschritte von Dijkstra; BFS zahlt > 1,2 × |
| Eigene Welt | – | selbst bauen | startet als leere Wiese |

Wichtig für alle Texte: Bei zulässiger, konsistenter Schätzung kann Dijkstra nie weniger Felder besuchen als A*. „Am besten“ heißt in Ruinenhof und Flussmoor deshalb: optimaler Weg mit den **wenigsten Rechenschritten** (gemessen, nicht „ohne Schätzung“). Kein Text behauptet etwas, das die Messung nicht zeigt.

### Modellannahmen (offen benennen, auch im Bericht)

1. **Rechenschritte = ausgeführte Pseudocode-Zeilen.** Jede Zeile zählt 1, auch eine Heap-Operation (eigentlich O(log n)) und das Berechnen von h(v). Dijkstra hat pro Nachbar eine Zeile mehr als BFS (`rechne` und `vergleiche` statt einer Prüfung). Dass BFS im Ruinenhof am wenigsten rechnet (6.982 statt 9.928 bei Dijkstra), folgt also teilweise daraus, wie der Pseudocode geschrieben ist. Die Oberfläche nennt das unter der Ergebnistabelle.
2. **Nachbarreihenfolge oben, rechts, unten, links.** Der DFS-Vorteil im Stollen hängt daran: Nur 12 von 24 Reihenfolgen erfüllen „< 70 % jedes anderen“; beginnt sie mit „rechts“, besucht DFS 241 bis 273 statt 61 Felder. Im Ruinenhof liefe DFS mit 8 der 24 Reihenfolgen (z. B. unten, links, oben, rechts) direkt zum Ziel, mit der festen Reihenfolge findet es einen Weg von 456 statt 50 Kanten. DFS hat im Stollen also Glück. Tests in `worlds.test.ts` halten das fest; die Texte der Welten sagen es.

---

## 8. Oberfläche (Kurzfassung)

- **Kopf:** Banner mit Pixel-Landschaft bei Tag, Logo (schwebende Block-Insel mit leuchtendem Graphen), „GraphRunner“, Untertitel „Explore the World of Pathfinding“ (ausdrücklich gewünscht, einzige englische Zeile, `lang="en"`), Umschalter **Alle vergleichen** / **Einzelansicht**.
- **Seitenleiste:** Weltliste mit Algorithmus-Kürzel; darunter fett „*X* ist am besten, wenn …“ plus Begründung und, falls die Welt einen hat, einen **Lernpunkt** (`lernpunkt` in `worlds.ts`: Ruinenhof und Stollen zur Nachbarreihenfolge der DFS, Eigene Welt zur Abhängigkeit der A*-Schätzung von der ganzen Karte); das Bewertungskriterium steht als `kriterium` direkt in der Welt; bei der Eigenen Welt das Panel „Bauen“; sonst „Ausdauer pro Feld“.
- **Wiedergabeleiste** (`ui/wiedergabe.ts`): **eine Komponente für beide Ansichten.** Reihenfolge: `|◀` · `◀` · Abspielen/Pause/Nochmal · `▶` · Tempo mit Anzeige „n Zeilen/s“ bzw. „n Felder/s“ · Fortschrittsregler „Zeile k von n“ (Einzelansicht: ausgeführte Codezeilen) bzw. „Feld k von n“ (Vergleich: besuchte Felder je Verfahren). Der Erklärsatz nennt die „Pseudocode-Zeile n“. Nur in der Einzelansicht kommt `▶|` (Zum Ende) dazu, nur in Alle vergleichen „Loslaufen“. Die Legende steht in der Steuerleiste. Tastatur: `←`/`→` Schritt, Leertaste Abspielen, `Pos1` zum Anfang, `Ende` zum Ende (nur Einzelansicht). Die Tabs der Einzelansicht folgen dem WAI-ARIA-Tab-Muster mit Roving tabindex (Pfeiltasten, Pos1, Ende); ein Tabwechsel hält die Wiedergabe an, mit Maus wie mit Tastatur.
- **Alle vergleichen:** vier Karten im 2 × 2-Raster. Ein Schritt bedeutet: jedes Verfahren besucht ein weiteres Feld. Kopf je Karte: Name, Kurzbeschreibung, Marke „ignoriert Gewichte“ (BFS und DFS auf gewichteter Karte), Zähler „besucht“, Datenstruktur (Größe und nächster Eintrag), Status. BFS-Ergebnis heißt „kürzester Weg nach Kantenzahl“. Darunter das Ergebnis (Regeln in `ui/bewertung.ts`):
  - Zeile „Beste Wahl in dieser Welt: *X*, weil …“ aus `besteWahl(welt, ergebnisse)` mit festem Kriterium je Welt: Ruinenhof optimaler Weg und wenigste Rechenschritte (BFS); Stollen optimaler Weg und wenigste besuchte Felder (DFS); Flussmoor optimale Kosten und wenigste Rechenschritte (Dijkstra), der Satz nennt zusätzlich, dass A* weniger Felder besucht, aber für jedes eingefügte Feld h(v) berechnet; Handelsstraße optimale Kosten und wenigste besuchte Felder (A*). Darunter steht das Kriterium der Welt in Worten. Ein Test prüft je Welt, dass beste Wahl, ★ und Fazit sich nicht widersprechen. In der Eigenen Welt gibt es keine solche Zeile.
  - Fazit-Absatz in ganzen Sätzen. „Am wenigsten gesucht hat *X*“ steht nur, wenn *X* einen optimalen Weg gefunden hat; sonst z. B. „DFS hat zwar nur 70 Felder angesehen, zahlt aber 176 statt 64 Ausdauer.“
  - Tabelle: besuchte Felder, Rechenschritte (ausgeführte Pseudocode-Zeilen, keine Millisekunden), Weglänge in Kanten, Ausdauer des Weges, Platz beim Loslaufen.
  - ★ bei Weglänge und Ausdauer: kleinster Wert unter den Verfahren mit Weg. ★ bei besuchten Feldern und Rechenschritten: kleinster Wert nur unter den Verfahren mit optimalem Weg (Ruinenhof: minimale Feldzahl, sonst minimale Ausdauer). Ohne Weg steht kein ★ in der Tabelle.
- **Einzelansicht = Debugger für Algorithmen:** Tabs für die vier Verfahren, Auswahl „Zahlen auf der Karte“ (Besuchsnummer, d bzw. g; bei A* zusätzlich h und f). Ein Schritt bedeutet: eine Codezeile. Hinweis über der Karte: bei BFS/DFS auf gewichteter Karte eine Warnung, dass Kantengewichte ignoriert werden (mit Kostenvergleich zu Dijkstra), sonst ein Info-Hinweis. Links die Karte, darunter:
  - **Datenstruktur** (FA-12): Warteschlange (vorne → hinten) bzw. Stapel (oben → unten) als Slots mit d; Prioritätswarteschlange als Tabelle in Entnahmereihenfolge, Dijkstra mit d und Einfügenummer, A* mit g, h und f einzeln; nächster Eintrag, gerade eingefügter und veraltete Einträge markiert; „Gerade entnommen“.
  - **„Woran erkenne ich …?“**: beobachtbare Merkmale mit Zahlen aus dem laufenden Replay, bei Dijkstra die Antwort auf „Woran erkenne ich, dass hier Dijkstra und nicht eine Breitensuche läuft?“ (Überholungen mit konkretem Beispiel, monoton steigende d).

  Rechts daneben:
  - Steckbrief, bei allen vier gleich: Verfahren · Prinzip · Wählt als Nächstes · Findet · Ergebnis; bei A* zusätzlich die offengelegte Heuristik mit Formel, Begründung (Manhattan, Faktor billigstes Feld, zulässig, konsistent) und Prüfung am Start
  - aktueller Erklärsatz mit „Zeile n“ (bei A* mit f = g + h ausgerechnet, bei Verbesserungen alter und neuer Wert)
  - Pseudocode mit hervorgehobener Zeile
  - **Ereignisprotokoll**: alle relevanten Aktionen (einfügen, entnehmen, verbessern mit altem/neuem d und Vorgänger, abschließen, veraltete Einträge, Rücksprünge, Ziel); Klick springt zu diesem Schritt
  - Besuchsreihenfolge

  Karte und Erklärsatz lesen die markierten Felder aus derselben Funktion `fokus()`. Weißer Rahmen: wird bearbeitet. Gelber Rahmen: wird geprüft, rot bei negativer Prüfung.
- **Tooltip** über jeder Karte in beiden Ansichten: Koordinate (ggf. Start/Ziel), Kategorie, Gewichtung bzw. „nicht begehbar“, bei begehbaren Feldern die ausgehenden Kanten mit Gewicht („Kanten: ↑ 2 · → 4 · ↓ – · ← 2“, „–“ = keine Kante), Zustand mit Besuch-Nr., dazu d (BFS/DFS: Kanten ab Start) bzw. bei A* g, h und f einzeln, und der Vorgänger. So wird die Karte als Graph aus Knoten und Kanten sichtbar. Feldinfo gibt es per Maus, per Antippen (bleibt stehen, bis woanders hingetippt wird) und per Tastatur: Tab auf die Karte, Pfeiltasten bewegen einen Feld-Cursor, Enter/Leertaste baut, Esc verlässt die Karte; eine `aria-live`-Region liest die Feldinfo vor, `aria-label` beschreibt den Stand jeder Karte (`kartenBeschreibung`).
- **Bauen:** Start, Ziel und die sieben Geländearten; klicken, ziehen, antippen oder per Tastatur, auf jeder Karte. Nur in der Eigenen Welt haben die Karten `touch-action: none` (zum Malen); sonst scrollt eine Wischgeste die Seite. Start und Ziel nur auf begehbare Felder, nie aufeinander. Knopf „Karte leeren“ setzt alle Felder auf Wiese, Start und Ziel bleiben. Nach jeder Änderung rechnen alle Verfahren sofort neu.
- **Darstellung:** nur **helles** Schema: Untergrund Himmelblau bis Sandhell, Flächen warmes Papierweiß mit Block-Abschrägung und grüner Grasnarbe oben (Flächen eines Verfahrens tragen stattdessen dessen Farbe), Hauptaktion „Abspielen“ grün, Auswahl gelb, Fokus blau; orange Linie unter dem Kopf, Pixelwelt im Klötzchenstil. Oberfläche im Blockstil (an Minecraft angelehnt, aber eigener Entwurf): keine runden Ecken, Flächen und Knöpfe mit Pixel-Abschrägung (hell oben links, dunkel unten rechts), gedrückte Knöpfe eingedrückt, Datenstruktur als Inventar-Slots, harte Pixel-Schatten. Besuchte Felder überdecken das Gelände nicht: Muster und Farbe des Geländes bleiben erkennbar. **Die Farbe des Verfahrens markiert genau die Felder, die als „besucht“ gezählt sind** (Zähler, Tabelle, Besuchsreihenfolge); bei DFS also schon beim Auflegen, Felder auf dem Stapel tragen zusätzlich den weißen Punkt. Damit der Farbton zur Verfahrensfarbe passt und sich nicht mit dem Gelände mischt, wird das Gelände unter besuchten Feldern erst aufgehellt (40 % Weiß), dann mit 72 % Deckkraft eingefärbt; das Farbfeld im Kopf jeder Karte ist dasselbe Symbol. Legendensymbole werden mit derselben Funktion gezeichnet wie die Karte (`symbol()` in `render/karte.ts`). Start und Ziel sind groß und beschriftet. Feste Farben: BFS `#ff4d73`, DFS `#a56bff`, Dijkstra `#ff8a2b`, A* `#ffd400`. Pixelschrift nur in Überschriften. Ab 400 px Breite kein horizontales Scrollen. Auf schmalen Bildschirmen (≤ 960 px) steht die Reihenfolge Weltliste (und Bauen) → Steuerung und Karten → Begründung und Ausdauer, damit „Abspielen“ früh kommt. Fokusrahmen und `aria`-Attribute.

---

## 9. Anforderungen (MoSCoW)

IDs wie im Bericht (Anhang C). **Must** = ohne sie ist das Ergebnis unbrauchbar, **Should** = wichtig, **Could** = wünschenswert, **Won't** = bewusst nicht umgesetzt. Die Spalte „Umsetzung“ zeigt, wo die Anforderung im Code steckt.

### Funktionale Anforderungen

| ID | Anforderung | Prio | Umsetzung |
| --- | --- | --- | --- |
| FA-01 | Ablauf der BFS Schritt für Schritt animiert darstellen | Must | `algorithms/bfs.ts`, `ui/einzel.ts` |
| FA-02 | Ablauf der DFS Schritt für Schritt animiert darstellen | Must | `algorithms/dfs.ts`, `ui/einzel.ts` |
| FA-03 | Eigene Graphen erstellen: als Karte bauen, also Gelände malen sowie Start und Ziel setzen (die Karte ist ein gewichteter Graph, Abschnitt 5) | Must | Eigene Welt, `ui/seitenleiste.ts`, `ui/karten-interaktion.ts` |
| FA-04 | Zustände unterscheiden: entdeckt, wartet in der Datenstruktur, expandiert, Teil des finalen Weges | Must | `replay/` (`zustand`), `render/karte.ts`, Legende |
| FA-05 | Entdeckungskanten (Vorgänger) und gefundenen Weg hervorheben | Must | `render/karte.ts` |
| FA-06 | Suchreihenfolge anzeigen: Besuchsnummer auf der Karte und als Liste | Must | Einzelansicht, Tooltip |
| FA-07 | Dijkstra auf der gewichteten Karte darstellen | Should | `algorithms/dijkstra.ts` |
| FA-08 | A* mit zulässiger Heuristik darstellen | Should | `algorithms/astar.ts`, Abschnitt 6 |
| FA-09 | Vor- und zurückschalten (Einzelansicht je Codezeile, Vergleich je besuchtem Feld), zum Anfang und Ende springen, Abspielen mit einstellbarem Tempo | Should | `replay/`, `ui/wiedergabe.ts` |
| FA-11 | Pseudocode mit aktueller Zeile und Erklärsatz (Screenreader sagt ihn nur bei angehaltener Wiedergabe an) | Should | `algorithms/pseudocode.ts`, `ui/erklaerung.ts` |
| FA-12 | Datenstruktur anzeigen: Warteschlange, Stapel bzw. Prioritätswarteschlange (bei A* mit g, h, f) | Should | `replay/` (`inhalt`), `ui/einzel.ts` |
| FA-25 | Ereignisprotokoll mit allen relevanten Aktionen, Klick springt zum Schritt | Should | `ui/erklaerung.ts` (`protokoll`), `ui/einzel.ts` |
| FA-26 | Erkennungsmerkmale je Verfahren mit Belegen aus dem Lauf („Woran erkenne ich Dijkstra statt BFS?“) | Should | `ui/erklaerung.ts` (`merkmal`) |
| FA-27 | BFS/DFS: Hinweis, dass Kantengewichte ignoriert werden; BFS-Ergebnis als kürzester Weg nach Kantenzahl | Should | `ui/einzel.ts`, `ui/vergleich.ts`, `ui/bewertung.ts` |
| FA-28 | A*: Heuristik offenlegen, g, h und f einzeln darstellen | Should | `ui/einzel.ts`, `ui/erklaerung.ts`, Zahlen auf der Karte |
| FA-13 | Alle vier Verfahren gleichzeitig auf derselben Karte, je Schritt ein besuchtes Feld pro Verfahren | Should | `ui/vergleich.ts` |
| FA-14 | Statistik je Verfahren gegenüberstellen: besuchte Felder (Suchaufwand), Rechenschritte, Weglänge, Wegkosten; Fazit in Sätzen, beste Wahl je Welt | Should | Ergebnis-Tabelle, `ui/bewertung.ts` |
| FA-16 | Karte mit Geländekosten als gewichteter Graph; Start, Ziel und Gelände veränderbar | Must | `world/`, `algorithms/raster.ts` |
| FA-21 | Gefundene Wege ablaufen lassen („Loslaufen“), Platzierung nach Kosten | Could | `ui/vergleich.ts` |
| FA-22 | Je Algorithmus eine Welt, deren Gelände zeigt, wann er am besten passt, mit kurzer Begründung | Must | `world/worlds.ts`, Seitenleiste |
| FA-23 | Tooltip über jedem Feld in beiden Ansichten: Koordinate, Kategorie, Gewichtung, ausgehende Kanten mit Gewicht, Besuch-Nr. | Should | `ui/erklaerung.ts` (`feldInfo`) |
| FA-24 | Gamification: Pixel-Spielwelt mit Spielfigur, Schatztruhe als Ziel und Rennen beim Loslaufen | Should | `render/textures.ts`, `render/karte.ts` |

### Qualitätsanforderungen (ISO/IEC 25010)

| ID | Anforderung | Prio | Prüfkriterium / Nachweis |
| --- | --- | --- | --- |
| QA-01 | Korrekte Ergebnisse: BFS minimale Feldzahl, Dijkstra und A* minimale Kosten | Must | 0 Abweichungen von Bellman-Ford auf 300 Zufallskarten (`vergleich.test.ts`) |
| QA-02 | Gleiche Eingabe ergibt stets denselben Ablauf | Must | Replay-Test: hin und zurück ergibt identischen Zustand |
| QA-03 | Neuberechnung aller vier Verfahren ohne spürbare Wartezeit | Should | < 100 ms je Welt, Median aus 5 Läufen (`npm run test:leistung`; in der CI nur zur Information, damit ein langsamer CI-Rechner keine Veröffentlichung verhindert) |
| QA-04 | Ohne Einweisung bedienbar | Should | kein Tutorial nötig; SUS ≥ 71,4 in der Nutzerstudie |
| QA-05 | Farbe immer mit Legende oder Text ergänzt; Bedienung per Tastatur, Touch und Screenreader | Should | Legende in jeder Ansicht; jeder Zustand hat eine eigene Form; Pfeiltasten, Leertaste, Pos1, Ende; Feld-Cursor auf der Karte; Feldinfo per Antippen; `aria-label` und `aria-live` |
| QA-06 | Läuft ohne Installation im Browser, ohne Server-Backend | Must | Live-Version auf GitHub Pages |
| QA-07 | Nutzbar ab 400 px Breite ohne horizontales Scrollen | Should | Browser-Test bei 400 und 1440 px |
| QA-08 | Algorithmen von UI getrennt und automatisch testbar | Should | Importregeln (Abschnitt 4); `npm test` |
| QA-10 | Einheitliche Formatierung unabhängig vom Editor | Should | `prettier --check` in der CI (`npm run format:check`) |

### Randbedingungen

| ID | Randbedingung |
| --- | --- |
| RB-01 | Vier Personen, ein Semester |
| RB-02 | Web-App mit TypeScript, Vite und Canvas, ohne Backend (Abschnitt 3) |
| RB-03 | Keine personenbezogenen Daten, nichts wird gespeichert |
| RB-04 | Abgabe als GitHub-Repo mit Live-Version auf GitHub Pages |

### Won't (bewusst nicht umgesetzt, nicht einbauen)

| ID | Was | Grund |
| --- | --- | --- |
| FA-10 | JSON-Export/-Import, Speichern und Laden | nach Prototyp-Feedback gestrichen |
| FA-15 | freie Graphen (gerichtet/ungerichtet), Graph-Welt, Graph-Labor | doppelt zur Karte, passt nicht zur Gamification; Ausblick im Bericht |
| FA-17 | Suche ohne Ziel | jede Welt hat ein Ziel |
| FA-18 | DFS-Kantentypen | gehörte zum Graph-Modus |
| FA-19 | wählbare Nachbarreihenfolge | fest oben, rechts, unten, links |
| FA-20 | Mitraten | gestrichen |
| QA-09 | dunkles Farbschema bzw. Umschalter | nur hell (auf Wunsch geändert, vorher nur dunkel) |
| AB-01 | diagonale Schritte | eigene Kostenregeln nötig |
| AB-02 | negative Kosten (werden mit `RangeError` abgelehnt; Kosten 0 sind erlaubt) | Dijkstra und A* setzen nichtnegative Kosten voraus |
| AB-03 | Benutzerkonten, Server | nicht nötig |
| AB-04 | Rechenzeit in Millisekunden als Statistik | auf 640 Feldern unter einer Millisekunde und je nach Rechner verschieden; verglichen wird der Suchaufwand als Zahl besuchter Felder |
| AB-05 | Aufgaben/Quests, XP, Erfolge, Einstellungen-Panel, „Wie funktioniert das?“, Auswahl „Ein Schritt ist …“, „Zum Ende“ im Vergleich, Gelände wie Lava, Sand oder Gebäude | nach Prototyp-Feedback gestrichen |

---

## 10. Qualität

### Unit Tests (Vitest)

- Tests liegen neben der Datei: `dijkstra.ts` → `dijkstra.test.ts`. `npm test` startet alle außer der Zeitmessung, `npm run test:leistung` nur diese.
- Der Architekturtest erkennt alle Importformen: `import … from`, `export … from`, Side-Effect-Imports `import "…"` und dynamische Imports `import("…")`.
- **Pro Algorithmus mindestens:** ein einfacher Fall, ein Fall mit Hindernis, ein Fall ohne Weg.
- **Sollwerte rechnet ein Mensch auf Papier aus.** Die KI schreibt die Tests, aber nicht die erwarteten Zahlen, sonst prüft sie ihren eigenen Fehler. Zu jedem Sollwert gehört der Rechenweg als Kommentar:

  ```ts
  // Unten herum: 1 + 1 + 1 + 1 + 1 = 5. Mitte quer: 1 + 5 + 1 = 7.
  expect(ergebnis.kosten).toBe(5);
  ```

- Pflicht ist außerdem ein Test, der die Kostenregel festhält: Bei `[[7, 1, 1]]` kostet der Weg von links nach rechts 2, von rechts nach links 8.
- Weitere vorhandene Tests, die erhalten bleiben:
  - Zufallskarten gegen Bellman-Ford (QA-01)
  - Pseudocode-Zeilen passen zu den Steps
  - Generator und Aufzeichnung liefern dieselben Steps
  - Replay hin und zurück (QA-02)
  - Aussagen der Welten
  - Erklärsatz nennt dieselben Felder, die `fokus()` markiert
  - Leistung (QA-03)
  - `besteWahl()` liefert in jeder der vier Welten genau deren Algorithmus; ohne Weg enthält die Tabelle kein „★“
  - `feldInfo()` nennt die ausgehenden Kanten mit Gewicht (mit Rechenweg), bei A* g, h und f
  - A*-Heuristik zulässig und konsistent; Kosten 0 korrekt; negative Kosten abgelehnt
  - Replay: Datenstruktur passt zu `inListe`, FIFO überholt nie, Dijkstra-Prioritäten steigen nie, Dijkstra verbessert nie ein d
  - Ereignisprotokoll und Erkennungsmerkmal (Dijkstra überholt im Flussmoor, BFS nie)

### Code

- Keine `any`, keine auskommentierten Altlasten, keine ungenutzten Exporte.
- Kurze Kommentare dort, wo eine Entscheidung nicht offensichtlich ist (Warum, nicht Was).
- Fehlermeldungen und alle Texte der Oberfläche auf Deutsch.

### README

Pflichtinhalte:

- Titel, ein Satz zum Zweck, **Live-Link**, **Screenshot** (`docs/screenshot.png`)
- Tabelle der Welten
- Abschnitt „Modell“: Kostenregel, Nachbarreihenfolge, Heuristik, Geländetabelle
- **Startanleitung** (`npm install`, `npm run dev`, `npm test`, `npm run build`)
- Ordnerstruktur, Teamaufteilung nach Modulen, Deploy-Hinweis, Quellen

---

## 11. Zusammenarbeit und Deployment

- **Branches:** `main` ist immer lauffähig. Pro Thema ein Branch, z. B. `feature/algorithmen`, `feature/welten`, `feature/render`, `feature/ui`, `fix/tooltip-rand`.
- **Pull Requests:** Jeder PR wird von einer anderen Person reviewt. Die PR-Beschreibung nennt die betroffenen FA/QA-IDs.
- **Commits:** kurz, deutsch, im Imperativ („Dijkstra-Test mit Sumpf ergänzen“). Bekannte Ausnahme in der Geschichte: `3cc20d5` „Add files via upload“ (Upload über die GitHub-Weboberfläche). Sie bleibt stehen, weil `main` nicht umgeschrieben wird (Force-Push würde allen die Geschichte ändern); `pruefen.yml` verhindert Wiederholungen. Dateien nicht über die Weboberfläche hochladen.
- **Formatierung:** Prettier (`.prettierrc.json`, Zeilenbreite 140). `npm run format` formatiert, `npm run format:check` prüft; Markdown und `prototype/` sind ausgenommen.
- **Prüfen:** `.github/workflows/pruefen.yml` läuft bei jedem Pull Request und Push auf andere Branches: Formatierung, Tests, Build, Zeitmessung (nicht blockierend) und Commit-Nachrichten (keine Standardtexte der GitHub-Weboberfläche wie „Add files via upload“). So bleibt `main` lauffähig.
- **Editor:** `.editorconfig` und `.vscode/settings.json` (Prettier beim Speichern) gelten für alle.
- **Deploy:** `.github/workflows/deploy.yml` läuft bei jedem Push auf `main`: `npm ci` → `npm run format:check` → `npm test` → `npm run build` → Veröffentlichung von `dist/` auf GitHub Pages. Schlagen die Tests fehl, wird nichts veröffentlicht. Einmalig: Settings → Pages → Source „GitHub Actions“. `vite.config.ts` nutzt `base: "./"`.

---

## 12. Fertig, wenn …

- [ ] `npm test` grün, `npm run build` ohne Fehler, keine Fehler in der Browser-Konsole
- [ ] alle Must- und Should-Anforderungen aus Abschnitt 9 erfüllt, nichts aus *Won't* vorhanden
- [ ] jede Welt erfüllt ihre Bedingung aus Abschnitt 7
- [ ] jeder Sollwert in Tests hat einen Rechenweg und ist von einem Menschen bestätigt (kein `TODO` mehr)
- [ ] README vollständig, Live-Link funktioniert, Screenshot aktuell
