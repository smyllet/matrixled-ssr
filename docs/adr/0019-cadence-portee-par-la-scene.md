# ADR-0019 — La cadence appartient à la scène, le device en pose le plafond

**Statut** : Accepté — 2026-08-31

## Contexte

[ADR-0001](0001-streaming-de-frames.md) a fait de la cadence un réglage, et l'a posé sur le device :
`devices.targetFps`. Après [ADR-0017](0017-rendu-mutualise.md) et [ADR-0018](0018-geometrie-native-de-la-scene.md),
c'est le dernier champ qui empêche une scène d'avoir une boucle de rendu unique : deux devices affichant la même
scène à deux cadences différentes restent deux évaluations.

Or `targetFps` répondait à **deux questions distinctes** qu'il confondait :

- **Ce que le contenu exige.** Une horloge à l'aiguille des minutes n'a rien à calculer trente fois par seconde ;
  un texte défilant si. C'est une propriété de la scène, connue de son auteur.
- **Ce que le lien supporte.** Un WiFi encombré, une dalle 128×128 à 11,8 Mbit/s
  ([PERFORMANCE.md](../PERFORMANCE.md)), une dalle qu'on ne veut pas prioriser sur un point d'accès partagé.
  C'est une propriété du device et de son réseau, connue de son propriétaire.

Un seul champ pour les deux oblige à choisir qui décide. Sur la scène seule, l'utilisateur qui veut soulager
**une** dalle doit dupliquer la scène — la duplication qu'ADR-0018 s'applique justement à éviter.

## Décision

**La cadence est portée par la scène ; le device porte un plafond facultatif.**

| Champ | Entité | Rôle |
|-------|--------|------|
| `targetFps` | `scenes` | Cadence à laquelle la scène est évaluée. 1 à 60, défaut 30 |
| `maxFps` | `devices` | Plafond d'émission. `null` par défaut, c'est-à-dire aucun plafond |

Le renderer **évalue une fois par scène**, à `scene.targetFps`. Pour un device plafonné, il n'émet qu'une frame
sur `n` :

```
n = ⌈ scene.targetFps / device.maxFps ⌉        (n = 1 si maxFps est null)
cadence effective du device = scene.targetFps / n
```

**`n` est entier par construction, et ce n'est pas un détail d'implémentation.** Une scène à 30 plafonnée à 20
émet à 15, pas à 20 : le device est un tampon qui affiche ce qui arrive au moment où ça arrive
([ADR-0001](0001-streaming-de-frames.md)), donc une émission à intervalles inégaux — 33 ms, 33 ms, saut — se voit
comme un à-coup. Un sous-multiple exact est régulier ; une moyenne juste ne l'est pas.

La cadence effective est celle qu'Adonis calcule et transmet dans `CONFIG` : le device continue de recevoir un
seul chiffre et n'a rien à arbitrer.

## Alternatives écartées

**Garder la cadence sur le device seul** — l'état actuel. Écarté parce que c'est le dernier obstacle à la boucle
unique par scène, et parce que le réglage y est mal placé : l'auteur d'une horloge sait qu'elle n'a pas besoin de
30 FPS, le propriétaire de la dalle ne le sait pas.

**La porter sur la scène seule, sans plafond.** C'est la forme la plus simple, et elle donne la boucle unique
aussi. Écartée parce qu'elle supprime le seul levier de bande passante par dalle qu'ADR-0001 avait explicitement
retenu : la seule échappatoire deviendrait la duplication de scène.

**Laisser la backpressure s'en charger.** Le renderer sait déjà abandonner des frames pour un device qui ne suit
pas (« latest frame wins », [PROTOCOL-DEVICE.md](../PROTOCOL-DEVICE.md#backpressure)). Mais la backpressure ne
voit que la socket de ce device : elle réagit à un device saturé, pas à un **réseau** encombré par autre chose,
et elle ne réagit qu'après coup. C'est une soupape, pas un réglage. Les deux coexistent.

**Un plafond au niveau du renderer** plutôt que du device. Plus proche du budget CPU, mais le facteur limitant
ici est le lien WiFi d'une dalle donnée, pas le renderer — et un plafond global pénaliserait la dalle qui n'a pas
de problème.

## Conséquences

- **La clé de groupe de [ADR-0017](0017-rendu-mutualise.md) se réduit à `scene_id` + `version`.** Une scène, une
  boucle, quelle que soit la géométrie ou le plafond des devices qui l'affichent. Le plafonnement et
  l'agrandissement `k×k` sont deux post-traitements par device, appliqués sur une frame déjà calculée.
- **Le rendu est identique sur toutes les dalles d'une scène**, phase comprise. Un device plafonné voit la même
  animation, moins souvent — jamais une animation différente.
- `1 ≤ scenes.targetFps ≤ 60` est borné à l'écriture, comme l'exigeait déjà ADR-0001 : la valeur part telle
  quelle vers le renderer puis vers le device, et rien en aval ne la revalide. Même borne pour `devices.maxFps`
  quand il n'est pas `null`.
- **Un plafond ne peut pas éteindre une dalle** : `n` est fini, la cadence effective est toujours ≥ 1 FPS dès
  lors que `maxFps ≥ 1`.
- La migration depuis `matrices` ne transporte aucune cadence — le champ n'existe pas dans le schéma actuel. Les
  scènes migrées prennent le défaut de 30, les devices migrés `maxFps = null`.
- Reste non traité, comme avant cet ADR : que fait le renderer d'un device qui **rapporte** durablement des `fps`
  très inférieurs à sa cadence effective. Un plafond automatique déduit de la mesure serait tentant ; il
  reviendrait à laisser un device non fiable piloter son propre réglage.
