# ADR-0004 — Le device se connecte au renderer ; Adonis seul propriétaire de la base

**Statut** : Accepté — 2026-08-30

## Contexte

Trois composants peuvent tenir la connexion d'un device : l'API AdonisJS, le renderer, ou les deux en relais.
Les versions antérieures de la documentation donnaient trois réponses différentes selon le document consulté.

## Décision

**Le device se connecte directement à son renderer.** Le renderer est le plan de données ; Adonis est le plan de
contrôle et **le seul composant qui accède à la base**.

## Alternatives écartées

**Adonis termine la connexion device et relaie les frames.** Authentification centralisée et un seul port
exposé. Écarté parce que Node se retrouverait dans le chemin critique à 30 FPS pour chaque device, ce qui annule
l'intérêt d'un renderer séparé ([ADR-0002](0002-renderer-en-go.md)) et ajoute un saut réseau.

**Le renderer lit directement la base.** Aucune synchronisation à spécifier. Écarté parce que deux services
écriraient le même schéma dans deux langages sans migrations partagées — couplage fort et dérive garantie. Cette
alternative devient de surcroît inacceptable dès lors qu'un renderer peut être hébergé par un tiers
([ADR-0008](0008-renderer-autonome.md)) : lui ouvrir la base reviendrait à lui ouvrir les données de tous les
utilisateurs.

## Conséquences

- Adonis n'est jamais dans le chemin 30 FPS.
- Un seul propriétaire du schéma, donc un seul jeu de migrations.
- Le renderer a besoin d'un moyen de valider les tokens device sans accès à la base : c'est le rôle du plan de
  contrôle ([ADR-0007](0007-plan-de-controle-wss.md)).
- « Seul propriétaire de la base » passe du statut de préférence à celui de **contrainte de sécurité**.
