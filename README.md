# GraphRunner

Ein Pixel-Spiel im Klötzchenstil im Browser, das zeigt, **wann welcher Suchalgorithmus der beste ist**: BFS, DFS, Dijkstra und A* suchen gleichzeitig auf derselben Karte, Schritt für Schritt und mit Pseudocode.

**Live:** https://xeniannr-hub.github.io/graphrunner/

![GraphRunner: Alle vier Verfahren auf der Handelsstraße](docs/screenshot.png)

Hochschulprojekt im Modul *Theoretische Informatik* an der DHBW Ravensburg. Thema: „Visualisierung grundlegender Graphensuchalgorithmen mit GUI oder Web-App“.

## Welten

Für jedes Verfahren gibt es eine Welt, deren Gelände zeigt, wann es am besten passt. Die Bedingungen in der rechten Spalte prüft `src/world/worlds.test.ts`.

| Welt | Verfahren | … ist am besten, wenn … | Messbare Bedingung |
| --- | --- | --- | --- |
| Ruinenhof | BFS | jeder Schritt gleich viel kostet | offener Hof, nur Wiese und Mauerreste, Start und Ziel in gegenüberliegenden Ecken; BFS sucht > 60 % der Felder ab; alle optimalen Kosten gleich; A* und Dijkstra besuchen > 85 % von BFS; BFS braucht die wenigsten Rechenschritte; DFS-Weg > 3 × so lang (456 statt 50), mit 8 von 24 Reihenfolgen wäre DFS direkt am Ziel |
| Stollen | DFS | es nur einen Weg gibt, das Ziel tief liegt und DFS die passenden Gänge zuerst probiert | perfektes Labyrinth; alle finden denselben Weg; DFS besucht < 70 % jedes anderen (hängt an der Nachbarreihenfolge, siehe Modellannahmen) |
| Flussmoor | Dijkstra | Felder verschieden viel kosten und eine Schätzung kaum hilft | A*-Kosten = Dijkstra; A* besucht > 95 % von Dijkstra; Dijkstra braucht weniger Rechenschritte (4.167 zu 4.356); BFS zahlt > 1,5 ×, DFS > 2 × |
| Handelsstraße | A* | das Ziel weit weg liegt und seine Richtung bekannt ist | A*-Kosten = Dijkstra; A* besucht < 25 % von Dijkstra und am wenigsten, auch < 25 % der Rechenschritte (1.098 zu 8.326); BFS zahlt > 1,2 × |
| Eigene Welt | – | selbst bauen | startet als leere Wiese |

## Bedienung

- **Alle vergleichen:** vier Karten nebeneinander. Ein Schritt heißt: Jedes Verfahren besucht ein weiteres Feld. Darunter stehen die beste Wahl der Welt mit Begründung, ein Fazit und eine Tabelle mit besuchten Feldern, Rechenschritten, Weglänge und Ausdauer. Einen ★ für wenig Suchaufwand bekommt nur, wer den optimalen Weg gefunden hat. Am Ende zeigt „Loslaufen“, wer den günstigsten Weg gefunden hat.
- **Einzelansicht – ein Debugger für Algorithmen:** ein Verfahren Zeile für Zeile. Abspielen/Pause, Schritt vor und zurück, zum Anfang und zum Ende, Tempo einstellbar. Dazu:
  - **Erklärsatz** zur aktuellen Codezeile und **Pseudocode** mit hervorgehobener Zeile,
  - **Datenstruktur** live: Warteschlange (FIFO), Stapel (LIFO) oder Prioritätswarteschlange (bei A* mit g, h und f einzeln, veraltete Einträge durchgestrichen),
  - **Ereignisprotokoll** aller relevanten Aktionen (einfügen, entnehmen, verbessern, abschließen, zurückspringen); ein Klick springt zu diesem Schritt,
  - **„Woran erkenne ich …?“** mit Belegen aus dem laufenden Algorithmus,
  - bei A* die **offengelegte Heuristik**, bei BFS und DFS auf gewichteten Karten eine **Warnung**, dass Kantengewichte ignoriert werden.
- **Tastatur:** `←` / `→` ein Schritt, Leertaste Abspielen oder Anhalten, `Pos1` / `Ende` zum Anfang bzw. Ende. Mit `Tab` auf eine Karte: Pfeiltasten bewegen einen Feld-Cursor mit Feldinfo, `Enter` baut (Eigene Welt), `Esc` verlässt die Karte.
- **Touch:** Antippen eines Feldes zeigt die Feldinfo. Wischen scrollt die Seite; nur in der Eigenen Welt malt man durch Ziehen.
- **Fortschritt:** In der Einzelansicht zählt „Zeile k von n“ die ausgeführten Codezeilen, im Vergleich zählt „Feld k von n“ die besuchten Felder je Verfahren.

### Zustände auf der Karte

| Zustand | Bedeutung | Darstellung |
| --- | --- | --- |
| entdeckt | d ist gesetzt, das Feld ist aber noch nicht eingereiht (eine Codezeile lang) | gestrichelter weißer Rahmen |
| wartet | liegt in Warteschlange, Stapel oder Prioritätswarteschlange | heller Schleier mit weißem Punkt |
| expandiert | entnommen und Nachbarn untersucht (Dijkstra/A*: abgeschlossen) | Farbe des Verfahrens, Gelände bleibt sichtbar |
| finaler Weg | Teil des gefundenen Weges | weiße Linie |

### Woran erkenne ich, dass Dijkstra läuft und nicht eine Breitensuche?

1. **Entnahmereihenfolge:** BFS nimmt immer den ältesten Eintrag (FIFO). Dijkstra nimmt den mit dem kleinsten d. Die Tabelle der Prioritätswarteschlange zeigt d und die Einfügenummer, und das Panel zählt, wie oft ein jüngerer Eintrag einen älteren überholt hat, mit konkretem Beispiel. Bei BFS passiert das nie.
2. **Monotone Kosten:** Die entnommenen d-Werte steigen nie. d zählt Kosten, nicht Kanten. Die Front breitet sich in teurem Gelände (Sumpf, Wald) langsamer aus als auf dem Weg, bei BFS dagegen in gleichmäßigen Schichten.
3. **Gegenprobe:** Auf Karten, auf denen jedes Feld gleich viel kostet (Ruinenhof, Stollen), expandiert Dijkstra in derselben Reihenfolge wie BFS. Der Unterschied ist also genau dort sichtbar, wo er fachlich entsteht: im Flussmoor rund 120, in der Handelsstraße rund 370 Überholungen.

Weil eine Kante so viel kostet wie das Feld, das man betritt, haben alle Kanten in ein Feld dasselbe Gewicht. Dijkstra findet ein Feld deshalb gleich beim ersten Mal zum günstigsten Preis und muss d nie nachträglich verbessern. A* kann das, weil es nach f expandiert; das Protokoll zeigt solche Verbesserungen mit altem und neuem g und Vorgänger.
- **Eigene Welt:** Werkzeug wählen, dann auf eine Karte klicken oder darüber ziehen. Alle Verfahren rechnen sofort neu. „Karte leeren“ macht alles wieder zu Wiese.
- **Tooltip:** Über jedem Feld stehen Koordinate, Gelände, Ausdauer, die ausgehenden Kanten mit Gewicht (z. B. `Kanten: ↑ 2 · → 4 · ↓ – · ← 2`) und die Besuchsnummer. So sieht man die Karte als Graph.

## Modell

- Die Karte hat 32 × 20 Felder. `x` zählt nach rechts, `y` nach unten, ab 0. Feldnummer `id = y · 32 + x`.
- Jedes begehbare Feld ist ein Knoten. Nachbarn sind nur die vier direkten Nachbarfelder, keine Diagonalen.
- **Kostenregel:** Die Kante u → v kostet so viel wie das Feld v. Das Startfeld zählt nicht. Hin- und Rückweg können deshalb verschieden teuer sein: Bei `[[7, 1, 1]]` kostet links → rechts 2, rechts → links 8.
- **Nachbarreihenfolge:** fest **oben, rechts, unten, links** (`RICHTUNGEN` in `src/algorithms/raster.ts`). Sie bestimmt den Verlauf der DFS und entscheidet bei den anderen Verfahren über Gleichstände. Im Heap gewinnt bei gleicher Priorität der ältere Eintrag, deshalb ist jeder Lauf reproduzierbar.
- **Heuristik von A\*:** `h(v) = Manhattan-Abstand(v, Ziel) × billigstes begehbares Feld der Karte`. Sie ist zulässig, weil jeder Weg mindestens so viele Schritte braucht und jeder Schritt mindestens das billigste Feld kostet. Sie ist konsistent, weil ein Schritt den Abstand um genau 1 ändert. Der Faktor „billigstes Feld“ hält sie zulässig, wenn es keinen Weg (Kosten 1) gibt. Beides prüfen Tests auf Zufallskarten mit Kosten 0 bis 7 (`astar.test.ts`).
- **Kantengewichte ≥ 0:** Negative Kosten werden mit einer Fehlermeldung abgelehnt, weil Dijkstra und A* sie nicht erlauben. Kosten 0 sind erlaubt und werden korrekt behandelt (Vergleich mit Bellman-Ford auf 300 Zufallskarten).

| Gelände | Ausdauer | Zeichen in Karten |
| --- | --- | --- |
| Weg | 1 | `=` |
| Brücke | 1 | `#` |
| Wiese | 2 | `.` |
| Wald | 4 | `T` |
| Sumpf | 7 | `%` |
| Wasser | nicht begehbar | `~` |
| Fels | nicht begehbar | `^` |

| Verfahren | Datenstruktur | Findet | Besuch zählt beim |
| --- | --- | --- | --- |
| BFS | Warteschlange (FIFO) | kürzesten Weg nach Anzahl der Kanten (Gewichte ignoriert) | Entnehmen |
| DFS | Stapel (iterativ) | irgendeinen Weg | Auflegen |
| Dijkstra | Min-Heap mit lazy deletion | günstigsten Weg | Abschließen |
| A* | wie Dijkstra mit f = g + h | günstigsten Weg | Abschließen |

## Modellannahmen

Diese Annahmen bestimmen die Messwerte. Sie sind hier und im Bericht offen benannt.

1. **Rechenschritte = ausgeführte Pseudocode-Zeilen.** Jede Zeile zählt 1, auch eine Heap-Operation (eigentlich O(log n)). Dijkstra hat pro Nachbar eine Zeile mehr als BFS (`rechne` und `vergleiche` statt einer Prüfung). Dass BFS im Ruinenhof am wenigsten rechnet (6.982 statt 9.928 bei Dijkstra), folgt deshalb teilweise aus der Schreibweise des Pseudocodes.
2. **Die Schätzung h(v) ist bei A* ein eigener Rechenschritt.** Bei zulässiger, konsistenter Schätzung kann Dijkstra A* bei den besuchten Feldern nie schlagen. Was A* dafür bezahlt, zeigt sich nur, wenn das Berechnen von h(v) mitgezählt wird. Dann liegt Dijkstra im Flussmoor vorne (4.167 zu 4.356 Rechenschritte), in der Handelsstraße gewinnt A* deutlich (1.098 zu 8.326). Beste Wahl, ★ und Fazit folgen demselben festen Kriterium je Welt, das unter der Zeile „Beste Wahl“ steht.
3. **Die Nachbarreihenfolge ist fest: oben, rechts, unten, links.** Der DFS-Vorteil im Stollen hängt daran. Nur 12 von 24 Reihenfolgen erfüllen „DFS besucht < 70 % jedes anderen“. Beginnt die Reihenfolge mit „rechts“, besucht DFS 241 bis 273 statt 61 Felder. Im Ruinenhof liefe DFS mit 8 der 24 Reihenfolgen (z. B. unten, links, oben, rechts) direkt zum Ziel, mit der festen Reihenfolge findet es einen Weg von 456 statt 50 Kanten. DFS hat im Stollen also Glück; `worlds.test.ts` hält das mit allen 24 Reihenfolgen fest.

## Starten

Voraussetzung: Node 22 oder neuer.

```bash
npm install        # einmalig
npm run dev        # Entwicklungsserver, danach die angezeigte Adresse öffnen
npm test           # Unit Tests im Terminal (ohne Zeitmessung)
npm run test:leistung  # Zeitmessung QA-03 (< 100 ms je Welt, Median aus 5 Läufen)
npm run build      # Typprüfung und Build nach dist/
npm run format     # Formatieren mit Prettier (die CI prüft mit format:check)
```

## Ordnerstruktur

```text
src/
  types.ts            gemeinsame Typen
  main.ts             Einstieg: Oberfläche, Zeichenschleife, Tastatur
  styles.css
  algorithms/         BFS, DFS, Dijkstra, A* als Generatoren, Raster, Heap, Pseudocode
  replay/             Aufzeichnung vor- und zurückspielen
  world/              Gelände und die fünf Welten als Textkarten
  info/               Steckbrief je Verfahren (Name, Farbe, Datenstruktur) und fokus(): neutral für render/ und ui/
  render/             Pixelgrafik und Kartenzeichnung (Canvas 2D)
  ui/                 Zustand, Wiedergabeleiste, Vergleich, Einzelansicht, Seitenleiste, Tooltip, Erklärungen
prototype/            erster Prototyp, nur zum Nachschlagen
docs/screenshot.png
.github/workflows/deploy.yml
```

Die Algorithmen kennen weder DOM noch Canvas. Sie liefern Schritt für Schritt `Step`-Objekte, die `Replay` vor- und zurückspielt. Deshalb laufen alle Tests ohne Browser (`src/architektur.test.ts` prüft die Importregeln).

## Team

| Modul | Verantwortlich |
| --- | --- |
| `algorithms/`, `replay/` | *Name eintragen* |
| `world/` | *Name eintragen* |
| `render/` | *Name eintragen* |
| `ui/`, `main.ts`, `styles.css` | *Name eintragen* |

## Deployment

Jeder Pull Request und jeder Push auf einen anderen Branch startet `.github/workflows/pruefen.yml` (Formatierung, Tests, Build, Zeitmessung nur zur Information, Commit-Nachrichten). Jeder Push auf `main` startet `.github/workflows/deploy.yml`: `npm ci` → `npm run format:check` → `npm test` → `npm run build` → Veröffentlichung von `dist/` auf GitHub Pages. Schlagen die Tests fehl, wird nichts veröffentlicht. Einmalig nötig: *Settings → Pages → Source: GitHub Actions*.

## Quellen

- Brown, M. H.; Sedgewick, R. (1984): A System for Algorithm Animation. *Computer Graphics* 18(3), 177–186.
- Dijkstra, E. W. (1959): A note on two problems in connexion with graphs. *Numerische Mathematik* 1, 269–271.
- Hart, P. E.; Nilsson, N. J.; Raphael, B. (1968): A Formal Basis for the Heuristic Determination of Minimum Cost Paths. *IEEE Transactions on Systems Science and Cybernetics* 4(2), 100–107.
- Tarjan, R. E. (1972): Depth-First Search and Linear Graph Algorithms. *SIAM Journal on Computing* 1(2), 146–160.
- Alle Grafiken (Gelände, Figur, Truhe, Logo) sind eigene Entwürfe im Klötzchenstil; nichts stammt aus anderen Spielen.
- Schriften: Pixelify Sans, Rubik, JetBrains Mono (SIL Open Font License), lokal eingebunden über `@fontsource`.
