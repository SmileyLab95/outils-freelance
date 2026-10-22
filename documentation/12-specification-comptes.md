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

Le prix de l'offre « Pro » est une **décision d'Ismail** (en attente ; grille, frais de paiement et abonnés
nécessaires : [17](17-offres-et-paiements.md)). Repères de l'étude concurrentielle : la facturation de base est
gratuite chez les grands acteurs français ; leurs premières formules payantes sont à 9 à
10 € HT par mois avec un engagement annuel (relevé du 20/10/2026 sur leurs sites) et incluent la comptabilité. Une
offre « Pro » centrée sur l'automatisation devrait rester **en dessous** de ces prix (proposition de Claude : 4 à
6 € HT par mois ; hébergement estimé à 20 à 30 € HT par mois au départ, [13](13-comparatif-hebergeurs.md)).

## 3. Données et synchronisation

- Le schéma actuel (version 1) a déjà des identifiants uniques et des dates de création et de modification.
- **Schéma 2** (à l'ouverture des comptes) : suppression marquée (`deletedAt`) plutôt qu'effacée, pour qu'un appareil
  apprenne qu'un brouillon ou un client a été supprimé ailleurs ; numéro de version par enregistrement.
- **Règle de fusion** : par enregistrement (client, document), le plus récent l'emporte ; un document **émis** ne
  change plus (seuls ses encaissements s'ajoutent), donc les conflits portent sur des brouillons et des fiches.
- **Numérotation** : deux appareils hors connexion pourraient émettre le même numéro. Règle proposée : l'émission
  demande une connexion quand plusieurs appareils sont liés (le serveur réserve le numéro), sinon elle reste locale.
- Import de l'Espace local dans le compte au premier lien (tâche de la feuille de route), sans perte ni doublon.

### 3.1 Règles du moteur de synchronisation (étape C2, `engines/espace-sync.js`)

Le moteur fusionne trois états : la **base** (le dernier état commun, enregistré à la dernière synchronisation), l'état
**local** et l'état **distant**. Il ne dépend ni du serveur ni du chiffrement : il travaille sur des données en clair,
sur l'appareil.

| Cas | Règle |
|---|---|
| Champ modifié d'un seul côté depuis la base | La modification est gardée. |
| Même champ modifié des deux côtés | La version la plus récente (`updatedAt`) l'emporte ; le conflit est signalé. |
| Enregistrement créé d'un seul côté | Il est ajouté. |
| Supprimé d'un côté, modifié de l'autre | La modification l'emporte (aucune perte de saisie) ; signalé. |
| Supprimé des deux côtés | Supprimé, sans conflit ; la première date de suppression est gardée. |
| Effacé sur un appareil encore au schéma 1 (sans marque) | Retiré s'il n'a pas changé ailleurs ; sinon gardé et signalé. Un document émis est toujours gardé. |
| Brouillon émis sur un appareil, modifié sur l'autre | Le document émis l'emporte (l'émission est définitive) ; si le brouillon modifié diffère, une **copie en brouillon** est gardée ; signalé. Au premier lien (sans base commune), toute différence compte. Un brouillon supprimé n'est pas recopié. Si ce brouillon est encore modifié sur le second appareil avant qu'il ait reçu la copie, les modifications **rejoignent la même copie**. |
| Même brouillon émis sur deux appareils | Deux numéros différents, ou le même numéro avec un contenu différent : les **deux documents émis sont gardés** (la première émission garde l'identifiant, l'autre devient un document distinct), chacun avec ses encaissements ; signalé, à régulariser par un avoir. Même numéro et même contenu : un seul document, daté de la première émission. L'appareil qui avait la seconde émission la retrouve dans le document distinct, avec les encaissements saisis depuis. |
| Encaissements d'un document | Réunis, puis fusionnés champ par champ ; un encaissement supprimé (marqué) reste supprimé et ne compte plus dans les montants, le livre des recettes ni les emails. |
| Document émis marqué supprimé | Impossible : la marque est ignorée ; signalé. |
| Deux documents émis avec le même numéro | Signalé à chaque synchronisation : à régulariser par un avoir et une nouvelle facture (jamais corrigé automatiquement) ; l'écran permettra de marquer la régularisation comme faite (étape C4). |
| Liens entre devis et factures | Recalculés après la fusion : un devis pointe vers une facture émise qui le reprend, jamais vers un brouillon supprimé. Un brouillon copié ne reprend pas le lien (le devis n'est pas facturé une seconde fois) ; un document émis copié le garde. |
| Données d'une version plus récente de l'Espace | Refusées sans rien fusionner : l'appareil doit d'abord charger la nouvelle version. |
| Réglages de l'appareil (dernière sauvegarde) | Non synchronisés. |

Schéma 2 : `deletedAt` (date-heure) sur les clients, les documents et les encaissements supprimés, au lieu de les
effacer ; `copyOf` (document d'origine) et `copyFrom` (version copiée d'un brouillon) sur les copies faites par la
synchronisation ; une sauvegarde du schéma 1 est convertie sans perte.

Critères : la fusion est la même dans les deux sens (local et distant échangés, au signalement près) ; plusieurs
appareils qui modifient, suppriment, émettent, transforment des devis et encaissent puis se synchronisent
**convergent** vers le même état ; chaque émission est conservée une seule fois ; chaque encaissement est présent une
seule fois, sur le document du numéro où il a été saisi ; les liens des devis visent un document existant ; aucune
saisie n'est perdue sans être signalée. Vérifié par des scénarios écrits (un par règle, chacun contrôlé en réintroduisant
l'erreur qu'il doit détecter) et une simulation de 50 scénarios aléatoires reproductibles qui passe par chaque cas de
conflit.

**Reste pour l'étape C4** : l'enregistrement sur l'appareil (`tools/espace-store.js`) et l'interface sont encore au
schéma 1. À l'ouverture des comptes, ils passent au schéma 2 : sauvegardes du schéma 2 acceptées, suppressions
marquées au lieu d'effacées, listes et calculs de l'interface sans les éléments marqués (le moteur de l'Espace ignore
déjà les encaissements marqués), conflits affichés à l'utilisateur.

## 4. Options d'architecture

| Option | Description | Avantages | Limites |
|---|---|---|---|
| A. Plateforme managée (type Supabase, région UE) | Base PostgreSQL, authentification et règles d'accès par ligne fournies | Mise en route rapide ; offre « Pro » vers 25 $/mois relevée | Éditeur non européen ; données lisibles par le serveur |
| B. Hébergeur français (Scaleway, OVHcloud, Clever Cloud) et API maison | Base PostgreSQL managée et petite API | Souveraineté ; base managée dès quelques euros par mois relevés | Plus de développement (authentification, règles d'accès) |
| C. Synchronisation chiffrée de bout en bout | L'appareil chiffre les données ; le serveur stocke des blocs illisibles | Promesse de confidentialité tenue ; risque réduit en cas de fuite | Fonctions serveur (rappels, devis en ligne) limitées aux données que l'utilisateur partage |

**Recommandation** : **C hébergée selon B** : synchronisation chiffrée de bout en bout, sur un hébergeur français ;
les services qui exigent une lecture côté serveur (rappels, devis en ligne, envoi) n'utilisent que les données
strictement nécessaires, partagées explicitement par l'utilisateur. Décision technique à confirmer (D15), après le
choix de l'hébergeur et du budget par Ismail : voir le [comparatif chiffré des hébergeurs](13-comparatif-hebergeurs.md)
(recommandation : Scaleway, 20 à 30 € HT par mois au départ ; le nom de domaine doit être choisi avant l'étape C4).

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
| C2 | Schéma 2 et moteur de synchronisation, testés sans serveur (simulation de trois appareils) | Fusion et suppressions correctes sur 50 scénarios ; **fait le 20/10/2026** |
| C3 | Serveur : authentification, stockage chiffré, limites, sauvegardes | Tests d'accès entre comptes : aucun accès ; **serveur construit et testé le 22/10/2026, sans mise en ligne** ([23](23-serveur-et-connexion.md)) ; sauvegardes à la mise en ligne |
| C4 | Interface : création de compte, lien d'appareils, phrase de récupération, import de l'Espace local | Parcours navigateur complet, captures relues ; **fait le 22/10/2026 en brouillon** ([23](23-serveur-et-connexion.md) § 7), publié à l'ouverture des comptes |
| C5 | Rappels par email (service d'envoi européen) | Rappels reçus aux bonnes dates sur un compte de test |
| C6 | Bêta privée avec la liste d'attente | Retours traités, aucun incident de sécurité |
| C7 | Offre « Pro » : abonnement chez le prestataire de paiement choisi ([17](17-offres-et-paiements.md)), factures, résiliation | Paiement, renouvellement, échec de paiement et résiliation vérifiés en mode test du prestataire |

## 8. Décisions et tâches d'Ismail

- [ ] **[Ismail]** Choisir l'hébergeur (comparatif chiffré : [13](13-comparatif-hebergeurs.md)) et ouvrir le compte.
- [ ] **[Ismail]** Choisir le nom de domaine avant l'étape C4 (clés d'accès et emails de connexion liés au domaine,
      [13](13-comparatif-hebergeurs.md) § 5).
- [ ] **[Ismail]** Valider le budget mensuel de départ (hébergement, envoi d'emails, nom de domaine).
- [ ] **[Ismail]** Structure juridique pour encaisser des abonnements, avec un expert-comptable.
- [ ] **[Ismail]** Prix de l'offre « Pro » et prestataire de paiement ([17](17-offres-et-paiements.md) § 7).
