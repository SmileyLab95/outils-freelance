# 34. Inscription et premiers pas du compte gratuit

Suite de la [vision](31-vision-plateforme.md) (§ 2.1 et 2.2, ordre de réalisation § 5, étape 3) et des comptes déjà
construits en brouillon ([12](12-specification-comptes.md), [23](23-serveur-et-connexion.md) : connexion par lien,
clés d'accès, coffre chiffré de bout en bout). Spécification avant le code, 23/10/2026. Tout reste en **brouillon**
(`OF_DRAFTS=1`) jusqu'au choix de l'hébergeur et du nom de domaine par Ismail.

## 1. Ce qui change par rapport au brouillon actuel

Aujourd'hui : adresse email → lien → code de récupération → page « Votre compte ». Il manque l'accueil d'un nouveau
compte : ses coordonnées, ses choix d'emails et ses premiers pas. Cible :

1. **Adresse email** (seule information obligatoire) → « Consultez votre boîte » (inchangé).
2. **Le lien** ouvre la page, vérifie le jeton et, pour un compte nouveau, affiche **« Bienvenue »**.
3. **Vos informations, en un écran, toutes facultatives** : prénom, pays et langue (préremplis par la section du
   site), statut (liste propre au pays), activité, nom commercial ; puis les **choix d'emails**, cases non cochées.
4. **Code de récupération** (écran existant de C4), qui chiffre ces informations avec le reste de l'Espace.
5. **Tableau de bord** : l'accueil de l'Espace, avec une carte « Premiers pas » adaptée au pays et au statut.

## 2. Où va chaque donnée

| Donnée | Où | Pourquoi |
|---|---|---|
| Adresse email | Serveur, en clair | Envoyer les liens de connexion ; seule donnée exigée |
| Langue des emails | Serveur, en clair | Écrire les emails du service dans la langue du compte |
| Choix d'emails (lettre d'information) et preuve du choix (date, version du texte affiché) | Serveur, en clair | Le serveur envoie ces emails ; le consentement doit pouvoir être démontré (RGPD, art. 7, § 1) |
| Prénom, pays, statut, activité, nom commercial | **Profil de l'Espace**, chiffré sur l'appareil | Préremplir les outils ; le serveur n'en a pas besoin (minimisation, RGPD, art. 5, § 1, c) |
| SIRET, adresse, IBAN | Profil de l'Espace, plus tard, quand un document en a besoin | Jamais demandés à l'inscription |

Le pays n'est donc **pas** obligatoire au sens du serveur : il est prérempli par la section (France, États-Unis…) et
sert au tableau de bord ; le visiteur peut le changer ou le laisser.

## 3. Choix d'emails

- Emails **du service**, toujours envoyés, sans case : liens de connexion, alertes de sécurité (nouvel appareil,
  suppression du compte). Ce ne sont pas des emails de prospection.
- **Lettre d'information** (nouveaux outils, changements de règles) : case **non cochée**, séparée des conditions
  d'utilisation, modifiable à tout moment dans « Votre compte » et par un lien dans chaque lettre. Règles de la CNIL :
  le consentement à la prospection par email demande une action positive, une case pré-cochée est interdite, et
  l'acceptation des conditions générales ne suffit pas ; pour des professionnels, une possibilité d'opposition suffit
  en principe, mais le site choisit le consentement dans tous les cas (plus simple, plus sûr, mêmes règles dans les
  quatre pays). À relire avec les autres règles des quatre pays avant l'ouverture.
- **Rappels d'échéances** (étape C5) : fonction du compte, activée dans les réglages, pas une case d'inscription.

## 4. Écrans et textes (France ; mêmes écrans dans les autres sections)

- **Bienvenue** : « Votre compte est créé. Deux minutes pour le préparer : tout est facultatif. »
- **Vos informations** : Prénom ; Pays (liste des quatre pays et « Autre ») ; Statut (micro-entreprise, entreprise
  individuelle au réel, société, je n'ai pas encore créé mon entreprise ; équivalents par pays) ; Activité ; Nom
  commercial. Case : « Recevoir la lettre d'information d'Outils Freelance » (aide : « Au plus une par mois ;
  désinscription en un clic. » — fréquence à décider par Ismail). Boutons : « Continuer », « Passer cette étape ».
- **Code de récupération** : écran actuel de C4.
- **Premiers pas** (carte du tableau de bord, cochée automatiquement quand c'est fait) : compléter le profil
  d'entreprise ; créer un premier devis ou une première facture ; ajouter une clé d'accès ; selon le pays et le
  statut, un outil clé (France, micro-entreprise : simulateur et calendrier des déclarations ; États-Unis : acomptes
  trimestriels ; Royaume-Uni : *Making Tax Digital* ; Canada : TPS/TVH) ; chercher un nom de domaine si l'activité
  n'a pas de site.
- Accessibilité : un seul formulaire par écran, titre mis au focus à chaque écran (comme C4), erreurs reliées aux
  champs, tout au clavier, cibles de 44 px sur mobile.

## 5. Serveur

- `GET /me` rend aussi `prefs` : `{ lang, newsletter: { value, at, wording } }`.
- `PUT /me/prefs` `{ lang?, newsletter? }` : enregistre le choix avec sa date et la version du texte affiché ;
  `newsletter: false` garde la date du retrait. Mêmes protections que les autres requêtes qui modifient (session,
  `X-OF-Request`, origine).
- `GET /export` inclut `prefs` ; la suppression du compte les efface.
- Tests : choix enregistré et rendu, preuve gardée, retrait, refus sans session, export, aucune donnée du profil sur le
  serveur.

## 6. Tests

- Tests serveur ci-dessus ; tests du moteur des premiers pas (selon le pays et le statut, état coché d'après les
  données de l'Espace) ; parcours navigateur des brouillons (`tests/e2e/comptes.mjs`) : compte nouveau → Bienvenue →
  informations → code → tableau de bord ; « Passer cette étape » ; compte existant qui se reconnecte (pas d'écran
  Bienvenue) ; case non cochée par défaut ; accessibilité ; mobile.

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
