# 33. Recherche de noms de domaine

Besoin « Nom de domaine et email pro » de la [vision](31-vision-plateforme.md) (§ 3, priorité de la refonte, § 5) :
trouver un nom libre, des variantes, savoir où le réserver et quoi vérifier avant. Spécification avant le code, règles
vérifiées le 23/10/2026.

## 1. Ce que fait l'outil, et ce qu'il ne fait pas

- **Fait** : il prend le nom voulu (et, si on veut, l'activité et la ville), le met au format d'un nom de domaine,
  interroge les **registres officiels** de chaque extension et affiche pour chacune : *probablement libre*, *déjà
  pris* (avec sa date de création, sa date d'expiration et le registraire) ou *non vérifié*. Il propose des variantes,
  rappelle les conditions de certaines extensions et ce qu'il faut vérifier avant d'acheter (marques déposées), et
  renvoie vers les listes officielles de registraires.
- **Ne fait pas** : il ne vend pas de domaines, ne réserve rien, n'affiche jamais les coordonnées d'un titulaire et ne
  passe par aucun serveur à nous.

## 2. Règles et sources

| Règle | Source officielle |
|---|---|
| Le protocole RDAP a remplacé WHOIS comme source de référence des données d'enregistrement des extensions génériques le 28/01/2025 | ICANN, annonce du 27/01/2025 (*Launching RDAP; Sunsetting WHOIS*) |
| Le serveur RDAP d'une extension se trouve dans le fichier d'amorçage de l'IANA, en retenant l'étiquette la plus longue qui correspond (`co.uk`, sinon `uk`) | RFC 9224, § 4 ; `https://data.iana.org/rdap/dns.json` |
| Réponse 200 : l'objet existe ; réponse 404 : le serveur n'a pas l'objet ; 429 : trop de requêtes | RFC 7480, § 5.1, 5.3 et 5.5 |
| Les serveurs devraient autoriser la lecture depuis un autre site (`Access-Control-Allow-Origin: *`) | RFC 7480, § 5.6 |
| Statuts *redemption period* (suppression demandée, restauration encore possible) et *pending delete* (suppression en cours) | Registre IANA des valeurs JSON de RDAP (RFC 8056, RFC 3915) |
| `.fr` : titulaire résidant (personne physique) ou établi (personne morale) dans l'Union européenne, en Islande, au Liechtenstein, en Norvège ou en Suisse, pendant toute la vie du nom | Afnic, charte de nommage (version du 06/07/2026) |
| `.ca` : lien avec le Canada dans l'une des catégories des *Canadian Presence Requirements* | CIRA, *Canadian Presence Requirements for Registrants* |
| `.quebec` : lien ou intérêt raisonnable envers la communauté québécoise, à l'enregistrement et pendant toute la vie du nom | PointQuébec, politique d'enregistrement et FAQ |
| `.uk` et `.co.uk` : ouverts à tous ; un titulaire dont l'adresse est hors du Royaume-Uni doit fournir une adresse de signification au Royaume-Uni (pas de boîte postale) | Nominet, *Rules of registration* (20/03/2024) |
| `.dev` et `.app` : sites accessibles seulement en HTTPS (extensions préchargées HSTS), à dire avant l'achat | Google Registry, politique d'enregistrement du `.dev` ; page du `.app` |
| Vérifier les marques avant de choisir : base marques de l'INPI (marques françaises, de l'UE et internationales visant la France), recherche de la USPTO, *Search for a trade mark* (UKIPO) et Companies House, base de données des marques de l'OPIC | Sites de l'INPI, de la USPTO, de GOV.UK et de l'OPIC (pages citées dans `data/rules/`) |
| Registraires : annuaire des bureaux d'enregistrement accrédités (Afnic), liste des registraires accrédités (ICANN), outil de comparaison de *The UK Domain* (Nominet), liste des registraires certifiés (CIRA), registraires accrédités (PointQuébec) | Sites de chaque organisme |

**Contrôle aux sources dans la durée** : `scripts/verifier_rdap.py`, lancé chaque mois par GitHub Actions
(`.github/workflows/verifier-rdap.yml`), compare la table des serveurs au fichier de l'IANA et vérifie, pour chaque
extension, qu'un nom enregistré répond 200, qu'un nom au hasard répond 404 et que l'en-tête CORS autorise la lecture.
Premier passage le 23/10/2026 (fichier de l'IANA publié le 22/10/2026) : 19 extensions conformes ; `.eu`, `.us`,
`.io`, `.co`, `.me`, `.be`, `.ch` et `.de` n'ont pas de serveur RDAP dans le fichier de l'IANA.

## 3. Extensions

| Section | Cochées d'office | Proposées en plus |
|---|---|---|
| France | .fr, .com, .net, .org, .pro | la liste commune |
| États-Unis | .com, .net, .org, .pro, .dev | la liste commune |
| Royaume-Uni | .co.uk, .uk, .com, .net, .org | la liste commune |
| Canada (anglais) | .ca, .com, .net, .org, .pro | .quebec, puis la liste commune |
| Canada (français) | .ca, .quebec, .com, .net, .org | .pro, puis la liste commune |

Liste commune : .app, .consulting, .design, .dev, .info, .online, .site, .studio, .tech, .xyz (sans celles déjà
cochées). Une extension de la table tapée avec le nom (« lumiere.dev ») est cochée et vérifiée en premier. Les
extensions sans RDAP (.eu, .us, .io, .co…) sont citées dans les questions fréquentes : à vérifier chez un registraire.
`.paris` et `.bzh` répondent correctement mais ne sont pas proposés : leurs conditions d'enregistrement n'ont pas été
vérifiées.

## 4. Fonctionnement

1. **Mise en forme du nom** : minuscules ; « https:// », « www. », chemin et extension tapée retirés (une extension
   de la table est ajoutée aux extensions vérifiées ; une autre extension de deux lettres, comme .eu ou .io, est
   signalée comme non vérifiable) ; accents retirés (é → e, œ → oe, ß → ss) ; espaces, apostrophes, autres points et
   tirets bas remplacés par un tiret ; autres signes supprimés ; tirets doublés réduits, tirets de début et de fin
   retirés. Une extension seule (« .fr ») compte comme un nom vide. Règles d'un nom (RFC 1035 et RFC 5891) : 1 à 63 caractères (lettres, chiffres, tiret), pas de tiret
   au début ni à la fin, pas de tirets en 3e et 4e positions (réservés aux noms internationalisés). Si le nom a changé,
   l'outil dit lequel il cherche.
2. **Variantes** (sur l'extension principale de la section et le .com, s'ils sont cochés ; sinon sur la première
   extension cochée) : le nom sans tirets, le nom suivi de
   l'activité, l'activité suivie du nom, le nom suivi de la ville ; au plus 4, sans doublon ni mot répété, chacune
   contrôlée par les mêmes règles.
3. **Interrogation** : `GET <serveur>domain/<nom>` avec `Accept: application/rdap+json, application/json`, sans
   cookie ni page d'origine (`referrerPolicy: no-referrer`), 4 requêtes à la fois, 8 secondes au plus chacune ; les
   résultats s'affichent au fur et à mesure ; une zone `role="status"` annonce le début puis le bilan (« 8 probablement
   libres, 3 déjà pris, 2 non vérifiés ») ; une nouvelle recherche remplace la précédente : ses réponses tardives sont
   ignorées et ses noms pas encore envoyés ne le sont pas. La condition d'une extension (.fr, .ca, .quebec, .uk, HTTPS) s'affiche une fois, sous le premier
   nom libre concerné.
4. **Lecture de la réponse** :
   - 200 et `objectClassName` = `domain` → **déjà pris** : date de création (`registration`), d'expiration
     (`expiration`, si publiée) et nom du registraire (entité de rôle `registrar`) ; si le statut contient
     *redemption period* ou *pending delete* : « en cours de suppression, pourrait redevenir libre ».
   - 404 → **probablement libre** : le registre ne connaît pas ce nom ; certains noms sont pourtant réservés,
     interdits ou vendus plus cher (« premium ») : la réponse définitive vient du registraire au moment de l'achat.
   - 429 → **non vérifié** (« trop de recherches, réessayez dans une minute ») ; autre réponse, délai dépassé ou
     réseau → **non vérifié**, avec un lien vers la liste des registraires.
5. **Après la recherche** (contenu de la page) : marques à vérifier (liens officiels du pays), conditions de
   l'extension, où réserver (listes officielles), conseils de choix (court, facile à dicter, sans tiret si possible,
   même nom pour le site et l'email), email pro et renouvellement.

## 5. Liens partenaires (affiliation)

Inactifs au départ : les liens vers les registraires sont les **listes officielles**. Quand Ismail se sera inscrit à
des programmes, la page pourra ajouter des registraires partenaires, avec ces règles (D30, [31](31-vision-plateforme.md)
§ 4) :

- l'état d'un nom et l'ordre des résultats ne dépendent jamais d'un partenaire ; les listes officielles restent
  affichées ; au moins une option sans commission ;
- chaque lien partenaire est signalé **à côté du lien**, avant le clic, et marqué `rel="sponsored noopener"` ; une
  phrase en tête du bloc dit que le site peut toucher une commission, sans surcoût ;
- mentions par pays, à relire au moment de l'activation :
  - **France** : toute publicité en ligne doit être clairement identifiable comme telle et rendre identifiable la
    personne pour le compte de laquelle elle est réalisée (LCEN, art. 20) → « Lien partenaire » et nom du registraire ;
  - **États-Unis** : la FTC demande une mention claire et visible (*clear and conspicuous*), proche du lien, par
    exemple « je touche une commission sur les achats faits via ces liens » ; un lien « Disclosure » ou une mention
    seulement sur une page « À propos » ne suffit pas (*Endorsement Guides: What People Are Asking*) ;
  - **Royaume-Uni** : l'ASA demande que le contenu affilié soit identifiable comme publicité, avec une étiquette
    comme « Ad » ; le seul mot « affiliate » ne suffit pas (ASA, *Affiliate marketing*, Code CAP 2.1 et 2.3) ;
  - **Canada** : le Bureau de la concurrence demande de divulguer clairement tout lien matériel (commission comprise),
    en langage simple, là où le public le verra ; un simple lien affilié ne suffit probablement pas (*Influencer
    marketing and the Competition Act*).

## 6. Confidentialité

Les noms recherchés partent **du navigateur du visiteur vers les registres** (par exemple Verisign pour .com, l'Afnic
pour .fr), seulement au clic sur « Rechercher » ; ils ne passent pas par nos serveurs et ne sont mémorisés ni par le
site ni sur l'appareil. La page Confidentialité des cinq sections le dit (elle disait « aucune donnée envoyée ») ; la
phrase du pied de page devient « rien de ce que vous saisissez n'est envoyé à nos serveurs ». Le registre voit
l'adresse IP du visiteur, comme pour toute visite d'un site.

## 7. Tests

- Moteur (`engines/domain.js`) : mise en forme, règles du nom, variantes, lecture des réponses (200, 404, 429,
  erreurs, statuts de suppression, réponses réelles relevées le 23/10/2026 par le contrôle mensuel), adresse
  interrogée ; chaque test vérifié en réintroduisant l'erreur qu'il doit détecter.
- Parcours navigateur : réponses des registres simulées (le navigateur de test n'a pas accès à Internet) : nom libre,
  nom pris, erreur, nom à corriger, variantes, clavier, accessibilité, mobile.
- Contrôle mensuel aux sources (§ 2).

## 8. Tâches d'Ismail

- **[Ismail]** S'inscrire aux programmes d'affiliation de registraires, s'il le souhaite (après la refonte, décision
  D10) ; les liens partenaires ne seront ajoutés qu'ensuite, avec les mentions du § 5.

## 9. Réalisation (23/10/2026)

- Moteur `engines/domain.js` (13 tests, 42 erreurs réintroduites, toutes détectées après deux ajouts de tests et une
  simplification), script `tools/domain.js`, pages dans les cinq sections (« Nom de domaine », étape Démarrer), règles
  dans `data/rules/` (table des serveurs, protocole, statuts, conditions de .fr, .ca, .quebec, .uk, HTTPS, listes de
  registraires ; marques INPI, USPTO, UKIPO et Companies House, OPIC).
- Parcours navigateur avec réponses simulées : nom vide, nom mis en forme, pris, libre, 429, registre injoignable, en
  cours de suppression, variantes, extension tapée (le volet « Plus d'extensions » s'ouvre : défaut trouvé par le
  test), extension sans RDAP, recherche remplacée, aucune extension, en-têtes des requêtes, 4 requêtes au plus à la
  fois ; dates au format de chaque pays.
- Relecture des captures : condition du .fr répétée sous chaque variante et condition identique de .uk et .co.uk
  (affichées une seule fois désormais), phrase sous « Probablement libre » raccourcie.
- Revue du code : une recherche remplacée continuait d'envoyer ses noms restants aux registres (charge inutile, risque
  de limitation) ; les variantes étaient vérifiées sur une extension décochée. Corrigé et testé.
