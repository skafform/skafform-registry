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
      { "label": "Nom", "href": "/route", "location": "primary", "visibility": "public", "order": 50 }
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

## Registry distant (GitHub)

Le CLI supporte aussi un registry distant via URL GitHub raw :
```json
{ "registry": "https://raw.githubusercontent.com/skafform/skafform-registry/main" }
```
Le CLI télécharge `registry.json` puis chaque fichier individuellement via l'API GitHub tree.
