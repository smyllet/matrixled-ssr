# ADR-0010 — PostgreSQL partout, dev et test compris

**Statut** : Accepté — 2026-08-30

## Contexte

Le code actuel tourne sur `better-sqlite3`, la base étant un fichier dans `tmp/`. Un prototype antérieur visait
PostgreSQL. Lucid sait parler aux deux, et `config/database.ts` contient déjà un bloc `pg` en commentaire.

La question du moteur est indissociable de celle de l'**isolation des tests** : une suite de tests qui vise la
même base que le développement la détruit.

## Décision

**PostgreSQL en développement, en test et en production.** Pas de SQLite.

Isolation des tests par **base dédiée**, désignée via `.env.test` — le même mécanisme que celui déjà utilisé
pour surcharger le pilote de session.

## Alternatives écartées

**SQLite en développement.** Zéro infrastructure. Écarté parce que le moteur de développement finirait par
diverger du moteur de production, et que les fonctionnalités PostgreSQL utiles au projet — `jsonb` pour la
configuration de scène, index GIN, contraintes réelles — seraient soit inutilisables, soit non testées.

**SQLite réservé aux tests.** Tentant pour la vitesse. Écarté pour la même raison, aggravée : cela ferait passer
les tests sur un moteur différent de celui de production, donc laisserait passer en test ce qui casse en prod,
et interdirait de fait tout SQL spécifique à PostgreSQL. L'argument de vitesse ne tient pas :
`withGlobalTransaction()` sur un PostgreSQL local se compte en millisecondes.

## Conséquences

- Une instance PostgreSQL est nécessaire pour développer — d'où un `compose.yml`.
- Base de test dédiée (par exemple `matrixled_test`), désignée par `.env.test`.
- Stratégie de réinitialisation entre tests :
  - `testUtils.db().migrate()` dans `runnerHooks.setup` — migre une fois, annule au démontage ;
  - `testUtils.db().truncate()` dans `group.each.setup` — vide les tables, conserve le schéma ;
  - `testUtils.db().withGlobalTransaction()` réservé aux groupes dont le code testé **n'ouvre pas lui-même de
    transaction**, les transactions ne se nestant pas.
- Le projet s'autorise le SQL spécifique à PostgreSQL.

## Écart connu avec le code actuel

`tests/bootstrap.ts` déclare `setup: []` et `.env.test` ne surcharge que `SESSION_DRIVER`. **Les tests visent
donc aujourd'hui la base de développement.** Le défaut est latent tant qu'aucun test n'existe, mais devient
destructeur dès le passage à PostgreSQL en développement. Sa correction relève du code et n'entre pas dans le
périmètre de cette refonte documentaire.
