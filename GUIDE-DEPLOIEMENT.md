# Guide de déploiement — Supabase + Netlify (pas à pas)

Architecture : le site (fichiers statiques) est hébergé sur **Netlify** ; les comptes, les courriers et la synchronisation en temps réel sont sur **Supabase** (projet « contact », organisation Lauréat Attitude).

## État actuel (déjà fait)
- Tables `courrier_structures` et `courrier_profiles`, règles de sécurité (RLS) et temps réel : **appliqués** au projet Supabase « contact » (fichier `supabase/schema.sql`, à titre de référence).
- `config.js` : **déjà rempli** avec l'URL et la clé publique « anon » du projet. Ne mettez jamais la clé `service_role` dans le site.
- La table `profiles` d'une autre application existe dans ce projet : elle n'est pas touchée (nos tables sont préfixées `courrier_`).

## Étape 1 — Côté Supabase (déjà fait)
- Tables, sécurité (RLS) et temps réel : appliqués au projet « contact ».
- Fonction serveur **`courrier-admin`** (Supabase > Edge Functions) : déployée. Elle crée les structures, les agents et réinitialise les mots de passe de façon sécurisée, avec la clé serveur qui ne quitte jamais Supabase. **Il n'est donc plus nécessaire de désactiver « Confirm email »** : vous n'avez rien à changer dans les réglages d'authentification.
- **Diaporama de la page d'accueil** : table `courrier_slides` (déjà créée, avec 3 diapositives par défaut). Les administrateurs et le superviseur le modifient depuis le menu **Page d'accueil**.
- **Modifier / supprimer une structure** : menu **Structures** (superviseur). La suppression efface aussi les comptes de la structure (fonction `courrier-admin`, déjà déployée).
- Recommandé : Authentication > Attack Protection > « Leaked password protection ».

## Étape 2 — Compte superviseur (déjà créé)
Le compte `superviseur` (e-mail interne `superviseur@courrier.local`) existe déjà dans le projet, avec son profil. Le mot de passe provisoire vous a été communiqué dans la conversation : changez-le dès la première connexion (l'application vous y invite).
Si besoin de le recréer : Authentication > Users > Add user (cochez Auto Confirm User), puis exécutez `supabase/creer-superviseur.sql` dans le SQL Editor.

## Étape 3 — Déployer sur Netlify
**Méthode A — Glisser-déposer (la plus simple, sans GitHub)**
1. Décompressez ce zip sur votre ordinateur.
2. Allez sur https://app.netlify.com/drop (connectez-vous ou créez un compte gratuit).
3. Glissez **le dossier décompressé** (pas le fichier .zip) dans la zone indiquée.
4. Netlify publie le site et donne une adresse `https://nom-aleatoire.netlify.app`.
5. Optionnel : **Site configuration > Change site name** pour choisir un nom lisible.

**Méthode B — GitHub (mises à jour automatiques)**
1. Créez un dépôt GitHub (privé) et envoyez-y tout le contenu de ce dossier.
2. Netlify > **Add new site > Import an existing project** > choisissez le dépôt.
3. Build command : laissez vide. **Publish directory : `.`** (déjà indiqué par `netlify.toml`). **Deploy**.

**Méthode C — Ligne de commande**
`npm i -g netlify-cli`, puis dans ce dossier : `netlify login` et `netlify deploy --prod --dir .`

Domaine personnalisé : Netlify > **Domain management > Add a domain**. Le HTTPS est automatique.
Pour mettre à jour (méthode A) : **Deploys > glissez le nouveau dossier** dans la zone de dépôt.

## Étape 4 — Premier lancement
1. Ouvrez l'adresse Netlify > **Se connecter** : identifiant `superviseur` + le mot de passe de l'étape 2. Changez-le (bouton 🔑).
2. Menu **Structures** : créez la première structure en indiquant son **administrateur** (nom, identifiant sans espace, mot de passe ≥ 6).
3. Toujours en tant que superviseur, dans cette structure : menus **Structure** (divisions, sections) et **Exercices comptables**.
4. Connectez-vous en tant qu'administrateur de la structure : menu **Agents** pour créer secrétaire, directeur, adjoint, chefs et chargés d'études.
5. Chaque agent se connecte et change son mot de passe (invitation à la première connexion).

## Étape 5 — Vérifier que tout marche
- Secrétaire : enregistrer un courrier, le transmettre. Sur un **autre appareil**, le directeur doit le voir en quelques secondes.
- Superviseur : créer une 2e structure ; ses agents ne doivent rien voir de la 1re.
- Supabase > Table Editor > `courrier_structures` : la colonne `version` augmente à chaque action.

## Dépannage
- **« Identifiants invalides »** : identifiant ou mot de passe incorrect, ou compte désactivé.
- **Page blanche** : vérifiez `config.js` et la console du navigateur (F12).
- **« Erreur de synchronisation »** : relisez le message ; une règle RLS refuse l'action (rôle ou structure incorrects).
- **Réinitialiser le mot de passe d'un agent** : compte administrateur > Agents > Modifier > nouveau mot de passe (l'agent devra le changer à sa prochaine connexion).

## Limites de cette version (à connaître)
- Chaque structure est stockée comme un document unique avec contrôle de version ; en cas de modifications simultanées, une fusion automatique est tentée (sans perte des courriers ajoutés). Pour de très fortes charges, une version relationnelle (une ligne par courrier) est la suite logique.
- La sécurité est assurée **par structure** (RLS). Les droits par fonction (qui peut faire quoi dans une structure) sont appliqués par l'application, pas par la base.
- La désactivation d'un agent bloque sa connexion dans l'application ; pour un blocage total, supprimez aussi son compte dans Supabase > Authentication > Users.
- Les pièces jointes sont stockées dans le document (limite pratique de quelques Mo par fichier) ; Supabase Storage est la suite pour les gros volumes.
- Faites des sauvegardes chiffrées régulières (compte administrateur > Sauvegarde).
