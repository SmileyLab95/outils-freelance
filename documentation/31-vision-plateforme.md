# 31. Vision : la plateforme complète du freelance

Demande d'Ismail du 23/10/2026 : « un compte gratuit où il y a tous les outils gratuits (compte par email et autres
coordonnées, confirmation de l'email), puis le compte Pro ; la possibilité de donation ; un site très clair, très
simple, très moderne, qui contient vraiment tout ce dont un freelance a besoin, pas seulement la comptabilité (par
exemple chercher des noms de domaine, en affiliation) ; essaie de tout imaginer ». Réponse d'Ismail à la question
de Claude : **les outils restent ouverts sans compte ; le compte gratuit sert à tout garder** (décision D30).

Ce document complète le [plan de développement](07-plan-de-developpement.md) (modules, offres cibles), la
[spécification des comptes](12-specification-comptes.md) et la [matrice des besoins](02-besoins-clients.md). Il fixe
la cible ; chaque module garde son circuit habituel (spécification, sources officielles, tests, captures, revue).

## 1. La promesse

**Tout ce dont un indépendant a besoin, au même endroit, gratuit, clair et sûr**, dans quatre pays et deux langues :

- **Gratuit pour l'essentiel** : chaque outil s'ouvre sans compte ; le compte gratuit réunit tout (tableau de bord,
  clients, documents, rappels, sauvegarde) ; le Pro automatise ; les dons soutiennent le projet.
- **Juste** : chaque chiffre vient d'une source officielle citée et datée ; ce qui n'est pas confirmé n'est pas affiché.
- **Privé** : les données de gestion sont chiffrées sur l'appareil avant d'être synchronisées (D15) ; ni publicité
  ciblée ni revente de données ; un lien partenaire est toujours signalé et ne change jamais un résultat.
- **Simple** : une question par écran, un vocabulaire de tous les jours, un résultat lisible en trois secondes.

## 2. Les quatre niveaux d'accès

| Niveau | Pour qui | Ce qu'il apporte | Prix |
|---|---|---|---|
| **Visiteur** | Tout le monde, depuis Google ou un lien | Tous les outils, calculs dans le navigateur, saisie gardée sur l'appareil | Gratuit |
| **Compte gratuit** | Tout freelance | Tableau de bord, profil d'entreprise prérempli dans tous les outils, clients, devis, factures, encaissements, rappels d'échéances par email, sauvegarde chiffrée et synchronisation, historique de ses documents, favoris | Gratuit |
| **Pro** | Freelance actif | Automatisation : relances automatiques, devis signé en ligne par le client, envoi des factures, liens de paiement, facturation électronique par plateforme agréée, exports comptables, page publique (portfolio et carte de visite), appareils illimités | Décision d'Ismail ([17](17-offres-et-paiements.md) : 5 € HT par mois proposé) |
| **Soutien** | Ceux qui veulent aider | Don ponctuel ou mensuel, remerciement, aucune fonction réservée | Libre |

Règle : le compte gratuit n'est jamais bridé pour pousser au Pro sur l'essentiel (facturer juste, déclarer juste) ;
le Pro vend du temps gagné, pas l'accès à la conformité.

### 2.1 Inscription (compte gratuit)

1. **Email** (obligatoire) → lien de confirmation envoyé ; cliquer sur le lien confirme l'adresse et ouvre la
   session (connexion sans mot de passe, déjà construite en brouillon : [23](23-serveur-et-connexion.md), C3 et C4) ;
   clé d'accès (empreinte, visage, code de l'appareil) proposée ensuite pour se reconnecter en un geste.
2. **Coordonnées, en un écran, toutes facultatives sauf le pays** : prénom, pays et langue (préremplis), statut
   (micro-entreprise, entreprise individuelle au réel, société ; équivalents des autres pays), activité, nom
   commercial. Les coordonnées d'entreprise (SIRET, adresse, IBAN) se remplissent plus tard, dans le profil, quand un
   document en a besoin : elles sont chiffrées sur l'appareil.
3. **Consentements séparés et non cochés** : lettre d'information, conseils par email ; conditions d'utilisation et
   politique de confidentialité acceptées par l'inscription (minimisation des données, RGPD art. 5 ; à vérifier aux
   sources de la CNIL avant ouverture).
4. **Bienvenue** : tableau de bord avec une liste de premiers pas adaptée au statut et au pays (compléter le profil,
   créer un premier devis, activer les rappels, ajouter une clé d'accès), et le code de récupération à conserver.

### 2.2 Le tableau de bord (compte gratuit)

- En haut : **ce qui demande une action** (factures en retard, devis à relancer, prochaine échéance fiscale avec son
  montant estimé, seuils approchés).
- Au centre : chiffre d'affaires du mois et de l'année, encaissé et à encaisser, part à mettre de côté.
- Raccourcis : nouveau devis, nouvelle facture, nouveau client, recherche d'un outil.
- À droite : favoris et derniers outils utilisés.

## 3. La carte des besoins : tout ce dont un freelance a besoin

État au 28/10/2026 : ✅ publié (4 pays sauf mention), 🧱 brouillon prêt, ⬜ à faire. « Accès » : V visiteur,
G compte gratuit, P Pro, ⇄ partenaire signalé.

### 3.1 Démarrer

| Besoin | Outil | État | Accès |
|---|---|---|---|
| Choisir son statut | Comparateurs de statuts, salarié ou freelance | ✅ | V |
| Créer son entreprise | Checklists de création | ✅ | V |
| Trouver un nom | Idées de noms et vérification : registres officiels (INPI, Companies House, registres provinciaux), marques | ⬜ | V |
| **Nom de domaine et email pro** | Recherche de disponibilité (protocole RDAP, norme de l'IETF), idées de variantes, marques à vérifier, listes officielles de registraires ([33](33-noms-de-domaine.md)) ; liens partenaires après l'inscription d'Ismail | ✅ (partenaires ⬜) | V, ⇄ |
| Site ou portfolio | Page publique hébergée sur la plateforme (carte de visite, réalisations, contact) ; comparatif des créateurs de sites | ⬜ | P, ⇄ |
| Identité visuelle | Générateur de signature d'email, carte de visite avec QR code, palette et logo simple | ⬜ | V |
| Banque pro | Vérificateurs du compte obligatoire ; comparatif des banques en ligne | ✅ / ⬜ | V, ⇄ |
| Assurance | Vérificateurs d'obligations ; comparatif d'assureurs | ✅ / ⬜ | V, ⇄ |
| Adresse | Guide domicile, domiciliation, adresse commerciale | ⬜ | V, ⇄ |

### 3.2 Trouver des clients

| Besoin | Outil | État | Accès |
|---|---|---|---|
| Écrire aux prospects | Modèles d'emails (prospection, relance de devis, objections, hausse) | ✅ | V |
| Convaincre | Proposition commerciale | ✅ | V |
| Suivre ses prospects | Mini-CRM : prospects, étapes (contact, proposition, devis, gagné, perdu), rappels ([38](38-prospects.md)) | ✅ (France) | G |
| Se rendre visible | Page publique, guide LinkedIn et plateformes ; comparatif des plateformes de freelances (frais, paiement) | ⬜ | P, V |
| Réseau | Annuaire et entraide entre freelances (plus tard, modération) | ⬜ | G |

### 3.3 Fixer ses prix

| Besoin | Outil | État | Accès |
|---|---|---|---|
| Tarif journalier ou horaire | Calculateurs de TJM et de taux horaire | ✅ | V |
| Prix d'un projet | Prix au forfait, convertisseur de tarifs | ✅ | V |
| Augmenter ses tarifs | Calculateur et modèle d'annonce | ✅ | V |
| Clients en devises | Convertisseur aux taux de référence officiels (BCE, Banque d'Angleterre, Banque du Canada, Réserve fédérale) | ⬜ | V |

### 3.4 Vendre et contractualiser

| Besoin | Outil | État | Accès |
|---|---|---|---|
| Devis | Générateur et Espace | ✅ | V, G |
| Contrat de prestation | Générateur | ✅ | V |
| Accord de confidentialité | Générateur | ✅ | V |
| CGV / *terms of service* | Générateur ([40](40-cgv.md)) | ✅ (France) ; ⬜ autres pays | V |
| Sous-traitance, avenant, bon de commande | Générateurs | ⬜ | V |
| Signature du client | Devis ou contrat accepté en ligne (lien sécurisé, preuve horodatée) | ⬜ | P |

### 3.5 Facturer et encaisser

| Besoin | Outil | État | Accès |
|---|---|---|---|
| Factures conformes, avoirs, numérotation | Générateur, Espace, mentions obligatoires | ✅ | V, G |
| Facturation électronique | Factur-X, guide, plateforme agréée (2026-2027) | ✅ / ⬜ | G, P |
| Client étranger, W-8BEN | Assistants | ✅ | V |
| Relances et pénalités | Modèles, calculateurs ; relances automatiques | ✅ / ⬜ | V, P |
| Être payé en ligne | Liens de paiement (prestataire de paiement choisi par Ismail) | ⬜ | P, ⇄ |
| Recouvrement en justice | Guides (France en attente des textes) | ✅ | V |
| Suivre le temps passé | Chronomètre et feuilles de temps, transformés en facture ([37](37-temps-passe.md)) | ✅ (France, saisie ; chronomètre ⬜) | G |

### 3.6 Gérer

| Besoin | Outil | État | Accès |
|---|---|---|---|
| Recettes et encaissements | Livre des recettes, Espace | ✅ | G |
| Dépenses et justificatifs | Saisie, photo du justificatif, registre des achats ([36](36-depenses-et-registre-des-achats.md)) | ✅ (France, saisie et registre ; justificatifs ⬜) | G, P |
| Frais | Barème kilométrique, bureau à domicile | ✅ | V |
| Trésorerie | Prévision : encaissements attendus, charges, part à mettre de côté ([39](39-tresorerie.md)) | ✅ (France) | G |
| Matériel | Registre des immobilisations et amortissement (régimes réels) | ⬜ | G |
| Comptable | Export pour l'expert-comptable, accès en lecture | ⬜ | P |

### 3.7 Déclarer

| Besoin | Outil | État | Accès |
|---|---|---|---|
| Cotisations et impôt | Simulateurs, « combien mettre de côté », jauges de seuils | ✅ | V |
| Échéances | Calendriers fiscaux (.ics) ; rappels par email avec montant estimé | ✅ / ⬜ | V, G |
| Préparer la déclaration | Montants à déclarer calculés depuis le livre des recettes | 🧱 (France) | G |

### 3.8 Se protéger et épargner

| Besoin | Outil | État | Accès |
|---|---|---|---|
| Retraite | Simulateurs PER, SEP-IRA et Solo 401(k), pension, REER | ✅ | V |
| Arrêt maladie, maternité, accident | Guides des droits selon le statut et le pays | ⬜ | V |
| Chômage et fin d'activité | Guides (allocation des travailleurs indépendants, équivalents) | ⬜ | V |
| Prévoyance, mutuelle | Guides ; comparatif | ⬜ | V, ⇄ |
| Congés et équilibre | Jours facturables dans les calculateurs ; planificateur de congés | ✅ / ⬜ | V, G |

### 3.9 Se développer

| Besoin | Outil | État | Accès |
|---|---|---|---|
| Passer en société | Guides de changement de statut | ✅ | V |
| Se former | Droits à la formation des indépendants (fonds d'assurance formation, équivalents), académie de guides | ⬜ | V |
| Logiciels | Comparatifs neutres (facturation, comptabilité, gestion de projet, design) | ⬜ | V, ⇄ |
| Se faire accompagner | Annuaire d'experts vérifiés (comptables, avocats) | ⬜ | ⇄ |
| Équipe | Sous-traitance, collaborateurs, plusieurs utilisateurs | ⬜ | P |

### 3.10 Outils du quotidien

Recherche de tout le site (une barre et le raccourci clavier `/`), calculateur de jours ouvrés et de délais,
fuseaux horaires des clients, générateur de QR code, convertisseur de devises, compteur de temps, modèles de messages.

## 4. Revenus, sans trahir la promesse

| Source | Règle |
|---|---|
| Pro | Prix et prestataire : décision d'Ismail ([17](17-offres-et-paiements.md)). |
| Dons | Page « Soutenir » et rappel discret en bas des outils ; aucune fonction réservée aux donateurs. Pour une entreprise, un don reçu n'ouvre pas droit à un reçu fiscal et compte en principe dans les recettes : à vérifier aux sources officielles et avec l'expert-comptable d'Ismail avant publication. |
| Affiliation (domaines, hébergement, banques, assurances, logiciels) | Lien signalé à côté du bouton (« lien partenaire : nous pouvons toucher une commission ») ; classement et résultats identiques avec ou sans partenaire ; au moins une option sans commission quand elle existe ; règles de transparence de chaque pays vérifiées aux sources officielles avant activation. Programmes d'affiliation : inscription par Ismail. |
| Kit et produits numériques | Gumroad, à la fin (D10). |
| Publicité | Aucune dans les outils ni dans le compte. |

## 5. Ordre de réalisation proposé

1. **Refonte du design** (doc 32) : système de design, icônes, navigation par étapes de la vie du freelance, recherche,
   nouvel accueil, appel à créer un compte gratuit dès que les comptes ouvrent.
2. **Recherche de noms de domaine** (publique, sans partenaire au départ ; liens partenaires après l'inscription
   d'Ismail aux programmes) : publiée le 23/10/2026 ([33](33-noms-de-domaine.md)).
3. **Inscription et tableau de bord du compte gratuit** (brouillon jusqu'au choix de l'hébergeur et du domaine) :
   écran Bienvenue, lettre d'information et premiers pas prêts en brouillon le 23/10/2026 ([34](34-inscription-compte-gratuit.md)).
4. **Pages Offres et Soutenir** (brouillon jusqu'aux choix d'Ismail : prix du Pro, prestataire de paiement et de dons) :
   brouillons et comparatif des solutions de dons prêts le 23/10/2026 ([35](35-offres-et-soutien.md)).
5. Modules du compte gratuit : prospects, temps passé, dépenses, trésorerie : faits du 23 au 29/10/2026
   ([36](36-depenses-et-registre-des-achats.md) à [39](39-tresorerie.md)).
6. Outils restants : CGV (France faite le 29/10/2026, [40](40-cgv.md)), sous-traitance, devises, jours ouvrés (France faite le
   29/10/2026, [42](42-jours-ouvres.md)), signature d'email,
   guides de protection sociale.
7. Pro : relances automatiques, signature en ligne, liens de paiement, page publique, plateforme agréée.

## 6. Tâches d'Ismail

- [ ] **[Ismail]** Hébergeur et nom de domaine (bloquent l'ouverture des comptes ; [13](13-comparatif-hebergeurs.md)).
- [ ] **[Ismail]** Prix du Pro et prestataire de paiement ([17](17-offres-et-paiements.md)).
- [ ] **[Ismail]** Solution de dons (comparatif et règles fiscales préparés par Claude avant la page « Soutenir »).
- [ ] **[Ismail]** Inscription aux programmes d'affiliation (registraires, hébergeurs, banques, assurances), après
      le comparatif et les règles de transparence préparés par Claude.
- [ ] **[Ismail]** Relecture des CGU, de la politique de confidentialité et des CGV du Pro par un avocat.
