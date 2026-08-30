# ADR-0005 — HUB75 d'abord, `panelType` comme point d'extension

**Statut** : Accepté — 2026-08-30

## Contexte

Les versions antérieures de la documentation promettaient simultanément le support des dalles HUB75 et des
rubans adressables (WS2812B, SK6812, APA102). Ce sont deux technologies très différentes : un ruban adressable
demande un ordre de couleurs, un mappage géométrique (linéaire, zigzag, serpentin, spirale) et un budget
électrique par LED ; une dalle HUB75 n'a aucune de ces notions.

Le matériel de référence effectivement utilisé — et le seul pour lequel un firmware a réellement tourné — est un
Adafruit Matrix Portal S3 pilotant une dalle HUB75 via Adafruit Protomatter.

## Décision

**HUB75 uniquement pour la v1**, avec un discriminant `panelType` dans le modèle de données pour ne pas fermer
la porte aux rubans adressables.

## Alternatives écartées

**Supporter les deux dès la v1.** Écarté : cela double la surface du modèle de données et de la validation, pour
une famille de matériel qui n'est ni possédée ni testable aujourd'hui.

**Ne rien prévoir du tout.** Écarté : ajouter un discriminant maintenant coûte un champ ; le rétro-ajouter plus
tard coûte une migration et une reprise de tous les documents.

## Conséquences

- `ledType`, `colorOrder` et les types de mappage (`zigzag`, `snake`, `spiral`, `custom`) **disparaissent** du
  modèle et de la documentation. Ce sont des notions de ruban adressable.
- Les mentions de FastLED sont remplacées par Adafruit Protomatter.
- `panelType` vaut `hub75` et rien d'autre pour l'instant ; toute valeur future impose un ADR dédié.
- Les capacités annoncées par un renderer ([ADR-0007](0007-plan-de-controle-wss.md)) incluent la liste des
  `panelType` qu'il sait piloter.
