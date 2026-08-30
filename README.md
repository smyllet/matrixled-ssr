# MatrixLED SSR

**Rendu déporté pour matrices LED physiques.** Le serveur calcule les images, le microcontrôleur se contente de
les afficher.

> Le « SSR » du nom désigne le **rendu des frames côté serveur**, pas du rendu HTML côté serveur. Le frontend
> est une SPA.

## Le problème

Un ESP32 n'a ni la mémoire, ni la puissance, ni la connectivité pour faire tourner de la logique d'affichage
riche : animations, données externes, configuration utilisateur. Chaque nouvelle fonctionnalité impose de
reflasher chaque appareil.

## L'approche

Déporter le rendu sur le serveur et ne transmettre que des pixels.

```
Nuxt (SPA) ──▶ AdonisJS ──▶ PostgreSQL        Plan de contrôle
                   ▲
                   │ WSS sortant, JSON versionné
                   │
              Renderer (Go)                    Plan de données
                   │
                   │ WebSocket binaire, ~30 FPS
                   ▼
          Matrix Portal S3 + dalle HUB75
```

Le serveur porte la configuration, le rendu, la logique et l'interface. Le firmware reçoit, décode, écrit sur la
dalle — rien d'autre.

La plateforme fournit un **renderer par défaut** mutualisé, et prévoit que les utilisateurs puissent héberger
**leur propre renderer** sur leur réseau. C'est cette perspective qui structure une bonne part de l'architecture.

## État du projet

| Composant | État |
|-----------|------|
| API AdonisJS — authentification, CRUD | Partiel |
| Dashboard Nuxt | Partiel |
| Spécifications | À jour |
| Renderer Go | À écrire |
| Firmware | À écrire |
| Simulateur | À écrire |

Le code actuel est en avance sur rien et en retard sur les specs : celles-ci décrivent la cible, et
[DATA-MODEL.md](docs/DATA-MODEL.md) documente l'écart avec le schéma existant.

## Documentation

Commencer par le [glossaire](docs/GLOSSARY.md) puis l'[architecture](docs/ARCHITECTURE.md).

| Document | Contenu |
|----------|---------|
| [GLOSSARY.md](docs/GLOSSARY.md) | Vocabulaire — un terme, un sens |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Topologie, responsabilités, frontière de confiance |
| [adr/](docs/adr/) | Les décisions, avec les alternatives écartées |
| [DATA-MODEL.md](docs/DATA-MODEL.md) | Renderer / Device / Scene, migration |
| [PROTOCOL-DEVICE.md](docs/PROTOCOL-DEVICE.md) | Protocole binaire renderer ↔ device |
| [PROTOCOL-CONTROL.md](docs/PROTOCOL-CONTROL.md) | Protocole de contrôle renderer ↔ Adonis |
| [SELF-HOSTING.md](docs/SELF-HOSTING.md) | Contrat d'un renderer tiers |
| [SIMULATOR.md](docs/SIMULATOR.md) | Simulateur, implémentation de référence |
| [HARDWARE.md](docs/HARDWARE.md) | Matériel, brochage, alimentation |
| [PERFORMANCE.md](docs/PERFORMANCE.md) | Bande passante, budgets, méthode de mesure |

**Les décisions sont rediscutables.** Chaque ADR nomme l'alternative écartée et pourquoi, précisément pour
qu'on puisse rouvrir un choix en lisant un fichier plutôt qu'en refaisant l'analyse.

## Stack

| Couche | Technologie |
|--------|-------------|
| Frontend | Nuxt 4, Vue 3, Tailwind 4, shadcn-nuxt |
| API | AdonisJS 7, Lucid, VineJS, Bouncer |
| Types partagés | Tuyau |
| Base | PostgreSQL |
| Renderer | Go |
| Firmware | ESP32-S3, Arduino, Adafruit Protomatter |

## Démarrage

Prérequis : Node 24+, pnpm 10+, Docker.

```bash
docker compose up -d          # PostgreSQL

cd webapp
pnpm install

cp apps/backend/.env.example apps/backend/.env
cd apps/backend && node ace generate:key && node ace migration:run && cd ../..

pnpm dev
```

- API : http://localhost:3333
- Dashboard : http://localhost:3000

La suite de tests vise une base dédiée, `matrixled_test`, créée par `compose.yml` au premier démarrage. Si elle
manque — volume créé avant l'ajout du script d'initialisation — la recréer avec `docker compose down -v && docker compose up -d`.

## Licence

MIT.
