# CLAUDE.md — skafform-registry

## Rôle

Registry des bricks publiables. C'est la source depuis laquelle `skafform add` télécharge les bricks dans les projets utilisateurs.

**Règle** : le registry est un mirror stable de `poc-theme/bricks/`. Un brick entre dans le registry quand il est propre, testé et stable dans poc-theme.

## Structure

```
skafform-registry/
  registry.json            ← index central des bricks
  bricks/
    @skafform/
      core/
        1.0.0/
          package.json     ← metadata + skafform field
          src/             ← code source TypeScript
      auth-better-auth/
        1.0.0/
          package.json
          src/
      admin/
        1.0.0/
      user/
        1.0.0/
      lite-docs/
        0.1.0/
          package.json
          src/
          docs/            ← fichiers MDX scaffold (copiés dans le projet à l'installation)
```

## `registry.json`

```json
{
  "version": "1",
  "bricks": {
    "@skafform/core": {
      "description": "...",
      "latest": "1.0.0",
      "free": true,
      "versions": ["1.0.0"]
    },
    "@skafform/auth-better-auth": {
      "latest": "1.0.0",
      "free": true,
      "versions": ["1.0.0"],
      "requires": ["@skafform/core"]
    }
  }
}
```

Champs obligatoires : `description`, `latest`, `free`, `versions`.
Champ optionnel : `requires` (bricks qui doivent être installés avant).

## Exports de `@skafform/core`

| Export | Fichier | Usage |
|--------|---------|-------|
| `.` | `src/index.ts` | Types publics |
| `./db` | `src/db/index.ts` | `db` + toutes les tables Drizzle |
| `./nav` | `src/nav.server.ts` | `getNav()`, `seedIfEmpty()` |
| `./theme` | `src/theme.server.ts` | `getThemeOverrides()`, `invalidateThemeCache()` |
| `./customize` | `src/customize.server.ts` | `getCustomize()`, `invalidateCustomizeCache()` |
| `./runtime` | `src/runtime.server.ts` | `getAdapter()`, `registerAdapter()` |
| `./layouts/user` | `src/layouts/UserLayout.tsx` | Layout compte utilisateur |

Tous les exports `*.server.ts` sont **server-only** — jamais importés côté client.

## `package.json` d'un brick

```json
{
  "name": "@skafform/nom",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./db": "./src/db/index.ts"
  },
  "skafform": {
    "requires": ["@skafform/core"],
    "scaffold": ["docs"],
    "nav": [
      { "key": "mon-item", "label": "Nom", "href": "/route", "location": "primary", "visibility": "public", "order": 50 }
    ],
    "routes": [
      { "path": "route", "file": "src/routes/route.tsx" },
      { "path": "route/action", "file": "src/routes/route.action.tsx", "layout": false }
    ]
  },
  "dependencies": {
    "package-requis": "^1.0.0"
  }
}
```

## Publier un brick (processus manuel)

1. Vérifier que le brick dans `poc-theme/bricks/@skafform/<nom>/` est stable
2. Créer `skafform-registry/bricks/@skafform/<nom>/<version>/`
3. Copier `package.json` + `src/` (+ `docs/` si scaffold)
4. Ajouter l'entrée dans `registry.json`

## Champ `nav` dans `package.json`

La nav est la **déclaration** du brick — la source de vérité pour les items. Le runtime (assignation des locations) est géré en DB.

- `key` — identifiant stable, obligatoire. Utilisé pour les updates sans conflit (`brick + key` = composite unique)
- `location` — location par défaut suggérée au seed initial. L'admin peut changer en DB via `/admin/navigation`
- La nav **n'est pas** écrite dans `skafform-bricks.json` — seule la DB est source de vérité à runtime

Au premier chargement de `/admin/navigation`, `seedIfEmpty()` lit les `package.json` des bricks installés et peuple la DB. Les items sans location connue dans le thème vont dans le groupe "Non assigné" (`menuId = null`).

## Visibilité `nav`

| Valeur | Qui voit |
|--------|---------|
| `public` | Tout le monde |
| `guest` | Utilisateurs non connectés |
| `authenticated` | Utilisateurs connectés |
| `admin` | Rôle admin uniquement |

## Bricks publiés

| Brick | Version | Requires |
|-------|---------|---------|
| `@skafform/core` | 1.0.0 | — |
| `@skafform/auth-better-auth` | 1.0.0 | core |
| `@skafform/admin` | 1.0.0 | core, auth-better-auth |
| `@skafform/user` | 1.0.0 | core, auth-better-auth |
| `@skafform/lite-docs` | 0.1.0 | — |

## Système thème et personnalisation

### Thème CSS (`skafform_theme_settings`)

La table `skafform_theme_settings` stocke des overrides de tokens CSS :

- **key** : nom de variable CSS, ex. `--skafform-primary`
- **value** : valeur CSS, ex. `#e63946`

Le layout `default.tsx` injecte ces overrides via `<style>:root{...}</style>` en SSR à chaque requête. Les defaults viennent de `themes/<theme>/child/theme.json` → champ `tokens`.

L'admin gère les overrides via `/admin/theme`. La page lit les tokens depuis `theme.json` et affiche un color picker pour les valeurs hex, un text input pour les autres.

```ts
import { getThemeOverrides, invalidateThemeCache } from "@skafform/core/theme"
```

### Personnalisation de contenu (`skafform_customize_settings`)

La table `skafform_customize_settings` stocke des overrides de contenu :

- **key** : chemin dot-notation, ex. `navbar.logo`, `hero.title`
- **value** : valeur texte

Les defaults viennent de `themes/<theme>/child/theme.json` → champ `customize`. La DB merge par-dessus les defaults à runtime via `setDeepValue()`.

Le layout `default.tsx` appelle `getCustomize()` et passe le résultat aux pages enfants via `<Outlet context={{ customize }}>`. Les pages lisent via `useOutletContext()`.

```ts
import { getCustomize, invalidateCustomizeCache } from "@skafform/core/customize"
```

### `customize_schema` dans `theme.json`

Le thème déclare quels champs sont éditables par l'admin :

```json
{
  "customize_schema": {
    "navbar.logo":       { "type": "text",     "label": "Logo du site",  "group": "Identité" },
    "hero.title":        { "type": "text",     "label": "Titre héros",   "group": "Page d'accueil" },
    "about.description": { "type": "textarea", "label": "Description",   "group": "À propos" }
  }
}
```

Types supportés : `text`, `textarea`, `color`. L'admin gère ces champs via `/admin/customize`.

**Principe** : le themeur contrôle ce qui est éditable. Le dev ne peut pas ajouter des champs customize sans modifier le thème.

### Cache in-memory

Les deux modules utilisent un cache module-level (`let cache = null`) invalidé à chaque sauvegarde admin. Pattern identique dans `nav.server.ts`, `theme.server.ts`, `customize.server.ts`.

## Registry distant (GitHub)

Le CLI supporte aussi un registry distant via URL GitHub raw :
```json
{ "registry": "https://raw.githubusercontent.com/skafform/skafform-registry/main" }
```
Le CLI télécharge `registry.json` puis chaque fichier individuellement via l'API GitHub tree.
