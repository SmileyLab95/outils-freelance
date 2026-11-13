/*
 * Paid leave and disability insurance for the self-employed (US) : programmes des États ouverts aux indépendants par
 * adhésion volontaire, prime estimée quand le taux est publié (Californie, Oregon), et invalidité de la Social
 * Security (SSDI). Moteur OFE.benefitsUS ; chiffres lus dans les règles. Spécification :
 * documentation/52-protection-sociale-etats-unis.md.
 */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("ben-form");
  if (!form || !OFE || !OFE.benefitsUS || !R || !R.us_paid_leave_ca_diec) return;
  var B = OFE.benefitsUS;
  var C = R.us_paid_leave_ca_diec, M = R.us_paid_leave_mn_self_employed, N = R.us_paid_leave_ny_self_employed;
  var MA = R.us_paid_leave_ma_self_employed, ME = R.us_paid_leave_me_self_employed, DE = R.us_paid_leave_de_self_employed;
  var O = R.us_paid_leave_or_self_employed, W = R.us_paid_leave_wa_elective, S = R.us_ssdi_basics, NJ = R.us_paid_leave_nj_self_employed;
  var CO = R.us_paid_leave_co_self_employed;
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  // Montants comme les pages officielles : « $406.64 », « $1,000 ».
  var usd = function (n) { return OF.money(n, Math.round(n) === n ? 0 : undefined); };
  var pct = function (r) { return Math.round(r * 10000) / 100 + "%"; };

  var INFO = {
    CA: {
      label: "California DIEC (disability and paid family leave)",
      hint: "For 2026 premiums, use the net profit on your " + C.premium_year_of_return + " return (Schedule SE line 3 or Schedule C line 31).",
      points: [
        "Disability Insurance: up to " + C.di_max_weeks + " weeks when you can't work because of a non-work-related illness, injury or pregnancy.",
        "Paid Family Leave: up to " + C.pfl_max_weeks + " weeks in a 12-month period, for example to bond with a new child.",
        "You must be in the plan for " + C.months_before_claim + " months before you can apply for benefits, and pay all your premiums.",
        "Premium: " + pct(C.premium_rate_2026) + " of your net profit, at least " + usd(C.minimum_annual_premium_2026) + " a year (net profit of " + usd(C.minimum_premium_net_profit) + " or less), in four quarterly installments."
      ],
      step: "Next: apply for Disability Insurance Elective Coverage with the EDD. Check its page for the eligibility rules and how to cancel."
    },
    CO: {
      label: "Colorado FAMLI (optional coverage for the self-employed)",
      hint: "Your gross income from self-employment for the year: FAMLI bases the premiums on it.",
      points: [
        "If you're self-employed and live in Colorado, joining FAMLI (Family and Medical Leave Insurance) is optional.",
        "You pay " + pct(CO.self_employed_premium_rate_2026) + " of your gross income from self-employment (2026), on up to the Social Security wage cap (" + usd(R.social_security_wage_base_2026) + ").",
        "In 2027 the FAMLI premium drops from " + pct(CO.premium_rate_2026) + " to " + pct(CO.premium_rate_2027) + ". Self-employed people pay half of it, so " +
          pct(CO.premium_rate_2027 * CO.self_employed_share_of_premium) + ", on up to the " + usd(R.social_security_wage_base_2027) + " cap of 2027.",
        "You pay premiums every quarter for at least " + CO.min_years + " years; each is due by the end of the month after the quarter.",
        "To elect coverage you send a federal tax transcript (and any W-2s), then supporting documents with each quarterly wage report.",
        "Every year, by " + CO.annual_documents_due + ", you also send the prior year's tax transcript and W-2s; otherwise FAMLI can leave that income out of your claims and fine you up to " + usd(CO.annual_documents_fine_max) + ".",
        "Coverage starts when you register; benefits are available after at least " + CO.quarters_paid_before_benefits + " quarter of reported and paid premiums.",
        "You can file a notice of withdrawal at any time; it takes effect no sooner than the end of your " + CO.min_years + " years and " + CO.withdrawal_notice_days + " days after you file it."
      ],
      step: "Next: register as a self-employed individual in My FAMLI+ Employer."
    },
    DE: {
      label: "Delaware Paid Leave (voluntary enrollment)",
      points: [
        "Self-employed people and independent contractors can enroll voluntarily.",
        "Contributions are based on your self-employment earnings on your most recent federal tax return (" + DE.earnings_lines + "), divided by " + DE.quarterly_divisor + " for each quarter.",
        "You pay " + pct(DE.contribution_share) + " of the contribution.",
        "The program's contribution rate is " + pct(DE.program_rate_through_2026) + " of wages through 2026; Delaware Paid Leave confirms the contribution on your self-employment earnings."
      ],
      step: "Next: enroll with Delaware Paid Leave, which sets the contribution rates and tells you how long you commit for."
    },
    MA: {
      label: "Massachusetts Paid Family and Medical Leave (self-employed election)",
      points: [
        "You elect coverage for at least " + MA.initial_period_years + " years by filing a notice of election with the state; it takes effect on the filing date.",
        "You pay all the contributions on your income from self-employment.",
        "You can get benefits once you've paid contributions for at least " + MA.quarters_of_contributions + " of your last " + MA.quarters_lookback + " completed calendar quarters."
      ],
      step: "Next: file your notice of election with Massachusetts Paid Family and Medical Leave, which sets the contribution rate."
    },
    ME: {
      label: "Maine Paid Family and Medical Leave (elective coverage)",
      points: [
        "Independent contractors, sole proprietors and partners can elect coverage for at least " + ME.initial_period_years + " years; it takes effect on the date you file your notice.",
        "Premium for 2025-2027: " + pct(ME.premium_rate_2025_2027) + " of your income from self-employment.",
        "You can withdraw within " + ME.withdraw_within_days_after_period + " days after the end of the 3-year period; the withdrawal takes effect at least " + ME.withdrawal_notice_days + " days after your notice."
      ],
      step: "Next: elect coverage through the Maine Paid Leave portal."
    },
    MN: {
      label: "Minnesota Paid Leave (election of coverage)",
      hint: "Your estimated self-employment income for 2026, plus any self-employment wages: the premium base under Minnesota law.",
      points: [
        "Under the law, a self-employed individual is a Minnesota resident whose net earnings from self-employment reached at least " + pct(M.min_net_earnings_share_of_state_average_wage) + " of the state's average annual wage in a tax year before the current one.",
        "You apply for coverage for at least " + M.min_weeks + " consecutive weeks.",
        "Coverage starts in the calendar quarter after approval (or later if you ask).",
        "You can only leave on January 1, with a notice filed at least " + M.cancel_notice_days + " days before.",
        "Yearly premium: the Paid Leave premium rate times your self-employment premium base (your estimated self-employment income for the year plus your self-employment wages), capped at the Social Security wage base (" + usd(R.social_security_wage_base_2026) + " in 2026). The rate is " + pct(M.premium_rate_2026) +
          " in 2026; the state adjusts it every year, by " + M.rate_adjusted_each_year_by + " for the next year."
      ],
      step: "Next: apply on Minnesota Paid Leave's site for the self-employed."
    },
    NJ: {
      label: "New Jersey Temporary Disability and Family Leave Insurance",
      points: [
        (NJ.independent_contractors_covered ? "Independent contractors are covered" : "Independent contractors are not covered") +
          " for Temporary Disability and Family Leave Insurance, according to New Jersey's Division of Temporary Disability and Family Leave Insurance.",
        "The state's pages read for this tool describe no way for the self-employed to opt in: check with the Division before you rely on it.",
        "If you were misclassified as an independent contractor, you may in fact be an employee, and covered."
      ],
      step: "Next: look at private disability insurance and keep a cash buffer for time off."
    },
    NY: {
      label: "New York Paid Family Leave and disability",
      points: [
        "Without employees, you opt in by buying an insurance policy.",
        "The policy must cover both Paid Family Leave and disability benefits: you can't opt in for Paid Family Leave alone.",
        "The insurer sets the price. If you cancel, a new insurer may ask why and apply a waiting period."
      ],
      step: "Next: ask an insurance carrier for a Paid Family Leave and disability policy for the self-employed."
    },
    OR: {
      label: "Paid Leave Oregon",
      hint: "Your Oregon net income from self-employment (income after expenses) on your previous tax return.",
      points: [
        "You can choose coverage if your work is in Oregon and you earned at least " + usd(O.min_oregon_net_income) + " of Oregon net income from self-employment in the previous tax year.",
        "You then get the same benefits as employees.",
        "You agree to pay contributions for at least " + O.commitment_years + " years, every quarter.",
        "Contribution for 2025-2026: " + pct(O.contribution_rate_2025_2026) + " of that income, on up to " + usd(O.income_cap) + "."
      ],
      step: "Next: create a self-employed account in Frances Online and choose coverage."
    },
    WA: {
      label: "Washington Paid Family and Medical Leave (elective coverage)",
      points: [
        "You elect coverage for at least " + W.initial_period_years + " years, then for periods of at least " + W.renewal_period_years + " year, for both family and medical leave.",
        "You pay the full employee premium, and report your income every quarter.",
        "Premium rate for 2026: " + pct(W.premium_rate_2026) + ", of which employees pay " + pct(W.employee_share_2026) + ": about " +
          pct(W.premium_rate_2026 * W.employee_share_2026) + " of the income you report. For 2027: " + pct(W.premium_rate_2027) + " and " +
          pct(W.employee_share_2027) + ", about " + pct(W.premium_rate_2027 * W.employee_share_2027) + ".",
        "You can take benefits after working " + W.hours_required + " hours in the state after filing your notice.",
        "You can withdraw within " + W.withdraw_within_days_after_period + " days after the end of a coverage period."
      ],
      step: "Next: elect coverage with Washington's Employment Security Department; its calculator estimates your quarterly premium."
    }
  };
  var NAMES = ["California", "Colorado", "Delaware", "Maine", "Massachusetts", "Minnesota", "New Jersey", "New York", "Oregon", "Washington"];

  function compute() {
    var state = $("ben-state").value;
    var info = INFO[state], list = $("ben-points");
    var hasRate = state === "CA" || state === "OR" || state === "MN" || state === "CO";
    $("ben-profit-field").hidden = !hasRate;
    if (hasRate) set("ben-profit-hint", info.hint);
    list.textContent = "";
    var points = info ? info.points : [
      "This page covers " + NAMES.length + " states so far: " + NAMES.slice(0, -1).join(", ") + " and " + NAMES[NAMES.length - 1] + ".",
      "Other states have their own paid leave or disability programs, or none: check your state's labor or employment department."
    ];
    points.forEach(function (p) {
      var li = document.createElement("li");
      li.textContent = p;
      list.appendChild(li);
    });
    if (!info) {
      set("ben-label", "Your state");
      set("ben-big", "Not covered yet");
      set("ben-sub", "Check your state's own program.");
      $("ben-step").hidden = true;
    } else {
      $("ben-step").hidden = false;
      set("ben-label", info.label);
      set("ben-step", info.step);
      var p = hasRate ? B.premium(R, state, OF.num($("ben-profit").value)) : null;
      if (hasRate && p.error) {
        set("ben-big", "–");
        set("ben-sub", "Enter your net profit to estimate the premium.");
      } else if (hasRate && !p.eligible) {
        set("ben-big", "Not eligible");
        set("ben-sub", "You need at least " + usd(O.min_oregon_net_income) + " of Oregon net income from self-employment in the previous tax year.");
      } else if (hasRate) {
        set("ben-big", usd(p.annual) + " a year");
        // Minnesota : prime annuelle seulement (rythme de paiement des indépendants non lu).
        set("ben-sub", state === "MN" ? "estimated premium for 2026, at the " + pct(M.premium_rate_2026) + " rate."
          : state === "CO" ? "estimated premium for 2026, or " + usd(p.quarterly) + " a quarter. For " + p.next.year + ": about " + usd(p.next.annual) +
            " (" + usd(p.next.quarterly) + " a quarter), at " + pct(CO.premium_rate_2027 * CO.self_employed_share_of_premium) + "."
          : "estimated premium, or " + usd(p.quarterly) + " a quarter" + (state === "CA" ? " for 2026." : " (2025-2026 rate)."));
      } else {
        set("ben-big", state === "NY" ? "Buy a policy" : state === "NJ" ? "Not covered" : "Opt in");
        set("ben-sub", state === "NY" ? "Paid Family Leave and disability, priced by the insurer."
          : state === "NJ" ? "Independent contractors aren't covered by the state programs."
          : state === "ME" ? "Premium: " + pct(ME.premium_rate_2025_2027) + " of your income from self-employment (2025-2027)."
          : state === "WA" ? "You pay the employee share of the premium: about " + pct(W.premium_rate_2026 * W.employee_share_2026) + " of the income you report in 2026."
          : "Premium rate: see the state's site.");
      }
    }
    set("ben-ssdi", "Social Security Disability Insurance (SSDI) only covers long-term disability: it starts after " + S.waiting_period_months
      + " full months, if you have enough recent covered work (generally " + S.insured_quarters_of_coverage + " quarters of coverage in the last "
      + S.insured_period_quarters + "). Self-employment income counts.");
  }

  OF.persistForm(form, "us-benefits");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
