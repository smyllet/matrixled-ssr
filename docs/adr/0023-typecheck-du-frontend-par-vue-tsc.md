# ADR-0023 — Le frontend est type-vérifié par `vue-tsc`, sur le même programme que les sources du backend

**Statut** : Accepté — 2026-09-02

## Contexte

La promesse structurante du projet est la **sûreté de type de bout en bout** : le frontend importe le backend
comme dépendance d'espace de travail et construit son client API depuis le registre Tuyau généré, si bien qu'un
appel se fait par **nom de route** et non par URL. Renommer une route casse le frontend au niveau des types.

Or **rien ne vérifiait que cette promesse tenait**. Le paquet frontend ne déclarait aucun script `typecheck`,
donc `pnpm typecheck` — que la CI lance — n'exerçait que le backend. `nuxt build` compile sans vérifier les
types : Vite transpile, il ne type-vérifie pas. Aucune des quatre commandes de la CI ne lisait une seule
annotation de type du Nuxt. Un renommage de route, une prop absente, un composant inexistant dans un template
passaient tous en vert.

## Décision

**Le paquet frontend déclare `typecheck: nuxt typecheck`, adossé à `vue-tsc`**, et la tâche Turbo `typecheck`
existante — déjà porteuse de `dependsOn: ["^build"]` — le branche dans la CI sans y toucher.

Deux choix le structurent.

**`vue-tsc` plutôt que Golar.** `nuxt typecheck` accepte les deux. `vue-tsc` est le vérificateur de référence de
l'écosystème Vue, en 3.3.11, aligné sur `@vue/language-core`, et il honore les `vueCompilerOptions` déjà posées
dans `nuxt.config.ts` (`checkUnknownComponents`). Golar est en 0.1.x et exigerait un fichier de configuration
supplémentaire ; sa maturité ne justifie pas d'en dépendre pour un contrôle que la CI doit pouvoir croire.

**Le programme du frontend active `experimentalDecorators`.** `@matrixled-ssr/backend/registry` est exporté en
**source TypeScript**, et `registry/schema.d.ts` référence les contrôleurs et les validateurs par
`import('#controllers/…')`. Ces fichiers, et par transitivité les modèles Lucid et `database/schema.ts`, sont
donc compilés **dans le programme du frontend**, avec les options de Nuxt et non celles du backend. Sans
`experimentalDecorators`, `@column` et `@belongsTo` produisent 41 `TS1206: Decorators are not valid here`
et 4 `TS1241` venus du backend, qui noient tout le reste. L'option était d'ailleurs **déjà** écrite dans
`apps/frontend/tsconfig.json`, où elle est inerte : ce fichier est un tsconfig « solution » (`files: []`) dont
les `compilerOptions` ne s'appliquent à aucun programme. La décision ne fait que rendre effective une intention
déjà exprimée. Elle est portée par `nuxt.config.ts`, `.nuxt/` étant régénéré et non versionné.

## Alternatives écartées

**Exclure les sources du backend du périmètre.** La plus courte, et la pire : le seul chemin par lequel le
frontend voit les types du backend est justement celui qu'on aurait coupé. Exclure `../backend/**` aurait rendu
le contrôle vert en supprimant ce qu'il devait vérifier.

**Relâcher les options qui font échouer les fichiers du backend** (`noImplicitOverride`,
`noUncheckedIndexedAccess`). Écarté parce que ces options sont celles de Nuxt et protègent le **code du
frontend** : les désactiver pour faire taire neuf erreurs venues du backend aurait affaibli la vérification là
où elle est neuve. Les neuf erreurs ont été corrigées à la source — huit `override` manquants, un accès non
gardé — sans `@ts-ignore` ni `any`.

**Faire consommer au frontend des déclarations construites plutôt que les sources du backend.** Ce serait la
réponse propre au couplage décrit ci-dessus, et elle supprimerait la nécessité d'`experimentalDecorators`. Mais
elle demande de changer la carte `exports` du backend et l'émission de Tuyau, c'est-à-dire de rouvrir la chaîne
de génération pour un bénéfice d'hygiène. Reportée : le coût actuel se réduit à une option et à un commentaire.

**Introduire la vérification en non-bloquant d'abord.** L'usage quand un code jamais vérifié fait surgir une
pile d'erreurs. Sans objet ici : le code du frontend n'en produisait **aucune**, et les neuf du backend étaient
réparables mécaniquement. Un contrôle non bloquant qui pourrait être bloquant est un contrôle qu'on apprend à
ignorer.

## Conséquences

- **Le contrat de routes est vérifié.** Un `.as()` renommé côté backend fait désormais échouer `pnpm typecheck`
  au lieu de casser silencieusement le frontend. Turbo reconstruit le registre avant, par `^build`.
- **Une partie du backend est lue deux fois, sous deux jeux d'options.** Ce qui traverse le registre est compilé
  aussi par le programme du frontend, plus strict. Une erreur de types du backend peut donc apparaître dans la
  tâche `typecheck` du **frontend** — c'est le prix du couplage, et un signal, pas un faux positif.
- **`vue-tsc` et `typescript` deviennent des dépendances de développement du frontend**, et le `typecheck`
  complet passe de ~1 s à ~6 s.
- **Ce que le contrôle n'attrape pas.** Il ne vérifie que ce qui est typé. Restent hors de portée : les clés de
  `useAsyncData` et les types d'événements du dashboard, qui sont des **chaînes** rapprochées à l'exécution ;
  les clés i18n ; le contenu de `Matrix.config`, typé `any` ; et tout ce qui relève du comportement — il n'y a
  pas de suite de tests frontend, et un composant qui compile peut ne rien afficher.
