/*
 * Self-employed sick pay and benefits (UK) : ce que peut demander un sole trader malade, qui attend un enfant ou dont
 * l'activité s'arrête. Moteur OFE.benefitsUK ; chiffres lus dans les règles. Spécification :
 * documentation/51-protection-sociale-royaume-uni.md.
 */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("ben-form");
  if (!form || !OFE || !OFE.benefitsUK || !R || !R.uk_maternity_allowance) return;
  var B = OFE.benefitsUK, E = R.uk_new_style_esa, M = R.uk_maternity_allowance;
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  // Montants comme GOV.UK : « £27 », « £194.32 ».
  var gbp = function (n) { return OF.money(n, Math.round(n) === n ? 0 : undefined); };
  var FIELDS = {
    ill: ["ben-age-field", "ben-ni-field", "ben-pension-field"],
    baby: ["ben-registered-field", "ben-class2-field", "ben-smp-field"],
    stopped: ["ben-class1-field"]
  };
  var MARK = { ok: ["is-ok", "✓ "], check: ["is-check", "? "], no: ["is-todo", "✗ "] };

  function texts(situation) {
    var class2 = $("ben-class2").value;
    if (situation === "ill") return {
      health: { ok: "A health condition or disability that affects how much you can work." },
      pension_age: { ok: "Under State Pension age.", no: "New Style ESA is only for people under State Pension age." },
      contributions: {
        ok: "Enough National Insurance paid, usually in the last 2 to 3 years (credits count too).",
        check: "Check your National Insurance record: you need enough contributions, usually in the last 2 to 3 years (credits count too).",
        no: "Without enough National Insurance contributions in the last 2 to 3 years, there's no New Style ESA."
      }
    };
    if (situation === "baby") return {
      no_smp: { ok: "No Statutory Maternity Pay from an employer.", no: "Maternity Allowance is only for people who can't get Statutory Maternity Pay." },
      registered: {
        ok: "Registered as self-employed (or employed) for at least " + M.registered_weeks + " weeks in the " + M.test_period_weeks + " weeks before your baby is due.",
        no: "You need at least " + M.registered_weeks + " weeks registered as self-employed (or employed) in the " + M.test_period_weeks + " weeks before your baby is due."
      },
      class2: {
        ok: "Class 2 paid for at least " + M.class2_weeks_for_max + " of the " + M.test_period_weeks + " weeks: the maximum amount.",
        check: {
          none: "No Class 2 paid: " + gbp(M.lowest_rate) + " a week, unless you pay more after you apply.",
          some: "Fewer than " + M.class2_weeks_for_max + " weeks of Class 2: HMRC tells you after you apply how many more to pay for the maximum.",
          unsure: "Check how many weeks of Class 2 count for you: HMRC tells you after you apply."
        }[class2]
      }
    };
    return {
      class1: {
        check: "Class 1 National Insurance paid as an employee, usually for the previous " + R.uk_new_style_jsa.class1_tax_years + " tax years: check your record.",
        no: "Self-employed people who only paid Class 2 can't get New Style JSA (share fishermen and volunteer development workers aside)."
      }
    };
  }

  function result(situation) {
    if (situation === "ill") return B.esa(R, { age: $("ben-age").value, ni: $("ben-ni").value, underPensionAge: $("ben-pension").checked });
    if (situation === "baby") return B.maternity(R, { registered26: $("ben-registered").checked, class2: $("ben-class2").value, smp: $("ben-smp").checked });
    return B.jsa(R, { class1: $("ben-class1").checked });
  }

  function headline(situation, r) {
    var missing = r.conditions.filter(function (c) { return c.status === "no"; }).length;
    if (r.outcome === "no") return ["Not eligible", missing === 1 ? "A condition isn't met: see below." : missing + " conditions aren't met: see below."];
    if (situation === "ill") return ["Up to " + gbp(r.weekly),
      "a week for the first " + r.assessmentWeeks + " weeks (" + gbp(r.assessmentTotal) + ") while your claim is assessed"
      + (r.outcome === "check" ? ", if you've paid enough National Insurance" : "")
      + ". Then up to " + gbp(r.wrag) + " a week (work-related activity group) or " + gbp(r.support) + " (support group)."];
    if (situation === "baby") {
      var per = "a week for up to " + r.weeks + " weeks: ";
      if (!r.topUpWeeks) return [gbp(r.weeklyMax), per + gbp(r.totalMax) + " in total."];
      var topUp = " Paying up to " + r.topUpWeeks + " more weeks of Class 2 (" + gbp(r.topUpCost) + " at most) can raise it to "
        + gbp(r.bestWeekly) + " a week (" + gbp(r.bestTotal) + ").";
      if (r.weeklyMin === r.weeklyMax) return [gbp(r.weeklyMin), per + gbp(r.totalMin) + " in total." + topUp];
      return [gbp(r.weeklyMin) + " to " + gbp(r.weeklyMax), per + gbp(r.totalMin) + " to " + gbp(r.totalMax) + " in total, depending on your weeks of Class 2." + topUp];
    }
    return ["You may qualify", "With Class 1 contributions as an employee, New Style JSA can be paid for up to " + r.maxDays + " days."];
  }

  var LABELS = { ill: "New Style ESA while you're assessed", baby: "Maternity Allowance", stopped: "New Style Jobseeker's Allowance" };
  var STEPS = {
    ill: "Next: apply for New Style ESA on GOV.UK. You can't get it at the same time as Statutory Sick Pay or Jobseeker's Allowance.",
    baby: "Next: apply with form MA1 once you've been pregnant for " + M.claim_from_weeks_pregnant + " weeks, with proof of your due date. Payments can start from the "
      + M.earliest_start_weeks_before_due + "th week before your baby is due; claim within " + M.claim_within_months + " months of your start date to get the full amount.",
    stopped: "Next: apply for New Style JSA on GOV.UK. You must not be working " + R.uk_new_style_jsa.max_hours_weekly + " hours or more a week."
  };
  var NOTICES = {
    ill: "Statutory Sick Pay (up to " + gbp(R.uk_statutory_sick_pay.weekly_max) + " a week) is paid by an employer, so not for your self-employed work. Universal Credit may be paid too, reduced by your ESA.",
    baby: "Profits of at least " + gbp(R.class2_small_profits_threshold) + " in 2026/27 (" + gbp(R.class2_small_profits_threshold_2025_26) + " in 2025/26)? You get a National Insurance credit instead of paying Class 2: GOV.UK doesn't say how these weeks count for Maternity Allowance. Voluntary Class 2 costs "
      + gbp(R.class2_voluntary_weekly_rate) + " a week.",
    stopped: "This tool doesn't work out Universal Credit, which may help instead: check if you're eligible on GOV.UK."
  };

  function compute() {
    var situation = $("ben-situation").value;
    Object.keys(FIELDS).forEach(function (s) {
      FIELDS[s].forEach(function (id) { $(id).hidden = s !== situation; });
    });
    var r = result(situation), t = texts(situation), list = $("ben-checks");
    list.textContent = "";
    if (r.error) {
      set("ben-label", LABELS[situation]);
      set("ben-big", "–");
      set("ben-sub", "Choose an answer for each question.");
      return;
    }
    r.conditions.forEach(function (c) {
      var li = document.createElement("li"), mark = MARK[c.status];
      li.className = mark[0];
      li.textContent = mark[1] + t[c.key][c.status];
      list.appendChild(li);
    });
    var h = headline(situation, r);
    set("ben-label", LABELS[situation]);
    set("ben-big", h[0]);
    set("ben-sub", h[1]);
    // Conditions non remplies : renvoi au Universal Credit (déjà la note de la fin d'activité, alors masquée).
    var no = r.outcome === "no";
    $("ben-step").className = "notice" + (no ? "" : " ok");
    set("ben-step", no ? "Universal Credit may help instead: check if you're eligible on GOV.UK." : STEPS[situation]);
    $("ben-notice").hidden = no && situation === "stopped";
    set("ben-notice", NOTICES[situation]);
  }

  OF.persistForm(form, "uk-benefits");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
