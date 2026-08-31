# ADR-0018 — La scène porte sa géométrie native, l'agrandissement est entier

**Statut** : Accepté — 2026-08-31

## Contexte

`scenes.config` ne porte aucune géométrie. Rien ne dit donc pour quelle dalle une scène a été conçue, et deux
conséquences en découlent :

- **Une assignation absurde est acceptée.** Une scène pensée pour du 64×32 peut être assignée à une dalle 32×32,
  où la moitié du contenu tombe hors champ.
- **Une scène n'a pas de sens stable.** [ADR-0017](0017-rendu-mutualise.md) supposait implicitement que le
  renderer évalue la scène à la géométrie du device. Un texte placé en (10, 4) désigne alors un endroit différent
  sur chaque dalle, et la même scène en version 12 signifie autre chose selon qui l'affiche.

Le contenu est ici en pixels, pas en points : une police 5×7 n'existe pas à 3,5 pixels de haut. À cette
résolution, la géométrie n'est pas un paramètre de présentation, elle fait partie du contenu.

## Décision

**Une scène déclare la géométrie pour laquelle elle est écrite** — `scenes.width` et `scenes.height` — et elle ne
peut être assignée qu'à un device dont la géométrie en est un **multiple entier, identique sur les deux axes** :

```
device.width  = k × scene.width
device.height = k × scene.height       avec k entier ≥ 1
```

Le renderer évalue la scène à sa géométrie native, puis **réplique chaque pixel en un bloc k×k**. Sur une dalle
LED ce n'est pas un redimensionnement : il n'y a ni interpolation ni flou, la frame agrandie contient exactement
l'information de la frame native.

| Scène | Device | Verdict |
|-------|--------|---------|
| 64×32 | 64×32 | k = 1 |
| 64×32 | 128×64 | k = 2, réplication exacte |
| 64×32 | 32×32 | refusé — il faudrait détruire un pixel sur deux |
| 64×32 | 128×32 | refusé — k différent par axe, l'image serait étirée |
| 64×32 | 96×48 | refusé — k = 1,5 doublerait un pixel sur deux et pas les autres |

Les trois refus sont des **refus à l'écriture**, dans l'API : une assignation impossible ne doit pas atteindre le
renderer, où le seul recours serait un écran noir ou une image fausse.

## Alternatives écartées

**Une scène sans géométrie, à coordonnées relatives.** Séduisant sur le papier — une scène s'afficherait
partout. Écarté parce que le problème n'est pas d'échelle mais de seuil : sur 32×32 un glyphe ne devient pas
petit, il cesse d'exister. Et des coordonnées normalisées produisent des positions non entières, c'est-à-dire
exactement le flou qu'on ne peut pas se permettre ici. Les dalles HUB75 visées par
[ADR-0005](0005-hub75-dabord.md) forment de toute façon un petit ensemble discret de tailles, pas un continuum.

**Une géométrie libre, avec redimensionnement quelconque à l'affichage.** C'est ce que la formulation initiale
d'ADR-0017 rejetait déjà, à raison, mais en bloc : elle interdisait aussi le cas entier, qui lui est gratuit.

**k = 1 strict, aucune tolérance.** La règle la plus simple, et celle qui était implicitement en vigueur. Écartée
parce qu'elle oblige à dupliquer une scène pour une dalle 128×64 jumelle d'une 64×32, avec une copie à maintenir
à la main et deux versions qui divergeront.

**Une scène multi-géométries, avec des variantes par taille.** C'est la vraie réponse à la qualité graphique :
une scène 32×32 mérite une composition différente, pas une réduction. Mais c'est une fonctionnalité d'édition, et
elle multiplierait la surface de l'éditeur avant qu'une seule primitive existe. Reportée, pas condamnée — ADR à
rouvrir quand le catalogue de primitives sera posé.

## Conséquences

- **Le dashboard ne propose que les scènes compatibles** pour un device donné, plutôt que de laisser choisir puis
  refuser. Le refus reste nécessaire côté API, l'interface n'étant pas une garantie.
- **Changer la géométrie d'un device peut invalider son assignation.** L'API doit soit refuser le changement,
  soit désassigner explicitement la scène — jamais laisser une paire incompatible en base.
- **[ADR-0017](0017-rendu-mutualise.md) s'élargit** : l'évaluation ne dépendant plus de la géométrie du device,
  une dalle 64×32 et une 128×64 sur la même scène partagent le calcul. La géométrie sort de la clé
  d'évaluation ; elle reste dans celle de l'émission, où chaque device reçoit ses propres octets.
- **L'agrandissement est fait par le renderer, donc payé sur le réseau.** Une dalle 128×64 servie par une scène
  64×32 reçoit quatre fois plus d'octets que d'information — 5,90 Mbit/s au lieu de 1,48
  ([PERFORMANCE.md](../PERFORMANCE.md)). Déplacer la réplication dans le firmware diviserait ce coût par k² sur
  le lien le plus contraint du système, au prix d'un facteur d'échelle dans `CONFIG` et `FULL_FRAME` et de
  l'expansion côté device. **Piste non tranchée**, à reprendre quand le firmware existera.
- La migration depuis `matrices` est directe : la scène créée hérite de la géométrie de la matrice, k = 1.
