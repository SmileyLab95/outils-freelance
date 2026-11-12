// Contraste du texte posé sur l'en-tête translucide (src/assets/style.css), dans le pire cas.
//
// L'en-tête est collant et son fond est semi-transparent : ce qui défile dessous change la couleur de fond réelle du
// logo et des menus. Avant le 23/10/2026, le logo (#4f46e5 sur un fond à 86 %) descendait à 4,36:1 au-dessus d'un
// élément sombre : axe-core l'a signalé une fois, selon le défilement (contrôle « intermittent » de l'Espace,
// documentation/05-feuille-de-route.md). Ce test calcule le minimum sur tout fond possible, pour que les thèmes à venir
// (documentation/54-themes.md) gardent 4,5:1 (WCAG 2.1, critère 1.4.3).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const CSS = readFileSync(fileURLToPath(new URL("../../src/assets/style.css", import.meta.url)), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/** Variables de :root (la première déclaration de chaque nom). */
function tokens(css) {
  const root = /:root\s*\{([^}]*)\}/.exec(css);
  const out = {};
  for (const m of root[1].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) if (!(m[1] in out)) out[m[1]] = m[2].trim();
  return out;
}
/** Valeur d'une propriété dans la règle de premier niveau dont le sélecteur est exactement `selector`. */
function prop(css, selector, name) {
  const top = css.replace(/@media[^{]*\{(?:[^{}]*\{[^}]*\})*\s*\}/g, "");
  for (const m of top.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (!m[1].split(",").map((s) => s.trim()).includes(selector)) continue;
    const p = new RegExp("(?:^|;)\\s*" + name + "\\s*:\\s*([^;]+)").exec(m[2]);
    if (p) return p[1].trim();
  }
  return null;
}
const resolve = (v, t) => v.replace(/var\(--([\w-]+)\)/g, (_, k) => resolve(t[k], t));

/** Couleur CSS (#rgb, #rrggbb, rgb(), rgba()) en [r, g, b, a]. */
function color(v) {
  let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v);
  if (m) {
    const h = m[1].length === 3 ? m[1].replace(/./g, "$&$&") : m[1];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).concat(1);
  }
  m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(v);
  if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
  throw new Error("couleur non lue : " + v);
}
const lin = (c) => (c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const blend = (top, under) => top.slice(0, 3).map((c, i) => top[3] * c + (1 - top[3]) * under[i]);

/** Contraste minimal d'un texte sur le fond translucide posé sur n'importe quel fond opaque (gris de 0 à 255 et
 *  couleurs primaires : pour un fond clair et un texte foncé, le pire cas est le noir). */
function worst(text, header) {
  const under = [];
  for (let v = 0; v <= 255; v += 5) under.push([v, v, v]);
  under.push([255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0], [0, 255, 255], [255, 0, 255]);
  return Math.min(...under.map((u) => ratio(text, blend(header, u))));
}

test("calcul du contraste : valeurs de référence (WCAG 2.1)", () => {
  assert.equal(Math.round(ratio([0, 0, 0], [255, 255, 255]) * 100) / 100, 21);
  assert.equal(Math.round(ratio([118, 118, 118], [255, 255, 255]) * 100) / 100, 4.54);
  // Ancien en-tête (avant le 23/10/2026) : la cause de l'échec intermittent.
  assert.equal(Math.round(worst(color("#4f46e5"), color("rgba(250,249,255,.86)")) * 100) / 100, 4.36);
});

test("en-tête translucide : logo et menus à 4,5:1 au moins, quel que soit le contenu qui défile dessous", () => {
  const t = tokens(CSS);
  const header = color(resolve(prop(CSS, ".site-header", "background"), t));
  assert.ok(header[3] > 0 && header[3] <= 1, "fond de l'en-tête lu");
  const texts = [".logo", ".logo b", ".nav-trigger", ".nav-group.is-active > .nav-trigger"].map((s) => {
    const v = prop(CSS, s, "color");
    assert.ok(v, "couleur lue pour " + s);
    return [s, color(resolve(v, t))];
  });
  for (const [s, c] of texts) {
    const r = worst(c, header);
    assert.ok(r >= 4.5, `${s} : ${r.toFixed(2)}:1 dans le pire cas (au moins 4,5:1)`);
  }
});
