/* 1099-NEC checker : faut-il envoyer un formulaire 1099-NEC à ce prestataire pour les paiements de 2026 ? */
(function () {
  "use strict";
  var OF = window.OF, R = window.OF_RULES;
  var form = document.getElementById("nec-form");
  if (!form || !R) return;
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  var due = function () { return OF.date(R.form_1099_nec_due_date_2026_payments, { month: "long", day: "numeric", year: "numeric" }); };

  function compute() {
    var paid = Math.max(0, OF.num($("n-paid").value) || 0);
    var type = $("n-type").value, method = $("n-method").value, what = $("n-what").value;
    var w9 = $("n-w9").checked;
    var threshold = R.form_1099_nec_threshold_2026;
    var reason, required = false;
    if (what === "goods") reason = "Payments for goods or merchandise aren't reported on Form 1099-NEC.";
    else if (method === "card") reason = "Payments by card or through a payment app are reported by the processor on Form 1099-K, not by you.";
    else if (type === "corp") reason = "Payments to corporations generally don't need a 1099-NEC (attorneys are the exception).";
    else if (paid < threshold) reason = "You paid less than " + OF.money(threshold, 0) + " in 2026, the reporting threshold for payments made from January 1, 2026.";
    else { required = true; reason = "You paid " + OF.money(paid, 0) + " for services by direct payment" + (type === "attorney" ? " to an attorney" : "") + ": that's at or above the " + OF.money(threshold, 0) + " threshold."; }

    set("n-answer", required ? "Yes, file a 1099-NEC" : "No 1099-NEC needed");
    set("n-sub", reason);
    $("n-hero").classList.toggle("is-negative", !required);
    $("n-steps").hidden = !required;
    if (required) set("n-due", due());
    var notice = $("n-notice");
    if (!w9) {
      notice.hidden = false;
      notice.className = "notice warn";
      notice.textContent = "Ask for a Form W-9 before your next payment. Without a valid taxpayer identification number, you must withhold " +
        Math.round(R.backup_withholding_rate * 100) + "% from reportable payments (backup withholding) and send it to the IRS.";
    } else {
      notice.hidden = true;
    }
  }

  OF.persistForm(form, "nec");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
