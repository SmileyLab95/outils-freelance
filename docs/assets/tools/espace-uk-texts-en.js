/*
 * Workspace texts specific to the United Kingdom, in British English (documentation/61-espace-royaume-uni.md, § 3):
 * the UK engine (engines/espace-uk.js) and, later, the UK screens (tools/espace-uk-ui.js): payment methods, SA103S
 * boxes, payments on account, Making Tax Digital, prefilled emails. Added to the common English texts
 * (tools/espace-texts-en.js). tests/unit/espace-textes.test.mjs checks that every key read by the UK module exists and
 * that every key is used.
 */
(function (root) {
  "use strict";
  var T = root.OF_ESPACE_TEXTS = root.OF_ESPACE_TEXTS || {};
  T.en = Object.assign(T.en || {}, {
    // Engine: document names, payment methods, tax year.
    "eng.uk.type.facture": "Invoice",
    "eng.uk.type.devis": "Quote",
    "eng.uk.type.avoir": "Credit note",
    "eng.uk.taxYear": "{from}/{to}",
    "eng.uk.method.bank": "Bank transfer",
    "eng.uk.method.card": "Debit or credit card",
    "eng.uk.method.platform": "Online payment service",
    "eng.uk.method.cash": "Cash",
    "eng.uk.method.cheque": "Cheque",
    "eng.uk.method.other": "Other",
    // Engine: expenses and the SA103S summary (box labels come from the rules: uk_sa103s_boxes).
    "eng.exp.date": "Enter the expense date.",
    "eng.exp.supplier": "Enter the supplier.",
    "eng.exp.amount": "Enter a positive amount.",
    "eng.uk.exp.box": "Choose the SA103S box for this expense.",
    "eng.uk.csv.summary": "Box;Description;Amount",
    "eng.uk.csv.income": "Date received;Client;Document;Payment method;Type;Amount",
    "eng.uk.csv.receipt": "Payment",
    "eng.uk.csv.refund": "Refund",
    "eng.uk.csv.expenses": "Date paid;Supplier;Description;Payment method;Reference;SA103S box;Amount",
    "eng.uk.box.20": "Total expenses (boxes 11 to 19)",
    "eng.uk.box.21": "Net profit",
    "eng.uk.box.22": "Net loss",
    // Engine: cash flow forecast (tax payments).
    "eng.uk.forecast.poa": "Payment on account {n} for {year}",
    "eng.uk.forecast.balancing": "Balancing payment for {year}",
    "eng.uk.flow.tax": "Self Assessment",
    // Engine: prefilled emails.
    "eng.uk.mail.hello": "Hello,",
    "eng.uk.mail.regards": "Kind regards,",
    "eng.uk.mail.invoice": "Please find attached invoice {number} dated {date}, for {amount}.",
    "eng.uk.mail.payableBy": "due by {date}",
    "eng.uk.mail.payableNow": "due on receipt",
    "eng.uk.mail.payable": " It is {payable}.",
    "eng.uk.mail.paid": " It has already been paid. Thank you!",
    "eng.uk.mail.cancelled": " It has been cancelled by a credit note.",
    "eng.uk.mail.remaining": " After {already}, the balance due is {amount}, {payable}.",
    "eng.uk.mail.already.paymentsCredits": "the payments received and the credit notes issued",
    "eng.uk.mail.already.payments": "the payments already received",
    "eng.uk.mail.already.credits": "the credit notes issued",
    "eng.uk.mail.already.credit": "the credit note issued",
    "eng.uk.mail.payment": "Payment details: {details}",
    "eng.uk.mail.questions": "Please let me know if you have any questions.",
    "eng.uk.mail.subjectLate": "Invoice {number}: payment reminder",
    "eng.uk.mail.subjectDue": "Invoice {number}: due on {due}",
    "eng.uk.mail.reminderLate": "According to my records, payment for invoice {number} dated {date}, which was due on {due}, has not been received yet. The balance due is {amount}.",
    "eng.uk.mail.reminderSoon": "This is a friendly reminder that invoice {number} dated {date}, for {amount}, is due on {due}.",
    "eng.uk.mail.lateInterest": "Under the Late Payment of Commercial Debts (Interest) Act 1998, statutory interest of {rate} a year is accruing on this invoice from {from} ({daily} a day, {interest} to date), and I am entitled to fixed compensation of {compensation}.",
    "eng.uk.mail.quote": "Please find attached quote {number} dated {date}, for {amount}, valid until {until}.",
    "eng.uk.mail.deposit": " A deposit of {pct}% ({amount}) is due on acceptance.",
    "eng.uk.mail.accept": "To accept it, simply reply to this email to confirm, or return it signed.",
    "eng.uk.mail.discuss": "I'm happy to discuss it.",
    "eng.uk.mail.ref": "{number} dated {date}",
    "eng.uk.mail.credit": "Please find attached credit note {number} dated {date}, for {amount}.",
    "eng.uk.mail.creditFor": "Please find attached credit note {number} dated {date}, for {amount}, for invoice {ref}.",
    "eng.uk.mail.refundSoon": "The amount of {amount} will be refunded to you shortly.",
    "eng.uk.mail.refunded": "The amount of {amount} was refunded to you on {date}.",
    "eng.uk.mail.deducted": "It is deducted from that invoice: the balance due is now {amount}.",
    "eng.uk.mail.deductedCancelled": "It is deducted from that invoice, which is now cancelled.",
    "eng.uk.mail.deductedPaid": "It is deducted from that invoice, which is now settled."
  });
})(typeof self !== "undefined" ? self : this);
