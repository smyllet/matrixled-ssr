# ADR-0017 — Le rendu est mutualisé par groupe, pas par device

**Statut** : Accepté — 2026-08-31

## Contexte

Le modèle lie **N devices à une scène** : `devices.sceneId` pointe vers une `scenes`, et
[GLOSSARY.md](../GLOSSARY.md) le dit explicitement — « plusieurs devices peuvent afficher la même scène ». Le cas
n'est pas théorique : un mur de dalles identiques, ou la même horloge dans deux pièces, sont les premiers usages
du produit.

Rien ne disait ce que le renderer devait en faire. Deux documents suggéraient même le contraire :

- [PROTOCOL-CONTROL.md](../PROTOCOL-CONTROL.md) recopiait la configuration complète de la scène **dans chaque
  entrée de device** de `sync.full`. Rien n'obligeait deux copies d'une même scène en une même version à être
  identiques, et la forme du message présentait N contenus indépendants là où il y en avait un.
- [ADR-0002](0002-renderer-en-go.md) raisonne « une goroutine par device » et en dérive 390 ms de CPU par
  seconde **et par device**. Appliqué à huit dalles affichant la même chose, ce calcul compte huit fois le même
  travail.

## Décision

**Le renderer calcule une frame par groupe de rendu, pas par device.** Deux devices appartiennent au même groupe
quand ils partagent :

| Clé de groupe | Pourquoi elle en fait partie |
|---------------|------------------------------|
| `scene_id` + `version` | Deux scènes différentes n'ont aucun pixel en commun |

Depuis [ADR-0019](0019-cadence-portee-par-la-scene.md), la cadence est portée par la scène : elle est donc
commune au groupe par construction, et la clé se réduit à la scène elle-même. **Une scène, une boucle.**

La géométrie du device **n'en fait pas partie**. Une scène est évaluée à sa géométrie native, puis répliquée en
blocs `k×k` pour chaque device ([ADR-0018](0018-geometrie-native-de-la-scene.md)) : une dalle 64×32 et une
128×64 sur la même scène partagent donc le calcul, et ne divergent qu'à l'expansion et à l'encodage. `chainLength`
n'y figure pas non plus — il décrit le câblage, pas l'image : deux devices de même géométrie totale reçoivent les
mêmes octets quel que soit leur chaînage.

Et **le plan de contrôle est normalisé en conséquence** : `sync.full` et `sync.delta` portent une section
`scenes` de premier niveau, chaque device n'en portant que le `scene_id` ; `scene.updated` est émis une fois par
scène, jamais une fois par device.

### Ce que le groupe partage, et ce qu'il ne partage pas

Le partage s'arrête au **tampon de pixels natif**. Tout ce qui suit reste par device :

- **L'expansion `k×k`**, quand la géométrie du device est un multiple de celle de la scène.
- **Le plafonnement d'émission** : un device à `maxFps` ne reçoit qu'une frame sur `n`
  ([ADR-0019](0019-cadence-portee-par-la-scene.md)).

- **L'en-tête de frame**, qui porte le compteur `sequence`
  ([PROTOCOL-DEVICE.md](../PROTOCOL-DEVICE.md#le-compteur-sequence)) : il appartient à la connexion d'un device,
  donc deux devices d'un même groupe émettent des octets différents à partir du même tampon. La luminosité, elle,
  ne voyage que dans `CONFIG` : elle n'entre dans aucune frame et n'a donc d'effet ni sur le calcul ni sur
  l'encodage.
- **Le numéro de séquence et le tampon de frame précédente**, donc le DELTA. Il dépend de la dernière frame
  appliquée *par ce device-là*, et diverge dès qu'un device se reconnecte — le suivant reçoit un `FULL_FRAME`
  pendant que les autres continuent en différentiel.
- **La connexion, la backpressure et l'état d'authentification.**

Sur les budgets de [PERFORMANCE.md](../PERFORMANCE.md), le groupe mutualise les 10 ms de calcul, pas les 3 ms de
diff et de sérialisation.

### Conséquence visible : le verrouillage de phase

Les devices d'un même groupe partagent une seule boucle, donc une seule horloge d'animation. Ils affichent la
même image au même instant, au lieu de dériver selon l'heure à laquelle chacun s'est connecté. Sur un mur de
dalles, c'est le comportement attendu ; ailleurs, c'est sans effet observable.

Le partage suppose que le rendu soit une **fonction pure** de la scène, des valeurs de sources et de la phase.
C'est exactement ce que pose [ADR-0014](0014-sources-de-donnees-cote-adonis.md) : le renderer ne va chercher
aucune donnée de lui-même, il reçoit des valeurs.

## Alternatives écartées

**Une boucle par device, sans partage.** C'est ce que la formulation d'ADR-0002 laissait entendre, et c'est plus
simple : aucun groupe à recomposer, aucune invalidation. Écarté parce que le coût est exactement multiplié par
le nombre de dalles identiques — le cas du mur de dalles, celui où la charge est la plus forte, est aussi celui
où le calcul est le plus redondant. Et la dérive de phase entre dalles voisines y est visible à l'œil.

**Mutualiser aussi l'encodage.** Il faudrait que les devices d'un groupe soient en lockstep sur leurs frames
appliquées, ce que rien ne garantit : une reconnexion, une backpressure ou une luminosité différente suffit à
les désynchroniser. Le gain serait de 3 ms sur 13, au prix d'un cas particulier permanent.

**Grouper sur la seule scène, en redimensionnant la frame à volonté.** Réduire un rendu 128×64 en 64×32 ne
produit pas ce que la scène décrit, il produit du texte illisible. Seul l'agrandissement **entier** est exact, et
c'est la limite que pose [ADR-0018](0018-geometrie-native-de-la-scene.md) — pas le refus de tout partage entre
géométries.

**Dédupliquer côté Adonis.** Hors sujet : Adonis n'a pas connaissance des frames ([ADR-0004](0004-device-vers-renderer.md)),
et le déduplicateur doit être là où le calcul a lieu.

## Conséquences

- **La capacité se raisonne en groupes de rendu, pas en devices.** Huit dalles identiques coûtent un calcul et
  huit encodages. Le raisonnement d'ADR-0002 reste valide sur son pire cas — N devices, N scènes distinctes,
  N calculs — et c'est bien ce pire cas qui justifie le choix de Go.
- Le renderer doit **recomposer ses groupes** à chaque `device.assigned` et `device.unassigned`, et un groupe
  vide disparaît. Depuis [ADR-0019](0019-cadence-portee-par-la-scene.md), aucun réglage de device ne peut plus
  faire changer un device de groupe : luminosité, géométrie et plafond n'agissent qu'après le calcul.
- **Une primitive de scène qui dépendrait de l'identité du device** — afficher son nom, sa température —
  casserait le partage. Le catalogue de primitives n'en prévoit aucune aujourd'hui
  ([DATA-MODEL.md](../DATA-MODEL.md#configuration-de-scène)) ; si une telle primitive apparaît, elle doit sortir
  le device de son groupe, et ce point est à trancher au moment de l'ajouter.
- Le `state_version` reste unique pour tout le registre : la normalisation change la forme des messages, pas le
  mécanisme de resynchronisation.
