# 34. Inscription et premiers pas du compte gratuit

Suite de la [vision](31-vision-plateforme.md) (§ 2.1 et 2.2, ordre de réalisation § 5, étape 3) et des comptes déjà
construits en brouillon ([12](12-specification-comptes.md), [23](23-serveur-et-connexion.md) : connexion par lien,
clés d'accès, coffre chiffré de bout en bout). Spécification avant le code, 23/10/2026. Tout reste en **brouillon**
(`OF_DRAFTS=1`) jusqu'au choix de l'hébergeur et du nom de domaine par Ismail.

## 1. Ce qui change par rapport au brouillon actuel

Aujourd'hui : adresse email → lien → code de récupération → page « Votre compte ». Il manque l'accueil d'un nouveau
compte : ses coordonnées, ses choix d'emails et ses premiers pas. Cible :

1. **Adresse email** (seule information obligatoire) → « Consultez votre boîte » (inchangé).
2. **Le lien** ouvre la page, vérifie le jeton et, pour un compte nouveau, affiche **« Bienvenue »** : une seule
   question, facultative, la lettre d'information (case non cochée).
3. **Code de récupération** (écran existant de C4), qui chiffre l'Espace.
4. **« Votre compte »** avec une carte **« Premiers pas »** : décrire son entreprise, ajouter adresse et SIRET, créer
   un premier devis ou une première facture, ajouter une clé d'accès ; et des outils suggérés selon l'activité.

**Révision du 23/10/2026, avant le code** : la première version prévoyait un écran « Vos informations » (prénom,
pays, statut, activité, nom commercial). L'Espace a déjà son accueil, où l'on décrit son entreprise (nom, activité,
TVA, déclaration Urssaf) : un second formulaire ferait saisir deux fois la même chose, dans deux formats. La carte
« Premiers pas » renvoie donc vers cet accueil ; le prénom n'est pas demandé (aucun usage aujourd'hui) et le pays est
celui de la section.

## 2. Où va chaque donnée

| Donnée | Où | Pourquoi |
|---|---|---|
| Adresse email | Serveur, en clair | Envoyer les liens de connexion ; seule donnée exigée |
| Langue des emails | Serveur, en clair | Écrire les emails du service dans la langue du compte |
| Choix d'emails (lettre d'information) et preuve du choix (date, version du texte affiché) | Serveur, en clair | Le serveur envoie ces emails ; le consentement doit pouvoir être démontré (RGPD, art. 7, § 1) |
| Nom de l'entreprise, activité, TVA (accueil de l'Espace), puis adresse, SIRET, IBAN (réglages de l'Espace) | **Profil de l'Espace**, chiffré sur l'appareil avant la synchronisation | Préremplir les documents ; le serveur n'en a pas besoin (minimisation, RGPD, art. 5, § 1, c) |

Rien d'autre n'est demandé à l'inscription. Le pays est celui de la section du site (le compte n'existe pour
l'instant qu'en France, comme l'Espace).

## 3. Choix d'emails

- Emails **du service**, toujours envoyés, sans case : liens de connexion (et, plus tard, alertes de sécurité). Ce ne
  sont pas des emails de prospection.
- **Lettre d'information** (nouveaux outils, changements de règles) : case **non cochée**, séparée des conditions
  d'utilisation, modifiable à tout moment dans « Votre compte » et par un lien dans chaque lettre. Règles de la CNIL :
  le consentement à la prospection par email demande une action positive, une case pré-cochée est interdite, et
  l'acceptation des conditions générales ne suffit pas ; pour des professionnels, une possibilité d'opposition suffit
  en principe, mais le site choisit le consentement dans tous les cas (plus simple, plus sûr, mêmes règles dans les
  quatre pays). À relire avec les autres règles des quatre pays avant l'ouverture.
- **Rappels d'échéances** (étape C5) : fonction du compte, activée dans les réglages, pas une case d'inscription.

## 4. Écrans et textes (France)

- **Bienvenue** (titre au focus) : « Bienvenue : votre compte est créé » ; « Encore deux étapes : une question
  facultative, puis le code qui protège vos données. » Case non cochée : « Recevoir la lettre d'information d'Outils
  Freelance : nouveaux outils et changements de règles qui vous concernent » ; aide : « Facultatif. Désinscription à
  tout moment, en un clic, depuis chaque lettre ou depuis votre compte. » Bouton « Continuer ». La fréquence des
  lettres n'est pas annoncée tant qu'Ismail ne l'a pas fixée. Le texte affiché a une version (`fr-2026-10-23`),
  enregistrée avec le choix ; un nouveau texte aura une nouvelle version.
- **Premiers pas** (carte de « Votre compte », cochée automatiquement d'après l'Espace de l'appareil et le compte) :
  décrire votre entreprise (accueil de l'Espace) ; ajouter votre adresse et votre SIRET (réglages) ; créer votre premier
  devis ou votre première facture ; ajouter une clé d'accès (étape absente si l'appareil ne le permet pas). Compte
  « 1 étape faite sur 4 », puis « Tout est prêt ». Outils suggérés : simulateur et calendrier des déclarations en
  micro-entreprise (règle `micro_activities`), facturation électronique sinon, recherche de nom de domaine toujours.
- **Emails** (rubrique de « Votre compte ») : la même case, pour s'inscrire ou se désinscrire à tout moment.
- Accessibilité : titre mis au focus à chaque écran (comme C4), « Fait : » lu par les lecteurs d'écran devant chaque
  étape faite, tout au clavier, cibles de taille suffisante sur mobile.

## 5. Serveur

- `GET /me` rend aussi `prefs` : `{ lang, newsletter: { value, at, wording } }`.
- `PUT /me/prefs` `{ lang?, newsletter? }` : enregistre le choix avec sa date et la version du texte affiché ;
  `newsletter: false` garde la date du retrait. Mêmes protections que les autres requêtes qui modifient (session,
  `X-OF-Request`, origine).
- `GET /export` inclut `prefs` ; la suppression du compte les efface.
- Tests : choix enregistré et rendu, preuve gardée, retrait, refus sans session, export, aucune donnée du profil sur le
  serveur.

## 6. Tests

- Tests serveur ci-dessus ; tests du moteur des premiers pas (`engines/first-steps.js` : étapes cochées d'après
  l'Espace et le compte, clé d'accès selon l'appareil, outils selon l'activité) ; parcours navigateur des brouillons
  (`tests/e2e/comptes.mjs`) : compte nouveau → Bienvenue → code → « Votre compte » ; compte existant qui se reconnecte
  (pas d'écran Bienvenue) ; case non cochée par défaut ; choix enregistré avec sa date et sa version ; désinscription
  depuis le compte ; étape « clé d'accès » cochée après l'ajout ; accessibilité ; mobile.

## 7. Sources à relire avant l'ouverture

- CNIL, *La prospection commerciale par courrier électronique, SMS-MMS et automate d'appel* (lu par extraits le
  23/10/2026).
- RGPD (règlement (UE) 2016/679), art. 5 et 7 (EUR-Lex).
- Autres pays (lus par extraits le 23/10/2026, à relire avant d'ouvrir les comptes hors de France) :
  - **Royaume-Uni**, ICO, *Electronic mail marketing* (PECR) : les *sole traders* sont traités comme des particuliers,
    il faut leur consentement (ou la *soft opt-in*, qui ne s'applique pas à une inscription gratuite sans vente) ;
  - **Canada**, CRTC, FAQ de la LCAP : consentement exprès par une action positive, pas de case pré-cochée, preuve à la
    charge de l'expéditeur ; désinscription traitée en 10 jours ouvrables au plus (ISDE) ;
  - **États-Unis**, FTC, *CAN-SPAM Act: A Compliance Guide for Business* : lien de désinscription qui fonctionne au
    moins 30 jours après l'envoi, demande traitée en 10 jours ouvrables, sans rien exiger d'autre que l'adresse.
  Le choix du § 3 (case non cochée, preuve gardée, désinscription en un clic et immédiate) respecte les quatre pays.

## 8. Tâches d'Ismail

- **[Ismail]** Hébergeur et nom de domaine (déjà en attente) : ils décident de l'ouverture.
- **[Ismail]** Envoyer ou non une lettre d'information, et à quelle fréquence au plus.

## 9. Réalisation (23/10/2026, brouillon)

- Serveur : préférences du compte (`prefs` : langue de l'inscription, lettre d'information avec date et version du
  texte), `PUT /me/prefs`, export, suppression avec le compte ; mémoire et SQLite (table `prefs`). Tests : 2 nouveaux
  (un par stockage) et le contrat du stockage ; 11 erreurs réintroduites, toutes détectées (une après l'ajout d'un test
  avec une langue sans page de compte).
- Page du compte (brouillon) : écran Bienvenue, carte Premiers pas, rubrique Emails ; moteur `engines/first-steps.js`
  (4 tests) ; parcours navigateur des comptes : 46 vérifications, accessibilité comprise ; captures relues sur
  ordinateur et mobile.
