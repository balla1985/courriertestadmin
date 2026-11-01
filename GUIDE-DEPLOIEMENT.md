# Guide de déploiement — Supabase + Vercel (pas à pas)

Architecture : le site (fichiers statiques) est hébergé sur **Vercel** ; les comptes, les courriers et la synchronisation en temps réel sont sur **Supabase** (projet « contact », organisation Lauréat Attitude).

## État actuel (déjà fait)
- Tables `courrier_structures` et `courrier_profiles`, règles de sécurité (RLS) et temps réel : **appliqués** au projet Supabase « contact » (fichier `supabase/schema.sql`, à titre de référence).
- `config.js` : **déjà rempli** avec l'URL et la clé publique « anon » du projet. Ne mettez jamais la clé `service_role` dans le site.
- La table `profiles` d'une autre application existe dans ce projet : elle n'est pas touchée (nos tables sont préfixées `courrier_`).

## Étape 1 — Réglages d'authentification Supabase (2 minutes)
1. Ouvrez https://supabase.com/dashboard, projet **contact**.
2. **Authentication > Sign In / Providers > Email** : désactivez **« Confirm email »** (nécessaire : les comptes des agents utilisent des adresses internes `identifiant@courrier.local` qui ne peuvent pas recevoir d'e-mail). Laissez **« Allow new users to sign up »** activé. Enregistrez.
   ⚠ Ces réglages valent pour tout le projet, donc aussi pour l'autre application du projet. Si elle dépend de la confirmation par e-mail, créez plutôt un projet Supabase dédié (je peux le faire).
3. Recommandé : **Authentication > Attack Protection** : activez « Leaked password protection » si votre offre le permet.

## Étape 2 — Créer le compte superviseur
1. **Authentication > Users > Add user > Create new user**.
2. E-mail : `superviseur@courrier.local` · mot de passe de 6 caractères minimum · cochez **Auto Confirm User** · Create.
3. **SQL Editor** : collez le contenu de `supabase/creer-superviseur.sql` puis **Run**.
   (Ou dites-le-moi : je l'exécute pour vous.)

## Étape 3 — Déployer sur Vercel
**Méthode A — GitHub (recommandée)**
1. Créez un dépôt GitHub (privé) et envoyez-y tout le contenu de ce dossier (`index.html`, `config.js`, `cloud.js`, `vercel.json`, `sw.js`, `manifest.json`, `icons/`).
2. https://vercel.com > **Add New > Project** > importez le dépôt.
3. Framework Preset : **Other**. Laissez le build vide. **Deploy**.
4. Vous obtenez `https://votre-projet.vercel.app`.

**Méthode B — Ligne de commande**
`npm i -g vercel`, puis dans ce dossier : `vercel login` et `vercel --prod`.

Domaine personnalisé : Vercel > Project > Settings > Domains.

## Étape 4 — Premier lancement
1. Ouvrez l'adresse Vercel > **Se connecter** : identifiant `superviseur` + le mot de passe de l'étape 2. Changez-le (bouton 🔑).
2. Menu **Structures** : créez la première structure en indiquant son **administrateur** (nom, identifiant sans espace, mot de passe ≥ 6).
3. Toujours en tant que superviseur, dans cette structure : menus **Structure** (divisions, sections) et **Exercices comptables**.
4. Connectez-vous en tant qu'administrateur de la structure : menu **Agents** pour créer secrétaire, directeur, adjoint, chefs et chargés d'études.
5. Chaque agent se connecte et change son mot de passe (invitation à la première connexion).

## Étape 5 — Vérifier que tout marche
- Secrétaire : enregistrer un courrier, le transmettre. Sur un **autre appareil**, le directeur doit le voir en quelques secondes.
- Superviseur : créer une 2e structure ; ses agents ne doivent rien voir de la 1re.
- Supabase > Table Editor > `courrier_structures` : la colonne `version` augmente à chaque action.

## Dépannage
- **« Identifiants invalides »** : « Confirm email » encore actif, ou le superviseur n'a pas de ligne dans `courrier_profiles` (étape 2.3).
- **Page blanche** : vérifiez `config.js` et la console du navigateur (F12).
- **« Erreur de synchronisation »** : relisez le message ; une règle RLS refuse l'action (rôle ou structure incorrects).
- **Réinitialiser le mot de passe d'un agent** : Supabase > Authentication > Users > ⋯ > Send password recovery / modifier le mot de passe.

## Limites de cette version (à connaître)
- Chaque structure est stockée comme un document unique avec contrôle de version ; en cas de modifications simultanées, une fusion automatique est tentée (sans perte des courriers ajoutés). Pour de très fortes charges, une version relationnelle (une ligne par courrier) est la suite logique.
- La sécurité est assurée **par structure** (RLS). Les droits par fonction (qui peut faire quoi dans une structure) sont appliqués par l'application, pas par la base.
- La désactivation d'un agent bloque sa connexion dans l'application ; pour un blocage total, supprimez aussi son compte dans Supabase > Authentication > Users.
- Les pièces jointes sont stockées dans le document (limite pratique de quelques Mo par fichier) ; Supabase Storage est la suite pour les gros volumes.
- Faites des sauvegardes chiffrées régulières (compte administrateur > Sauvegarde).
