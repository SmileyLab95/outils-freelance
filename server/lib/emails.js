/*
 * Emails envoyés par le serveur des comptes (textes simples, sans lien de suivi ni image). Le lien porte le jeton
 * après « # » : il n'est ni envoyé au serveur du site, ni enregistré dans ses journaux.
 */
"use strict";

const TEXTS = {
  fr: {
    subject: (brand) => `Votre lien de connexion – ${brand}`,
    body: (brand, link, minutes) =>
      `Bonjour,\n\nPour vous connecter à votre Espace ${brand}, ouvrez ce lien dans les ${minutes} minutes :\n\n${link}\n\n` +
      `Il ne sert qu'une fois. Si vous n'avez rien demandé, ignorez cet email : personne ne peut se connecter sans ce lien.\n\n${brand}\n`
  },
  en: {
    subject: (brand) => `Your sign-in link – ${brand}`,
    body: (brand, link, minutes) =>
      `Hello,\n\nTo sign in to your ${brand} workspace, open this link within ${minutes} minutes:\n\n${link}\n\n` +
      `It works only once. If you didn't ask for it, ignore this email: no one can sign in without this link.\n\n${brand}\n`
  }
};

function loginEmail({ lang, brand, link, minutes }) {
  const t = TEXTS[lang] || TEXTS.fr;
  return { subject: t.subject(brand), text: t.body(brand, link, minutes) };
}

/** Boîte d'envoi de test : garde les messages en mémoire (le service d'envoi réel arrive à l'étape C5). */
class MemoryMailer {
  constructor() { this.outbox = []; }
  async send(message) { this.outbox.push({ ...message }); }
  last(to) { return [...this.outbox].reverse().find((m) => m.to === to) || null; }
}

module.exports = { loginEmail, MemoryMailer, LANGS: Object.keys(TEXTS) };
