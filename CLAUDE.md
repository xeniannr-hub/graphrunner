# CLAUDE.md: Kieselmark

Diese Datei liest Claude Code zu Beginn jeder Sitzung. Sie gilt für alle vier Gruppenmitglieder und ist die verbindliche Beschreibung des Projekts. Wer etwas Grundsätzliches ändert (Typen, Regeln, Anforderungen), ändert zuerst diese Datei, und zwar per Pull Request.

---

## 1. Projektkontext

- **Was:** Hochschulprojekt im Modul *Theoretische Informatik* an der DHBW Ravensburg, Gruppe aus vier Studierenden. Thema: „Visualisierung grundlegender Graphensuchalgorithmen mit GUI oder Web-App“.
- **Lernziel:** BFS, DFS, Dijkstra und A* verständlich machen, vor allem die Frage: **Wann ist welcher Algorithmus der beste?**
- **Zielgruppe:** Studierende, die Graphensuche lernen, und Lehrende, die das Werkzeug in der Vorlesung zeigen. Die App muss **ohne Tutorial** verständlich sein.
- **Idee:** eine Pixel-Spielwelt „Kieselmark“ (Gamification). Für jeden Algorithmus gibt es eine Welt, deren Gelände zeigt, wann er am besten passt. Alle Grafiken sind eigene Entwürfe, nichts stammt aus Minecraft oder anderen Spielen.
- **Abgabe:** als **GitHub-Repo** mit laufender Live-Version auf GitHub Pages, dazu Projektbericht (PDF) und Präsentation. Die Anforderungs-IDs in Abschnitt 9 sind dieselben wie im Bericht (Anhang C). Code, Tests und Bericht verweisen aufeinander.

---

## 2. Regeln für Claude Code

1. **Weiterentwickeln, nicht neu bauen.** Das Repo enthält eine lauffähige Version. Ändere gezielt und behalte Struktur, Typen und Tests bei. `prototype/` ist der erste Prototyp, nur zum Nachschlagen: nicht ändern, nichts daraus importieren.
2. **Nur bauen, was in Abschnitt 9 steht.** Was dort als *Won't* steht, baust du nicht ein, auch nicht „nebenbei“.
3. **Erst fragen, dann bauen,** wenn eine Anforderung unklar ist oder dieser Datei widerspricht. Rate nicht.
4. **Kleine Schritte:** ein Thema pro Branch und Pull Request. Vor jedem Commit laufen `npm test` und `npm run build` fehlerfrei durch.
5. **Sollwerte in Tests legst du nicht fest** (Abschnitt 10). Du schreibst den Rechenweg als Kommentar und markierst neue Werte mit `// TODO: von Hand nachrechnen`.
6. **Bei Änderungen an Welten oder Texten:** Prüfe, ob die Aussagen in `worlds.ts` noch stimmen; die Tests in `worlds.test.ts` halten sie fest.
7. **Sprache:** Deutsch in Oberfläche, Kommentaren, Commit-Nachrichten und Dokumentation. Bezeichner im Code ebenfalls deutsch (`kosten`, `besucht`, `weg`), Fachbegriffe wie `Step`, `Replay` und `Heap` bleiben englisch.
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
  render/             textures (Pixelgrafik), karte (Karte zeichnen)
  ui/                 zustand, wiedergabe (Wiedergabeleiste), vergleich, einzel,
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
| `render/` | `algorithms`, `replay`, `world`, `types`, `ui/erklaerung` |
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
- `Step`: genau eine ausgeführte Pseudocode-Zeile, `{ zeile, art, … }`. Arten: `init`, `setze`, `einfuegen`, `schleife`, `entnehmen`, `oben`, `zielpruefung`, `nachbar`, `keinNachbar`, `markiertPruefung`, `veraltetPruefung`, `abschliessen`, `rechne`, `vergleiche`, `keinWeg`. `setze` speichert die alten Werte (`altD`, `altVorg`), damit das Zurückspulen exakt ist.
- `SearchResult { algo, breite, hoehe, start, ziel, gefunden, weg, wegIds, kosten, felder, besucht, besuchsIndizes, schritte }`. Ohne Weg gilt: `weg = []`, `kosten = felder = Infinity`.

---

## 6. Algorithmen

### Schrittweise Ausführung als Generator

Jedes Verfahren ist eine **Generatorfunktion** (`function*`) vom Typ `SuchLauf = Generator<Step, Abschluss>`. Jedes `next()` führt **genau eine Pseudocode-Zeile** aus und liefert den passenden `Step`. Am Ende gibt der Generator den `Abschluss` zurück (`gefunden`, Vorgänger).

```ts
SCHRITTE.bfs(grid, start, ziel)   // Generator, liefert Step für Step
SUCHE.bfs(grid, start, ziel)      // = aufzeichnen("bfs", SCHRITTE.bfs(...)) → SearchResult
```

`aufzeichnen()` sammelt alle Steps in `SearchResult.schritte`. Die Oberfläche arbeitet mit dieser Aufzeichnung, weil sie auch **zurückspulen** können muss, was ein Generator allein nicht kann. `Replay` spielt die Aufzeichnung vor und zurück.

### Die vier Verfahren

| Verfahren | Datenstruktur | Findet | Besuch zählt beim |
| --- | --- | --- | --- |
| BFS | Warteschlange (FIFO) | Weg mit den wenigsten Feldern | Entnehmen |
| DFS | Stapel, iterativ: oben ansehen → nächster Nachbar → vorstoßen oder zurückspringen | irgendeinen Weg | Auflegen |
| Dijkstra | binärer Min-Heap, *lazy deletion* | günstigsten Weg | Abschließen |
| A* | wie Dijkstra mit f = g + h | günstigsten Weg | Abschließen |

- Dijkstra und A* teilen sich den Kern `bestensuche(h, …)`; Dijkstra ist A* mit h = 0.
- Gleichstand im Heap: Der ältere Eintrag gewinnt (`seq`). Jeder Lauf ist damit reproduzierbar (QA-02).
- **A*-Heuristik:** `h(v) = Manhattan-Abstand(v, Ziel) × billigstes begehbares Feld der Karte`.
  - **Zulässig:** Jeder Weg braucht mindestens so viele Schritte wie der Manhattan-Abstand, und jeder Schritt kostet mindestens das billigste Feld. Die Schätzung liegt also nie zu hoch, und A* findet immer den günstigsten Weg.
  - **Konsistent:** Ein Schritt ändert den Abstand um genau 1 und kostet mindestens das Minimum.
  - Warum nicht Euklid: Auch Euklid wäre zulässig, liegt bei 4er-Nachbarschaft aber immer unter Manhattan und lenkt A* deshalb schwächer.
  - Warum mal Minimum: Reiner Manhattan-Abstand wäre nur zulässig, solange das billigste Feld 1 kostet. In der Eigenen Welt ohne Weg kostet das billigste Feld 2.
- Ungültige Eingaben (leere Karte, Kosten ≤ 0, Start außerhalb oder auf Hindernis) werfen `RangeError` mit deutscher Meldung.
- `pseudocode.ts` enthält den Pseudocode je Verfahren. `Step.zeile` zeigt auf die passende Zeile, ein Test prüft das.

---

## 7. Welten

Genau fünf Welten in `world/worlds.ts`, jede als Textkarte (20 Zeilen × 32 Zeichen, Zeichen aus Abschnitt 5) mit `titel`, `algo`, `wann`, `warum`, `start` und `ziel`. `wann` ergänzt den Satz „*X* ist am besten, wenn …“, `warum` begründet es in zwei bis drei Sätzen.

| Welt | Algo | „… am besten, wenn …“ | Messbare Bedingung (Test) |
| --- | --- | --- | --- |
| Ruinenhof | BFS | jeder Schritt gleich viel kostet | nur Wiese und Felsmauern; BFS-Kosten = Dijkstra-Kosten; A* besucht > 85 % von BFS; DFS besucht > 2 × BFS, Weg > 1,5 × so lang |
| Stollen | DFS | es nur einen Weg gibt und das Ziel tief liegt | perfektes Labyrinth; alle finden denselben Weg; DFS besucht < 70 % jedes anderen |
| Flussmoor | Dijkstra | Felder verschieden viel kosten und eine Schätzung kaum hilft | A*-Kosten = Dijkstra; A* besucht > 95 % von Dijkstra; BFS zahlt > 1,5 ×, DFS > 2 × |
| Handelsstraße | A* | das Ziel weit weg liegt und seine Richtung bekannt ist | A*-Kosten = Dijkstra; A* besucht < 25 % von Dijkstra und am wenigsten; BFS zahlt > 1,2 × |
| Eigene Welt | – | selbst bauen | startet als leere Wiese |

Wichtig für alle Texte: Bei gleichen Kosten kann BFS nie weniger Felder besuchen als A*, und Dijkstra nie weniger als A*. „Am besten“ heißt in Ruinenhof und Flussmoor deshalb „genauso gut, aber einfacher bzw. ohne Schätzung“. Kein Text behauptet etwas, das die Messung nicht zeigt.

---

## 8. Oberfläche (Kurzfassung)

- **Kopf:** Logo, „Kieselmark“, Untertitel „Wann ist welcher Suchalgorithmus der beste?“, Umschalter **Alle vergleichen** / **Einzelansicht**.
- **Seitenleiste:** Weltliste mit Algorithmus-Kürzel; darunter fett „*X* ist am besten, wenn …“ plus Begründung; bei der Eigenen Welt das Panel „Bauen“; sonst „Ausdauer pro Feld“.
- **Wiedergabeleiste** (`ui/wiedergabe.ts`): **eine Komponente für beide Ansichten.** Reihenfolge: `|◀` · `◀` · Abspielen/Pause/Nochmal · `▶` · Tempo · Fortschrittsregler „Schritt k von n“. Nur in der Einzelansicht kommt `▶|` (Zum Ende) dazu, nur in Alle vergleichen „Loslaufen“. Die Legende steht in der Steuerleiste. Tastatur: `←`/`→` Schritt, Leertaste Abspielen.
- **Alle vergleichen:** vier Karten im 2 × 2-Raster. Ein Schritt bedeutet: jedes Verfahren besucht ein weiteres Feld. Kopf je Karte: Name, Kurzbeschreibung, Zähler „besucht“, Status. Darunter das Ergebnis: Fazit-Absatz in ganzen Sätzen und eine Tabelle (besuchte Felder, Weglänge, Ausdauer des Weges, Platz beim Loslaufen), ★ beim besten Wert.
- **Einzelansicht:** Tabs für die vier Verfahren, Auswahl „Zahlen auf der Karte“. Ein Schritt bedeutet: eine Codezeile. Links die Karte, rechts daneben:
  - Steckbrief, bei allen vier gleich: Verfahren · Wählt als Nächstes · Findet
  - aktueller Erklärsatz mit „Zeile n“
  - Pseudocode mit hervorgehobener Zeile
  - Besuchsreihenfolge

  Karte und Erklärsatz lesen die markierten Felder aus derselben Funktion `fokus()`. Weißer Rahmen: wird bearbeitet. Gelber Rahmen: wird geprüft, rot bei negativer Prüfung.
- **Tooltip** über jeder Karte in beiden Ansichten: Koordinate (ggf. Start/Ziel), Kategorie, Gewichtung bzw. „nicht begehbar“, Besuch-Nr. bzw. Status.
- **Bauen:** Start, Ziel und die sieben Geländearten; klicken oder ziehen, auf jeder Karte. Start und Ziel nur auf begehbare Felder, nie aufeinander. Nach jeder Änderung rechnen alle Verfahren sofort neu.
- **Darstellung:** nur dunkles Schema. Feste Farben: BFS `#ff4d73`, DFS `#a56bff`, Dijkstra `#ff8a2b`, A* `#ffd400`. Pixelschrift nur in Überschriften. Ab 400 px Breite kein horizontales Scrollen. Fokusrahmen und `aria`-Attribute.

---

## 9. Anforderungen (MoSCoW)

IDs wie im Bericht (Anhang C). **Must** = ohne sie ist das Ergebnis unbrauchbar, **Should** = wichtig, **Could** = wünschenswert, **Won't** = bewusst nicht umgesetzt. Die Spalte „Umsetzung“ zeigt, wo die Anforderung im Code steckt.

### Funktionale Anforderungen

| ID | Anforderung | Prio | Umsetzung |
| --- | --- | --- | --- |
| FA-01 | Ablauf der BFS Schritt für Schritt animiert darstellen | Must | `algorithms/bfs.ts`, `ui/einzel.ts` |
| FA-02 | Ablauf der DFS Schritt für Schritt animiert darstellen | Must | `algorithms/dfs.ts`, `ui/einzel.ts` |
| FA-03 | Eigene Graphen erstellen: als Karte bauen, also Gelände malen sowie Start und Ziel setzen (die Karte ist ein gewichteter Graph, Abschnitt 5) | Must | Eigene Welt, `ui/seitenleiste.ts`, `ui/karten-interaktion.ts` |
| FA-04 | Besuchte Felder kennzeichnen und von entdeckten, wartenden unterscheiden | Must | `render/karte.ts`, Legende |
| FA-05 | Entdeckungskanten (Vorgänger) und gefundenen Weg hervorheben | Must | `render/karte.ts` |
| FA-06 | Suchreihenfolge anzeigen: Besuchsnummer auf der Karte und als Liste | Must | Einzelansicht, Tooltip |
| FA-07 | Dijkstra auf der gewichteten Karte darstellen | Should | `algorithms/dijkstra.ts` |
| FA-08 | A* mit zulässiger Heuristik darstellen | Should | `algorithms/astar.ts`, Abschnitt 6 |
| FA-09 | Vor- und zurückschalten (Einzelansicht je Codezeile, Vergleich je besuchtem Feld), Abspielen mit Tempo | Should | `replay/`, `ui/wiedergabe.ts` |
| FA-11 | Pseudocode mit aktueller Zeile und Erklärsatz | Should | `algorithms/pseudocode.ts`, `ui/erklaerung.ts` |
| FA-13 | Alle vier Verfahren gleichzeitig auf derselben Karte, je Schritt ein besuchtes Feld pro Verfahren | Should | `ui/vergleich.ts` |
| FA-14 | Statistik je Verfahren gegenüberstellen: besuchte Felder (Suchaufwand), Weglänge, Wegkosten; Fazit in Sätzen | Should | Ergebnis-Tabelle |
| FA-16 | Karte mit Geländekosten als gewichteter Graph; Start, Ziel und Gelände veränderbar | Must | `world/`, `algorithms/raster.ts` |
| FA-21 | Gefundene Wege ablaufen lassen („Loslaufen“), Platzierung nach Kosten | Could | `ui/vergleich.ts` |
| FA-22 | Je Algorithmus eine Welt, deren Gelände zeigt, wann er am besten passt, mit kurzer Begründung | Must | `world/worlds.ts`, Seitenleiste |
| FA-23 | Tooltip über jedem Feld in beiden Ansichten: Koordinate, Kategorie, Gewichtung, Besuch-Nr. | Should | `ui/erklaerung.ts` (`feldInfo`) |
| FA-24 | Gamification: Pixel-Spielwelt mit Spielfigur, Schatztruhe als Ziel und Rennen beim Loslaufen | Should | `render/textures.ts`, `render/karte.ts` |

### Qualitätsanforderungen (ISO/IEC 25010)

| ID | Anforderung | Prio | Prüfkriterium / Nachweis |
| --- | --- | --- | --- |
| QA-01 | Korrekte Ergebnisse: BFS minimale Feldzahl, Dijkstra und A* minimale Kosten | Must | 0 Abweichungen von Bellman-Ford auf 300 Zufallskarten (`vergleich.test.ts`) |
| QA-02 | Gleiche Eingabe ergibt stets denselben Ablauf | Must | Replay-Test: hin und zurück ergibt identischen Zustand |
| QA-03 | Neuberechnung aller vier Verfahren ohne spürbare Wartezeit | Should | < 100 ms je Welt (`leistung.test.ts`) |
| QA-04 | Ohne Einweisung bedienbar | Should | kein Tutorial nötig; SUS ≥ 71,4 in der Nutzerstudie |
| QA-05 | Farbe immer mit Legende oder Text ergänzt; Steuerung per Tastatur | Should | Legende in jeder Ansicht; Pfeiltasten, Leertaste |
| QA-06 | Läuft ohne Installation im Browser, ohne Server-Backend | Must | Live-Version auf GitHub Pages |
| QA-07 | Nutzbar ab 400 px Breite ohne horizontales Scrollen | Should | Browser-Test bei 400 und 1440 px |
| QA-08 | Algorithmen von UI getrennt und automatisch testbar | Should | Importregeln (Abschnitt 4); `npm test` |

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
| FA-12 | eigene Ansicht der Datenstruktur (Stapel/Warteschlange) | wartende Felder sieht man auf der Karte |
| FA-15 | freie Graphen (gerichtet/ungerichtet), Graph-Welt, Graph-Labor | doppelt zur Karte, passt nicht zur Gamification; Ausblick im Bericht |
| FA-17 | Suche ohne Ziel | jede Welt hat ein Ziel |
| FA-18 | DFS-Kantentypen | gehörte zum Graph-Modus |
| FA-19 | wählbare Nachbarreihenfolge | fest oben, rechts, unten, links |
| FA-20 | Mitraten | gestrichen |
| QA-09 | helles Farbschema | nur dunkel |
| AB-01 | diagonale Schritte | eigene Kostenregeln nötig |
| AB-02 | negative Kosten | Dijkstra und A* setzen nichtnegative Kosten voraus |
| AB-03 | Benutzerkonten, Server | nicht nötig |
| AB-04 | Rechenzeit in Millisekunden als Statistik | auf 640 Feldern unter einer Millisekunde und je nach Rechner verschieden; verglichen wird der Suchaufwand als Zahl besuchter Felder |
| AB-05 | Aufgaben/Quests, XP, Erfolge, Einstellungen-Panel, „Wie funktioniert das?“, Auswahl „Ein Schritt ist …“, „Zum Ende“ im Vergleich, Gelände wie Lava, Sand oder Gebäude | nach Prototyp-Feedback gestrichen |

---

## 10. Qualität

### Unit Tests (Vitest)

- Tests liegen neben der Datei: `dijkstra.ts` → `dijkstra.test.ts`. `npx vitest` startet alle.
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
- **Commits:** kurz, deutsch, im Imperativ („Dijkstra-Test mit Sumpf ergänzen“).
- **Deploy:** `.github/workflows/deploy.yml` läuft bei jedem Push auf `main`: `npm ci` → `npm test` → `npm run build` → Veröffentlichung von `dist/` auf GitHub Pages. Schlagen die Tests fehl, wird nichts veröffentlicht. Einmalig: Settings → Pages → Source „GitHub Actions“. `vite.config.ts` nutzt `base: "./"`.

---

## 12. Fertig, wenn …

- [ ] `npm test` grün, `npm run build` ohne Fehler, keine Fehler in der Browser-Konsole
- [ ] alle Must- und Should-Anforderungen aus Abschnitt 9 erfüllt, nichts aus *Won't* vorhanden
- [ ] jede Welt erfüllt ihre Bedingung aus Abschnitt 7
- [ ] jeder Sollwert in Tests hat einen Rechenweg und ist von einem Menschen bestätigt (kein `TODO` mehr)
- [ ] README vollständig, Live-Link funktioniert, Screenshot aktuell
