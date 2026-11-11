// Einstieg: baut die Oberfläche, betreibt die Zeichenschleife und die Tastatursteuerung.
import "@fontsource/pixelify-sans/latin-600.css";
import "@fontsource/rubik/latin-400.css";
import "@fontsource/rubik/latin-500.css";
import "@fontsource/rubik/latin-700.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/jetbrains-mono/latin-600.css";
import "./styles.css";
import { zeichneBanner, zeichneLogo } from "./render/kopf";
import { Einzel } from "./ui/einzel";
import { Seitenleiste } from "./ui/seitenleiste";
import { Vergleich } from "./ui/vergleich";
import { Z, beiAenderung, type Ansicht } from "./ui/zustand";

const app = document.querySelector("#app") as HTMLElement;
let schmutzig = true;
const geaendert = () => {
  schmutzig = true;
};
beiAenderung(geaendert);

// Kopf: Banner, Logo, Titel, Untertitel, Umschalter der Ansicht.
const kopf = document.createElement("header");
kopf.className = "kopf";
const banner = document.createElement("canvas");
banner.className = "banner";
banner.setAttribute("aria-hidden", "true");
const logo = zeichneLogo();
logo.className = "logo";
logo.setAttribute("aria-hidden", "true");
const trenner = document.createElement("span");
trenner.className = "trenner";
trenner.setAttribute("aria-hidden", "true");
const titel = document.createElement("div");
titel.className = "titel";
titel.innerHTML = `<h1><span class="graph">Graph</span><span class="runner">Runner</span></h1><p>Wann ist welcher Suchalgorithmus der beste?</p>`;
const umschalter = document.createElement("div");
umschalter.className = "umschalter";
umschalter.setAttribute("role", "group");
umschalter.setAttribute("aria-label", "Ansicht");
const ansichtKnoepfe = new Map<Ansicht, HTMLButtonElement>();
for (const [a, text] of [
  ["vergleich", "Alle vergleichen"],
  ["einzel", "Einzelansicht"],
] as [Ansicht, string][]) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = text;
  b.onclick = () => {
    Z.ansicht = a;
    Z.spielt = false;
    geaendert();
  };
  ansichtKnoepfe.set(a, b);
  umschalter.append(b);
}
kopf.append(banner, logo, trenner, titel, umschalter);

const seitenleiste = new Seitenleiste(geaendert);
const vergleich = new Vergleich(geaendert);
const einzel = new Einzel(geaendert);
const haupt = document.createElement("main");
haupt.className = "haupt";
haupt.append(vergleich.element, einzel.element);
const rumpf = document.createElement("div");
rumpf.className = "rumpf";
rumpf.append(seitenleiste.element, haupt);
app.append(kopf, rumpf);

const aktiveWiedergabe = () => (Z.ansicht === "vergleich" ? vergleich.wiedergabe : einzel.wiedergabe);

// Tastatur (QA-05): ← / → ein Schritt, Leertaste Abspielen. Eingabefelder und Knöpfe behalten ihre eigene Bedienung.
document.addEventListener("keydown", (ev) => {
  const ziel = ev.target as HTMLElement;
  const tag = ziel.tagName;
  if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || ev.altKey || ev.ctrlKey || ev.metaKey) return;
  if (ev.key === "ArrowLeft" || ev.key === "ArrowRight") {
    ev.preventDefault();
    aktiveWiedergabe().taste(ev.key === "ArrowRight" ? 1 : -1);
  } else if (ev.key === " " && tag !== "BUTTON") {
    ev.preventDefault();
    aktiveWiedergabe().umschalten();
  }
});

let letzte = performance.now();
let groesse = "";
function bild(jetzt: number): void {
  const dt = Math.min(0.1, (jetzt - letzte) / 1000);
  letzte = jetzt;
  if (aktiveWiedergabe().tick(dt)) schmutzig = true;
  const laeuft = Z.ansicht === "vergleich" && vergleich.laufe(dt);
  // Bei Größenänderung neu zeichnen, damit die Karten scharf bleiben.
  const g = `${window.innerWidth}x${window.innerHeight}x${window.devicePixelRatio}`;
  if (g !== groesse) {
    groesse = g;
    schmutzig = true;
    zeichneBanner(banner);
  }
  if (schmutzig || laeuft) {
    schmutzig = false;
    for (const [a, b] of ansichtKnoepfe) b.setAttribute("aria-pressed", String(a === Z.ansicht));
    vergleich.element.hidden = Z.ansicht !== "vergleich";
    einzel.element.hidden = Z.ansicht !== "einzel";
    seitenleiste.aktualisiere();
    if (Z.ansicht === "vergleich") {
      vergleich.aktualisiere();
      vergleich.zeichne(jetzt);
    } else {
      einzel.aktualisiere();
      einzel.zeichne(jetzt);
    }
  }
  requestAnimationFrame(bild);
}
// Schriften laden, bevor Zahlen auf die Karte gezeichnet werden.
document.fonts.ready.then(geaendert, geaendert);
requestAnimationFrame(bild);
