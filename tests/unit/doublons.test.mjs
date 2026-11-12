// Garde-fou : deux fonctions de même nom au premier niveau d'un script se remplacent en silence (la dernière gagne).
// Erreur trouvée le 12/11/2026 : une seconde fonction kpi() de la trésorerie remplaçait celle du tableau de bord.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const dirs = ["../../src/assets/tools/", "../../src/assets/engines/"];
test("aucune fonction déclarée deux fois au premier niveau d'un script", () => {
  const found = [];
  for (const dir of dirs) {
    const url = new URL(dir, import.meta.url);
    for (const name of readdirSync(url).filter((f) => f.endsWith(".js"))) {
      const src = readFileSync(new URL(name, url), "utf8");
      // Premier niveau du module : déclarations indentées de 2 espaces (IIFE) ou sans indentation.
      const names = [...src.matchAll(/^ {0,2}function ([A-Za-z0-9_$]+)\s*\(/gm)].map((m) => m[1]);
      const seen = new Set();
      for (const n of names) {
        if (seen.has(n)) found.push(name + " : " + n);
        seen.add(n);
      }
    }
  }
  assert.deepEqual(found, []);
});
