// Tests du moteur de protection du travailleur autonome au Canada : prestations spéciales de l'assurance-emploi et
// RQAP (documentation/56-protection-sociale-canada.md). Valeurs attendues calculées à la main à partir de la Loi sur
// l'assurance-emploi (partie VII.1) et de la Loi sur l'assurance parentale, lues le 13/11/2026.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { ruleValues } from "./regles.mjs";

const require = createRequire(import.meta.url);
const B = require("../../src/assets/engines/benefits-ca.js");
const R = ruleValues("ca");
const status = (r) => Object.fromEntries(r.conditions.map((c) => [c.key, c.status]));
const ei = (o) => B.ei(R, { registration: "12_months", quebec: false, ...o });

test("règles : chiffres lus dans les lois (AE partie VII.1, RQAP) et plafonds 2026", () => {
  const E = R.ei_self_employed_special_benefits, Q = R.qpip_self_employed_benefits;
  assert.equal(E.rate, 0.55);
  assert.equal(E.extended_parental_rate, 0.33);
  assert.deepEqual(E.weeks, { sickness: 26, maternity: 15, parental: 35, parental_extended: 61, compassionate: 26,
    critically_ill_child: 35, critically_ill_adult: 15 });
  assert.equal(E.waiting_weeks, 1);
  assert.equal(E.agreement_months, 12);
  assert.equal(E.minimum_earnings_base, 6000);
  assert.deepEqual(Q.basic.parental, [{ weeks: 7, rate: 0.7 }, { weeks: 25, rate: 0.55 }]);
  assert.deepEqual([Q.basic.maternity.weeks, Q.special.maternity.weeks, Q.basic.paternity.weeks, Q.special.paternity.weeks], [18, 15, 5, 3]);
  assert.equal(Q.special.parental[0].weeks, 25);
  assert.equal(R.ei_max_insurable_earnings, 68900);
  assert.equal(R.qpip_max_insurable_earnings, 103000);
  // Cohérence avec les chiffres publiés : 729 $ par semaine au plus (Gazette du Canada) ; cotisation RQAP maximale de
  // 786,92 $ (Québec.ca) = 0,764 % × 103 000 $.
  assert.equal(B.dollar(0.55 * 68900 / 52), 729);
  assert.equal(Math.round(R.qpip_rate_self_employed * R.qpip_max_insurable_earnings * 100) / 100, R.qpip_max_premium_self_employed);
});

test("AE : 55 % du revenu de l'année précédente ÷ 52, arrondi au dollar, plafonné ; semaines et cotisation", () => {
  // 50 000 $ : 0,55 × 50 000 ÷ 52 = 528,85 → 529 $ ; maladie 26 semaines → 13 754 $ ; cotisation 1,63 % = 815 $.
  const r = ei({ kind: "sickness", earnings: 50000 });
  assert.equal(r.plan, "ei");
  assert.deepEqual([r.weekly, r.weeks, r.total, r.premium, r.waitingWeeks, r.capped], [529, 26, 13754, 815, 1, false]);
  assert.deepEqual(status(r), { registration: "ok", earnings: "check", interruption: "check" });
  assert.equal(r.outcome, "check");
  // 80 000 $ : plafonné à 68 900 $ → 728,75 → 729 $ (la moitié vers le haut) ; 26 × 729 = 18 954 $ ; cotisation
  // 1,63 % × 68 900 = 1 123,07 $.
  const c = ei({ kind: "sickness", earnings: 80000 });
  assert.deepEqual([c.weekly, c.total, c.premium, c.capped, c.maxWeekly], [729, 18954, 1123.07, true, 729]);
  // Grossesse, 30 000 $ : 317,31 → 317 $ × 15 = 4 755 $.
  const m = ei({ kind: "maternity", earnings: 30000 });
  assert.deepEqual([m.weekly, m.weeks, m.total], [317, 15, 4755]);
  // Parentales prolongées, 40 000 $ : 33 % → 253,85 → 254 $ × 61 = 15 494 $ ; standard : 423 $ × 35 = 14 805 $.
  const x = ei({ kind: "parental_extended", earnings: 40000 });
  assert.deepEqual([x.rate, x.weekly, x.weeks, x.total, x.maxWeekly], [0.33, 254, 61, 15494, 437]);
  const s = ei({ kind: "parental", earnings: 40000 });
  assert.deepEqual([s.weekly, s.weeks, s.total], [423, 35, 14805]);
  // Proches aidants : 26, 35 et 15 semaines.
  assert.deepEqual(["compassionate", "critically_ill_child", "critically_ill_adult"].map((k) => ei({ kind: k, earnings: 52000 }).weeks), [26, 35, 15]);
  assert.equal(ei({ kind: "compassionate", earnings: 52000 }).weekly, 550);
});

test("AE : conditions (12 mois d'adhésion, 6 000 $ au moins), Québec, saisies refusées", () => {
  assert.deepEqual(status(ei({ kind: "sickness", earnings: 5999 })), { registration: "ok", earnings: "no", interruption: "check" });
  assert.equal(ei({ kind: "sickness", earnings: 5999 }).outcome, "no");
  assert.equal(ei({ kind: "sickness", earnings: 6000 }).conditions[1].status, "check", "6 000 $ : montant indexé à vérifier");
  assert.equal(ei({ kind: "sickness", earnings: 50000, registration: "less" }).outcome, "no");
  assert.equal(ei({ kind: "sickness", earnings: 50000, registration: "none" }).conditions[0].status, "no");
  // Québec : maternité et parentales au RQAP ; maladie à l'AE au taux du Québec (1,30 % × 50 000 = 650 $).
  for (const kind of ["maternity", "parental", "parental_extended"]) assert.deepEqual(ei({ kind, earnings: 50000, quebec: true }), { plan: "qpip" });
  const q = ei({ kind: "sickness", earnings: 50000, quebec: true });
  assert.deepEqual([q.plan, q.weekly, q.premium, q.premiumRate], ["ei", 529, 650, 0.013]);
  assert.deepEqual(ei({ kind: "vacation", earnings: 1 }), { error: "kind" });
  assert.deepEqual(ei({ kind: "sickness", earnings: 1, registration: "maybe" }), { error: "registration" });
  assert.deepEqual(ei({ kind: "sickness", earnings: -1 }), { error: "earnings" });
  assert.deepEqual(ei({ kind: "sickness", earnings: "abc" }), { error: "earnings" });
  assert.equal(ei({ kind: "sickness", earnings: 0 }).weekly, 0);
});

test("RQAP : revenu hebdomadaire moyen, tranches de semaines et taux de l'art. 18, plafond, minimum, cotisation", () => {
  const q = (o) => B.qpip(R, o);
  // 52 000 $ : 1 000 $ par semaine. Régime de base : maternité 18 × 700 = 12 600 $ ; paternité 5 × 700 = 3 500 $ ;
  // parentales 7 × 700 + 25 × 550 = 18 650 $. Régime particulier : 15 × 750 = 11 250 $ ; 3 × 750 = 2 250 $ ; 25 × 750.
  const m = q({ kind: "maternity", option: "basic", earnings: 52000 });
  assert.deepEqual([m.plan, m.average, m.weeks, m.total, m.premium], ["qpip", 1000, 18, 12600, 397.28]);
  assert.deepEqual(m.phases, [{ weeks: 18, rate: 0.7, weekly: 700 }]);
  assert.deepEqual(status(m), { insurable_income: "ok", residence: "check", interruption: "check" });
  assert.equal(q({ kind: "paternity", option: "basic", earnings: 52000 }).total, 3500);
  const p = q({ kind: "parental", option: "basic", earnings: 52000 });
  assert.deepEqual(p.phases, [{ weeks: 7, rate: 0.7, weekly: 700 }, { weeks: 25, rate: 0.55, weekly: 550 }]);
  assert.deepEqual([p.weeks, p.total], [32, 18650]);
  assert.deepEqual([q({ kind: "maternity", option: "special", earnings: 52000 }).total, q({ kind: "paternity", option: "special", earnings: 52000 }).total,
    q({ kind: "parental", option: "special", earnings: 52000 }).total], [11250, 2250, 18750]);
  // 120 000 $ : plafond de 103 000 $ → 1 980,77 $ par semaine ; 70 % = 1 386,54 $ ; cotisation 786,92 $ (maximum publié).
  const c = q({ kind: "maternity", option: "basic", earnings: 120000 });
  assert.deepEqual([c.average, c.phases[0].weekly, c.total, c.capped, c.premium], [1980.77, 1386.54, 24957.72, true, 786.92]);
  // 1 500 $ : moins de 2 000 $ de revenu assurable → pas admissible, pas de cotisation (art. 54).
  const low = q({ kind: "maternity", option: "basic", earnings: 1500 });
  assert.deepEqual([low.outcome, low.premium, low.average], ["no", 0, 38.46], "revenu hebdomadaire jamais inférieur à 2 000 $ ÷ 52 (art. 21)");
  assert.equal(q({ kind: "maternity", option: "basic", earnings: 2000 }).conditions[0].status, "ok");
  assert.deepEqual(q({ kind: "sickness", option: "basic", earnings: 1 }), { error: "kind" });
  assert.deepEqual(q({ kind: "maternity", option: "premium", earnings: 1 }), { error: "option" });
  assert.deepEqual(q({ kind: "maternity", option: "minimum_insurable_income", earnings: 1 }), { error: "option" });
  assert.deepEqual(q({ kind: "maternity", option: "basic", earnings: NaN }), { error: "earnings" });
});
