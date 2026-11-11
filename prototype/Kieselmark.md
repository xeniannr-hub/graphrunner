# Kieselmark

Wie BFS, DFS, Dijkstra und A\* ihren Weg finden

## Welt

## Aufgabe

## Bauen

## Ausdauer pro Feld

Nachbarreihenfolge

In welcher Reihenfolge ein Knoten seine Nachbarn prüft. Das verändert vor allem DFS; die Länge des BFS-Weges und die günstigsten Kosten bleiben gleich.

Speichern und laden

Die aktuelle Welt als JSON-Text. Zum Speichern kopieren, zum Laden einfügen.

Tempo

### Ergebnis

Ein Schritt ist

Tempo

Zahlen auf der Karte [ ] Mitraten: nächsten Knoten vorhersagen

**Mitraten:**

Start

**Breitensuche**Pseudocode

```

```

### Warteschlange

### Besuchsreihenfolge

Baumkante Rückwärtskante Vorwärtskante Querkante

Wie funktioniert das?

#### Die Karte ist ein Graph

Jedes begehbare Feld ist ein Knoten. Von jedem Feld geht es zu den vier Nachbarfeldern. Ein Schritt kostet so viel Ausdauer, wie das Feld kostet, das man betritt. Im Graph-Modus zeichnest du Knoten und Kanten selbst.

#### Faire Schritte

Im Vergleich besucht jedes Verfahren pro Schritt genau einen weiteren Knoten. Gezählt wird also, wie viele Knoten ein Verfahren anschauen muss, nicht wie schnell der Computer ist.

#### Zwei Fragen

Wie viel musste gesucht werden? Das zeigen die besuchten Knoten. Wie gut ist der gefundene Weg? Das zeigt die Laufphase: Wer den günstigsten Weg gefunden hat, kommt zuerst an.

#### Der Kompass von A\*

A\* schätzt, wie weit es noch bis zum Ziel ist, und schätzt dabei nie zu viel. Deshalb findet A\* denselben günstigsten Weg wie Dijkstra, schaut sich aber meist weniger Knoten an.

#### Quellen

- Brown, M. H.; Sedgewick, R. (1984): A System for Algorithm Animation. Computer Graphics 18(3), 177–186.
- Dijkstra, E. W. (1959): A note on two problems in connexion with graphs. Numerische Mathematik 1, 269–271.
- Hart, P. E.; Nilsson, N. J.; Raphael, B. (1968): A Formal Basis for the Heuristic Determination of Minimum Cost Paths. IEEE Trans. SSC 4(2), 100–107.
- Tarjan, R. E. (1972): Depth-First Search and Linear Graph Algorithms. SIAM J. Computing 1(2), 146–160.