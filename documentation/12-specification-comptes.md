# 12. Spécification : comptes en ligne (étape E2), première version

Rédigée le 20/10/2026 pour préparer l'étape 2 du [plan](07-plan-de-developpement.md) et les décisions d'Ismail.
Elle part de l'Espace local existant ([09](09-specification-espace.md)) et de l'[étude concurrentielle](11-etude-concurrentielle.md).
Les coûts cités sont des **ordres de grandeur relevés dans des comparatifs**, à vérifier sur les grilles officielles.

## 1. Principes

1. **L'Espace reste utilisable sans compte** (décision D7) : le compte ajoute des services, il ne retire rien.
2. **Local d'abord** : les données restent sur l'appareil et l'Espace fonctionne hors connexion ; le compte synchronise.
3. **Confidentialité par défaut** : les données de gestion (clients, factures) sont **chiffrées sur l'appareil** avant
   d'être envoyées (voir l'option recommandée, § 4) ; le serveur ne lit que ce que l'utilisateur choisit de partager
   pour un service précis (par exemple un devis à faire accepter en ligne).
4. **Hébergement dans l'Union européenne**, contrat de sous-traitance (article 28 du RGPD) avec chaque prestataire.
5. Même exigence de qualité que le reste du site : spécification, tests, revue, rendu relu.

## 2. Ce que le compte apporte

| Fonction | Sans compte (aujourd'hui) | Compte gratuit | Offre « Pro » (proposition) |
|---|---|---|---|
| Outils publics, Espace local, Factur-X | Oui | Oui | Oui |
| Sauvegarde en ligne chiffrée | Export manuel | Oui | Oui |
| Synchronisation entre appareils | Non | 2 appareils | Illimitée |
| Rappels d'échéances par email (Urssaf, TVA, CFE) | Non | Oui | Oui |
| Relances automatiques des factures en retard | Email prérempli | Non | Oui |
| Devis accepté en ligne par le client (lien sécurisé) | Non | Non | Oui |
| Envoi des factures depuis la plateforme | Non | Non | Oui |
| Export comptable (fichier pour l'expert-comptable) | CSV des recettes | Oui | Oui |

Le prix de l'offre « Pro » est une **décision d'Ismail** (en attente). Repères de l'étude concurrentielle : la
facturation de base est gratuite chez les grands acteurs français ; leurs offres payantes se situent autour de 9 à
20 € HT par mois et incluent la comptabilité. Une offre « Pro » centrée sur l'automatisation devrait rester **en
dessous** de ces prix.

## 3. Données et synchronisation

- Le schéma actuel (version 1) a déjà des identifiants uniques et des dates de création et de modification.
- **Schéma 2** (à l'ouverture des comptes) : suppression marquée (`deletedAt`) plutôt qu'effacée, pour qu'un appareil
  apprenne qu'un brouillon ou un client a été supprimé ailleurs ; numéro de version par enregistrement.
- **Règle de fusion** : par enregistrement (client, document), le plus récent l'emporte ; un document **émis** ne
  change plus (seuls ses encaissements s'ajoutent), donc les conflits portent sur des brouillons et des fiches.
- **Numérotation** : deux appareils hors connexion pourraient émettre le même numéro. Règle proposée : l'émission
  demande une connexion quand plusieurs appareils sont liés (le serveur réserve le numéro), sinon elle reste locale.
- Import de l'Espace local dans le compte au premier lien (tâche de la feuille de route), sans perte ni doublon.

## 4. Options d'architecture

| Option | Description | Avantages | Limites |
|---|---|---|---|
| A. Plateforme managée (type Supabase, région UE) | Base PostgreSQL, authentification et règles d'accès par ligne fournies | Mise en route rapide ; offre « Pro » vers 25 $/mois relevée | Éditeur non européen ; données lisibles par le serveur |
| B. Hébergeur français (Scaleway, OVHcloud, Clever Cloud) et API maison | Base PostgreSQL managée et petite API | Souveraineté ; base managée dès quelques euros par mois relevés | Plus de développement (authentification, règles d'accès) |
| C. Synchronisation chiffrée de bout en bout | L'appareil chiffre les données ; le serveur stocke des blocs illisibles | Promesse de confidentialité tenue ; risque réduit en cas de fuite | Fonctions serveur (rappels, devis en ligne) limitées aux données que l'utilisateur partage |

**Recommandation** : **C hébergée selon B** : synchronisation chiffrée de bout en bout, sur un hébergeur français ;
les services qui exigent une lecture côté serveur (rappels, devis en ligne, envoi) n'utilisent que les données
strictement nécessaires, partagées explicitement par l'utilisateur. Décision technique à confirmer (D15), après le
choix de l'hébergeur et du budget par Ismail.

## 5. Sécurité

- Connexion par **lien envoyé par email** et clés d'accès (passkeys, WebAuthn) ; double authentification proposée.
- Clé de chiffrement dérivée sur l'appareil ; phrase de récupération affichée une seule fois (sans elle, des données
  chiffrées perdues ne se récupèrent pas : l'écran le dit clairement).
- Limites de requêtes, journal des connexions, sauvegardes quotidiennes chiffrées, restauration testée chaque mois.
- Tests de sécurité avant l'ouverture : revue de code dédiée, tests d'intrusion simples (injection, accès entre
  comptes, rejeu de lien de connexion).

## 6. Obligations (RGPD et contrats)

- Mise à jour de la politique de confidentialité ; registre des traitements ; contrats de sous-traitance avec
  l'hébergeur et le service d'envoi d'emails.
- Droits des personnes : export complet et suppression du compte depuis les réglages.
- CGU (service gratuit) et CGV (offre « Pro ») ; **relecture par un avocat** (tâche d'Ismail, feuille de route E2.1).

## 7. Étapes et critères

| Étape | Contenu | Critère |
|---|---|---|
| C1 | Décisions : hébergeur, budget, structure juridique (Ismail) ; D15 (Claude) | Décisions notées au journal |
| C2 | Schéma 2 et moteur de synchronisation, testés sans serveur (simulation de deux appareils) | Fusion et suppressions correctes sur 50 scénarios |
| C3 | Serveur : authentification, stockage chiffré, limites, sauvegardes | Tests d'accès entre comptes : aucun accès |
| C4 | Interface : création de compte, lien d'appareils, phrase de récupération, import de l'Espace local | Parcours navigateur complet, captures relues |
| C5 | Rappels par email (service d'envoi européen) | Rappels reçus aux bonnes dates sur un compte de test |
| C6 | Bêta privée avec la liste d'attente | Retours traités, aucun incident de sécurité |

## 8. Décisions et tâches d'Ismail

- [ ] **[Ismail]** Choisir l'hébergeur (Claude fournit le comparatif chiffré à jour avant la décision) et ouvrir le compte.
- [ ] **[Ismail]** Valider le budget mensuel de départ (hébergement, envoi d'emails, nom de domaine).
- [ ] **[Ismail]** Structure juridique pour encaisser des abonnements, avec un expert-comptable.
- [ ] **[Ismail]** Prix de l'offre « Pro » (après vérification des prix des concurrents).
