# Documentation technique

> **Ces documents décrivent l'architecture cible, que le code n'implémente aujourd'hui qu'en partie.** `Renderer`
> existe ; `Matrix` est encore là où les specs parlent de `Device` et de `Scene` ; le renderer Go, le protocole
> binaire et le firmware n'existent pas. L'écart se lit dans les [issues](#travaux-en-cours), et il est censé se
> réduire : une spec et un code qui divergent sont un défaut, pas un état de fait.

## Par où commencer

1. **[GLOSSARY.md](GLOSSARY.md)** — le vocabulaire. Court, et il évite les contresens sur tout le reste.
2. **[ARCHITECTURE.md](ARCHITECTURE.md)** — la topologie et les responsabilités.
3. **[adr/](adr/)** — pourquoi c'est ainsi, et ce qui a été écarté.

## Index

### Fondations

| Document | Contenu |
|----------|---------|
| [GLOSSARY.md](GLOSSARY.md) | Vocabulaire du projet — un terme, un sens |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Topologie, plans contrôle/données, frontière de confiance, bootstrap |
| [adr/](adr/) | Les décisions d'architecture, une par fichier, avec leurs alternatives écartées |

### Spécifications

| Document | Contenu | Public |
|----------|---------|--------|
| [DATA-MODEL.md](DATA-MODEL.md) | Renderer / Device / Scene, credentials, migration | Backend |
| [PROTOCOL-DEVICE.md](PROTOCOL-DEVICE.md) | Protocole binaire renderer ↔ device | Firmware, renderer, simulateur |
| [PROTOCOL-CONTROL.md](PROTOCOL-CONTROL.md) | Protocole de contrôle renderer ↔ Adonis | Backend, renderer |
| [PROTOCOL-DASHBOARD.md](PROTOCOL-DASHBOARD.md) | Notifications SSE Adonis → navigateur | Backend, frontend |
| [SELF-HOSTING.md](SELF-HOSTING.md) | Contrat d'un renderer tiers | Renderer |
| [SIMULATOR.md](SIMULATOR.md) | Simulateur, implémentation de référence | Frontend |

### Références

| Document | Contenu |
|----------|---------|
| [HARDWARE.md](HARDWARE.md) | Matériel de référence, brochage, alimentation |
| [PERFORMANCE.md](PERFORMANCE.md) | Bande passante calculée, budgets, méthode de mesure |

## Repères

| | |
|---|---|
| Matériel de référence | Adafruit MatrixPortal S3 + dalle HUB75 64×32 |
| Cadence | 30 FPS par défaut, réglée **par scène** de 1 à 60, plafonnée par device ([ADR-0019](adr/0019-cadence-portee-par-la-scene.md)) |
| Frame complète 64×32 | 6 153 octets, soit 1,48 Mbit/s en flux permanent |
| Géométrie maximale | 65 536 pixels (256×256), limite du protocole |
| Scène → device | même géométrie, ou un multiple entier `k` identique sur les deux axes ([ADR-0018](adr/0018-geometrie-native-de-la-scene.md)) |
| Ports | Nuxt 3000, Adonis 3333, renderer 8889, PostgreSQL 5432 |

## Conventions

**Statut des chiffres.** [PERFORMANCE.md](PERFORMANCE.md) et [HARDWARE.md](HARDWARE.md) distinguent
explicitement le **calculé**, le **mesuré** et le **budget**. Aucune valeur n'est présentée comme une mesure si
elle n'en est pas une.

**Décisions.** Toute décision structurante fait l'objet d'un ADR nommant l'alternative écartée. Une décision
dont on a gardé la trace du raisonnement se rouvre en lisant un fichier ; une décision dont on l'a perdue se
rouvre en refaisant toute l'analyse.

**Vocabulaire.** Les termes du [glossaire](GLOSSARY.md) sont employés de façon univoque dans tous les documents.
Il comporte une liste de termes proscrits — notamment « matrix », trop ambigu, et les notions rendues sans objet
par le choix de TCP.

## Travaux en cours

Le backlog vit dans les [issues GitHub](https://github.com/smyllet/matrixled-ssr/issues), organisé en 7 epics :

| Epic | Chantier |
|------|----------|
| [#6](https://github.com/smyllet/matrixled-ssr/issues/6) | Infrastructure & tooling |
| [#7](https://github.com/smyllet/matrixled-ssr/issues/7) | Data model & authentication |
| [#8](https://github.com/smyllet/matrixled-ssr/issues/8) | Control plane API |
| [#9](https://github.com/smyllet/matrixled-ssr/issues/9) | Go renderer |
| [#10](https://github.com/smyllet/matrixled-ssr/issues/10) | ESP32 firmware |
| [#11](https://github.com/smyllet/matrixled-ssr/issues/11) | Dashboard |
| [#12](https://github.com/smyllet/matrixled-ssr/issues/12) | Simulator |

Chaque sous-issue correspond à une PR et renvoie à la section de spec qui la définit. Les issues sont rédigées
en anglais, comme le reste du dépôt.

## Ce qui reste ouvert

**Volontairement non spécifié.** Le mécanisme et le point d'extension sont en place, les valeurs viendront avec
les fonctionnalités :

- **Le catalogue de primitives de scène.** L'enveloppe est versionnée et validée
  ([DATA-MODEL.md](DATA-MODEL.md#configuration-de-scène)), son contenu reste ouvert.
- **Le vocabulaire de capacités.** Le mécanisme de négociation est spécifié
  ([PROTOCOL-CONTROL.md](PROTOCOL-CONTROL.md#négociation-de-capacités)), les valeurs se rempliront au fil des
  primitives ajoutées.

**Non tranché.** Ces points sont consignés là où ils se poseront, pour être rouverts en lisant un fichier :

| Sujet | Où |
|-------|-----|
| Les sources de données appartiennent à Adonis — décision encore `Proposé`, rien ne s'y conforme | [ADR-0014](adr/0014-sources-de-donnees-cote-adonis.md) |
| L'agrandissement `k×k` est fait par le renderer, donc payé sur le lien le plus contraint | [ADR-0018](adr/0018-geometrie-native-de-la-scene.md) |
| Ce que fait un renderer d'un device qui remonte des FPS très inférieures à sa cadence effective | [ADR-0019](adr/0019-cadence-portee-par-la-scene.md) |
| Le plan de contrôle n'a aucun accusé de réception, d'où une fenêtre de course après une rotation | [ADR-0021](adr/0021-credential-du-simulateur-par-rotation.md) |
| Le canal de notification du dashboard est mono-instance : derrière un répartiteur de charge, une partie des clients ne recevrait rien, silencieusement | [ADR-0022](adr/0022-notifications-dashboard-par-sse.md) |
