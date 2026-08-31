# ADR-0002 — Renderer en Go, process séparé

**Statut** : Accepté — 2026-08-30

## Contexte

Le rendu des frames doit tourner à cadence régulière ([ADR-0001](0001-streaming-de-frames.md)). Le reste de la
plateforme est en TypeScript : API AdonisJS et SPA Nuxt, avec des types partagés de bout en bout via Tuyau.

La V1 rendait en TypeScript (canvas + décodage GIF + ffmpeg), à l'intérieur du process AdonisJS.

## Décision

**Le renderer est un programme Go autonome**, déployé séparément de l'API.

Ce qui motive ce choix est la **performance** — deux propriétés précises, que le runtime de Node ne donne pas.

**Le rendu est un travail CPU parallèle par nature.** Chaque device a sa boucle, sa scène et son tampon de frame
précédente pour le calcul du DELTA. Ces boucles ne partagent rien et doivent s'exécuter en même temps. Go y
répond par une goroutine par device, que son ordonnanceur distribue sur tous les cœurs sans qu'on ait à s'en
occuper. Node n'exécute qu'un fil : y paralléliser suppose un pool de `worker_threads` et le transfert de
tampons entre eux, c'est-à-dire réimplémenter à la main ce que le runtime Go fournit.

**L'ordre de grandeur**, dérivé des budgets de [PERFORMANCE.md](../PERFORMANCE.md) : 10 ms de calcul plus 3 ms de
diff et de sérialisation font 13 ms de CPU par frame et par device, soit **390 ms par seconde à 30 FPS**. Un cœur
en sature deux ou trois. Un renderer monothreadé plafonnerait donc autour de trois devices quel que soit le
matériel sous lui — et c'est le cas favorable, celui où rien d'autre ne tourne sur ce fil. Ces budgets sont des
objectifs et non des mesures, mais le rapport qu'ils décrivent ne dépend pas de leur exactitude.

**Ce qui casse une animation, c'est la variance, pas la moyenne.** [ADR-0001](0001-streaming-de-frames.md) fait
du device un simple tampon : il affiche ce qui arrive, quand ça arrive, et une frame en retard se voit
immédiatement. Or le calcul d'une frame est un bloc synchrone qu'on ne peut pas découper : sur une boucle
d'événements partagée, une frame lente sur un device retarde tous les autres, et une pause du ramasse-miettes
les retarde tous ensemble. L'ordonnanceur de Go préempte les goroutines et son GC est concurrent, ce qui
contient ces deux effets au lieu de les propager à l'ensemble des devices servis.

**Aucune mesure comparative n'a été faite.** Ce choix repose sur des propriétés de runtime, pas sur un
benchmark, et il est pris avant que la première frame ait été rendue. Il est réversible : le contrat du plan de
contrôle étant explicite ([ADR-0007](0007-plan-de-controle-wss.md)), le renderer se remplace sans toucher au
reste de la plateforme. Une mesure montrant que TypeScript tient la charge visée est un motif suffisant pour
rouvrir cet ADR.

## Alternatives écartées

**Package ou service TypeScript dans le monorepo.** Un seul langage, types partagés avec le reste de la
plateforme, un seul déploiement, et un précédent qui fonctionnait en V1 — mais cette V1 servait un clip
pré-rendu, pas N boucles de rendu concurrentes : elle ne démontre rien sur la charge visée ici. Écarté pour les
raisons ci-dessus.

Il faut reconnaître le coût de ce choix : un second langage, un second pipeline de build, et une frontière de
types que Tuyau ne couvre pas. C'est ce qui rend le contrat du plan de contrôle
([ADR-0007](0007-plan-de-controle-wss.md)) d'autant plus important à spécifier explicitement — il n'est plus
garanti par le compilateur.

## Conséquences

- Le renderer est un **artefact déployable indépendamment**, ce qui est la condition pour qu'un utilisateur
  puisse en héberger un lui-même ([ADR-0008](0008-renderer-autonome.md)).
- Le contrat entre Adonis et le renderer doit être documenté et versionné à la main.
- **La capacité d'un renderer se raisonne en cœurs.** Ajouter des devices consomme du CPU parallèle ; la montée
  en charge se fait d'abord en cœurs sur un renderer, puis en ajoutant des renderers. Ni l'un ni l'autre
  n'impose de changement de code.
- Un binaire Go statique se distribue sans runtime, ce qui simplifie l'auto-hébergement.
