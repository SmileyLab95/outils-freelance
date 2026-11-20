/*
 * Workspace texts specific to the United States, in English (documentation/60-espace-etats-unis.md, § 3.2 and § 3.3):
 * the US engine (engines/espace-us.js) and, later, the US screens (tools/espace-us-ui.js): payment methods, Schedule C
 * lines, estimated tax payments, prefilled emails. Added to the common English texts (tools/espace-texts-en.js).
 * tests/unit/espace-textes.test.mjs checks that every key read by the US module exists and that every key is used.
 */
(function (root) {
  "use strict";
  var T = root.OF_ESPACE_TEXTS = root.OF_ESPACE_TEXTS || {};
  T.en = Object.assign(T.en || {}, {
    // Documents: names used in email subjects.
    "eng.us.type.facture": "Invoice",
    "eng.us.type.devis": "Estimate",
    "eng.us.type.avoir": "Credit memo",
    // Payment methods (card and platform payments are reported on Form 1099-K, not 1099-NEC).
    "eng.us.method.ach": "ACH transfer",
    "eng.us.method.check": "Check",
    "eng.us.method.wire": "Wire transfer",
    "eng.us.method.card": "Credit or debit card",
    "eng.us.method.platform": "Payment platform",
    "eng.us.method.cash": "Cash",
    "eng.us.method.other": "Other",
    // Expenses: checks.
    "eng.exp.date": "Enter the expense date.",
    "eng.exp.supplier": "Enter the vendor.",
    "eng.exp.amount": "Enter a positive amount.",
    "eng.us.exp.line": "Choose the Schedule C line for this expense.",
    // Schedule C: lines not listed among the expense lines (labels of the 2026 form), CSV header.
    "eng.us.line.1": "Gross receipts or sales",
    "eng.us.line.2": "Returns and allowances",
    "eng.us.line.3": "Subtract line 2 from line 1",
    "eng.us.line.4": "Cost of goods sold",
    "eng.us.line.5": "Gross profit",
    "eng.us.line.6": "Other income",
    "eng.us.line.7": "Gross income",
    "eng.us.line.28": "Total expenses before expenses for business use of home",
    "eng.us.line.29": "Tentative profit or (loss)",
    "eng.us.line.30": "Expenses for business use of your home",
    "eng.us.line.31": "Net profit or (loss)",
    "eng.us.csv.scheduleC": "Line;Description;Amount",
    // Cash flow: estimated tax payments.
    "eng.us.forecast.installment": "Estimated tax payment {n} for {year}",
    // Prefilled emails: sending a document, invoice reminder.
    "eng.us.mail.hello": "Hello,",
    "eng.us.mail.regards": "Best regards,",
    "eng.us.mail.invoice": "Please find attached invoice {number} dated {date}, for {amount}.",
    "eng.us.mail.payableBy": "due by {date}",
    "eng.us.mail.payableNow": "due on receipt",
    "eng.us.mail.payable": " It is {payable}.",
    "eng.us.mail.paid": " It has already been paid. Thank you!",
    "eng.us.mail.cancelled": " It has been canceled by a credit memo.",
    "eng.us.mail.remaining": " After {already}, the balance due is {amount}, {payable}.",
    "eng.us.mail.already.paymentsCredits": "the payments received and the credit memos issued",
    "eng.us.mail.already.payments": "the payments already received",
    "eng.us.mail.already.credits": "the credit memos issued",
    "eng.us.mail.already.credit": "the credit memo issued",
    "eng.us.mail.payment": "Payment instructions: {instructions}",
    "eng.us.mail.questions": "Please let me know if you have any questions.",
    "eng.us.mail.subjectLate": "Invoice {number}: payment reminder",
    "eng.us.mail.subjectDue": "Invoice {number}: due on {due}",
    "eng.us.mail.reminderLate": "According to my records, payment for invoice {number} dated {date}, which was due on {due}, has not been received yet. The balance due is {amount}.",
    "eng.us.mail.reminderSoon": "This is a friendly reminder that invoice {number} dated {date}, for {amount}, is due on {due}.",
    "eng.us.mail.quote": "Please find attached estimate {number} dated {date}, for {amount}, valid until {until}.",
    "eng.us.mail.deposit": " A deposit of {pct}% ({amount}) is due on acceptance.",
    "eng.us.mail.accept": "To accept it, simply reply to this email to confirm, or return it signed.",
    "eng.us.mail.discuss": "I'm happy to discuss it.",
    "eng.us.mail.ref": "{number} dated {date}",
    "eng.us.mail.credit": "Please find attached credit memo {number} dated {date}, for {amount}.",
    "eng.us.mail.creditFor": "Please find attached credit memo {number} dated {date}, for {amount}, for invoice {ref}.",
    "eng.us.mail.refundSoon": "The amount of {amount} will be refunded to you shortly.",
    "eng.us.mail.refunded": "The amount of {amount} was refunded to you on {date}.",
    "eng.us.mail.deducted": "It is deducted from that invoice: the balance due is now {amount}.",
    "eng.us.mail.deductedCancelled": "It is deducted from that invoice, which is now canceled.",
    "eng.us.mail.deductedPaid": "It is deducted from that invoice, which is now settled."
  });
})(typeof self !== "undefined" ? self : this);
