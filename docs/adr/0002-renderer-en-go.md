# ADR-0002 — Renderer en Go, process séparé

**Statut** : Accepté — 2026-08-30

## Contexte

Le rendu des frames doit tourner à cadence régulière ([ADR-0001](0001-streaming-de-frames.md)). Le reste de la
plateforme est en TypeScript : API AdonisJS et SPA Nuxt, avec des types partagés de bout en bout via Tuyau.

La V1 rendait en TypeScript (canvas + décodage GIF + ffmpeg), à l'intérieur du process AdonisJS.

## Décision

**Le renderer est un programme Go autonome**, déployé séparément de l'API.

## Alternatives écartées

**Package ou service TypeScript dans le monorepo.** Un seul langage, types partagés avec le reste de la
plateforme, un seul déploiement, et un précédent qui fonctionnait en V1. Écarté au profit d'une boucle de rendu
à latence prédictible, hors du ramasse-miettes et de la boucle d'événements de Node.

Il faut reconnaître le coût de ce choix : un second langage, un second pipeline de build, et une frontière de
types que Tuyau ne couvre pas. C'est ce qui rend le contrat du plan de contrôle
([ADR-0007](0007-plan-de-controle-wss.md)) d'autant plus important à spécifier explicitement — il n'est plus
garanti par le compilateur.

## Conséquences

- Le renderer est un **artefact déployable indépendamment**, ce qui est la condition pour qu'un utilisateur
  puisse en héberger un lui-même ([ADR-0008](0008-renderer-autonome.md)).
- Le contrat entre Adonis et le renderer doit être documenté et versionné à la main.
- Un binaire Go statique se distribue sans runtime, ce qui simplifie l'auto-hébergement.
