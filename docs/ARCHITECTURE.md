# Architecture

> Vocabulaire : voir le [glossaire](GLOSSARY.md). Décisions et alternatives écartées : voir les [ADR](adr/).

## Vue d'ensemble

```
   Navigateur
        │ HTTP/JSON (session)
        ▼
┌───────────────────┐
│   Nuxt (SPA)      │  Dashboard : appairage, scènes, supervision
└─────────┬─────────┘
          │ HTTP/JSON — API REST, types partagés via Tuyau
          ▼
┌───────────────────┐      ┌──────────────┐
│  AdonisJS         │─────▶│  PostgreSQL  │   Adonis est le SEUL à accéder à la base
│  PLAN DE CONTRÔLE │      └──────────────┘
└─────────┬─────────┘
          ▲
          │  WSS — le renderer compose vers Adonis, jamais l'inverse
          │  Enveloppe JSON versionnée {v, type, payload}
          │
    ┌─────┴──────────────────────────┐
    │                                │
┌───┴────────────┐          ┌────────┴───────────┐
│ Renderer       │          │ Renderer           │
│ par défaut     │          │ auto-hébergé       │
│ (plateforme)   │          │ (chez l'utilisateur)│
│ multi-tenant   │          │ mono-tenant, NAT   │
│ PLAN DE DONNÉES│          │ PLAN DE DONNÉES    │
└───┬────────────┘          └────────┬───────────┘
    │                                │
    │   WebSocket binaire, ~30 FPS   │
    ▼                                ▼
┌────────────────┐          ┌────────────────────┐
│ Matrix Portal  │          │ Matrix Portal      │
│ S3 + HUB75     │          │ S3 + HUB75         │
└────────────────┘          └────────────────────┘
         ▲
         │  Le simulateur est un device du registre,
         │  même protocole, sans matériel
    ┌────┴─────────┐
    │ Simulateur   │
    │ (page Nuxt)  │
    └──────────────┘
```

## Responsabilités

| Composant | Rôle | Ne fait pas |
|-----------|------|-------------|
| **Nuxt** | Dashboard : appairage, édition de scènes, supervision. Sert aussi la page du simulateur | En tant que dashboard, ne parle jamais à un renderer |
| **Simulateur** | Page du dashboard qui tient le rôle du matériel, sur un device déclaré `kind = simulator`, et parle le protocole device ([SIMULATOR.md](SIMULATOR.md)) | Ne partage aucun code avec le renderer, et n'emprunte l'identité d'aucune dalle |
| **AdonisJS** | Plan de contrôle : authentification, registre, persistance, assignation | N'est jamais dans le chemin de rendu |
| **PostgreSQL** | Source de vérité unique | N'est lu que par Adonis |
| **Renderer** | Plan de données : calcule les frames, tient les connexions device | N'accède jamais à la base |
| **Device** | Reçoit, décode, écrit sur la dalle | Aucune logique d'affichage |

La séparation **plan de contrôle / plan de données** est la clé de lecture de toute l'architecture. Le plan de
contrôle est peu fréquent, typé lâchement, tolérant à la latence. Le plan de données est à cadence fixe, binaire,
et sensible à la milliseconde. Ils n'ont ni le même transport, ni le même format, ni les mêmes garanties.

## Les trois protocoles

| # | Chemin | Transport | Format | Cadence | Spécification |
|---|--------|-----------|--------|---------|---------------|
| 1 | Renderer → Device | WebSocket | **Binaire** | 1 à 60 FPS, 30 par défaut | [PROTOCOL-DEVICE.md](PROTOCOL-DEVICE.md) |
| 2 | Renderer ↔ Adonis | WSS sortant | JSON versionné | Événementiel | [PROTOCOL-CONTROL.md](PROTOCOL-CONTROL.md) |
| 3 | Device → Adonis | HTTP | JSON | Une fois au boot | [PROTOCOL-DEVICE.md](PROTOCOL-DEVICE.md#bootstrap) |

Le JSON du protocole 2 n'est pas une entorse au principe « binaire uniquement » : ce principe ne s'applique qu'au
protocole 1, où le coût de parsing est payé trente fois par seconde sur un microcontrôleur.

## Ports

| Service | Port | Exposé à |
|---------|------|----------|
| Nuxt | 3000 | Navigateur |
| AdonisJS | 3333 | Navigateur, renderers, devices |
| Renderer — WebSocket device | 8889 | Devices du réseau |
| PostgreSQL | 5432 | Adonis uniquement |

Un renderer **n'expose aucun port à la plateforme**. Le seul port qu'il ouvre sert à ses devices.

## Démarrage d'un device

```
1. Le device s'allume. Il connaît l'adresse de la plateforme et son token (gravés au flash).
2. GET /api/v1/device/bootstrap        (authentifié par le token device)
       ──▶ { renderer_urls, panel: { width, height, chain }, scene_version }
3. Il met la réponse en cache local.
4. Il choisit une URL selon son transport (wss d'abord) et ouvre un WebSocket.
5. Il envoie son token en premier message binaire.
6. Le renderer valide, répond CONFIG, puis pousse une FULL_FRAME et commence à streamer.
```

**Si l'étape 2 échoue**, le device repart sur sa réponse en cache. Sans ce cache, une panne de la plateforme
empêcherait tout redémarrage, ce qui contredirait l'autonomie promise par
[ADR-0008](adr/0008-renderer-autonome.md).

## Frontière de confiance

Un renderer auto-hébergé est opéré par l'utilisateur, sur son réseau. Il n'est pas un composant interne, et
l'architecture doit le traiter comme tel.

### Sens de connexion

Le renderer **compose toujours vers** Adonis. Aucune connexion entrante vers un renderer depuis la plateforme,
jamais — c'est l'hypothèse NAT, et elle doit tenir de bout en bout dans toute la documentation.

### Un renderer est une entrée non fiable

- Il ne peut pas revendiquer un device qui ne lui est pas assigné : Adonis vérifie l'assignation, il ne fait pas
  confiance à ce que le renderer déclare.
- Tout état qu'il remonte est validé et borné avant d'être persisté.
- Il ne reçoit que les objets de ses propres devices assignés — jamais le registre global.

### Isolation multi-tenant du renderer par défaut

Le renderer de la plateforme sert plusieurs utilisateurs. L'isolation est une **obligation spécifiée**, pas une
propriété espérée : chaque objet poussé porte son propriétaire, et le renderer cloisonne par connexion device.

### Négociation de capacités

Un renderer auto-hébergé sera toujours en retard d'une version sur la plateforme. À la connexion, il annonce sa
version et ses capacités ; Adonis **refuse d'assigner une scène** utilisant des primitives qu'il ne sait pas
rendre, plutôt que de le laisser afficher un résultat faux.

Le mécanisme est spécifié dès maintenant ; le vocabulaire de capacités se remplira au fil des primitives
ajoutées. Voir [SELF-HOSTING.md](SELF-HOSTING.md).

### Révocation

Le renderer met en cache les empreintes de tokens device pour rester autonome
([ADR-0008](adr/0008-renderer-autonome.md)). Une révocation n'est donc **pas instantanée**. Trois mécanismes la
bornent : un événement de révocation poussé sur le canal de contrôle, un **bail de session** par device qui
expire faute de contact avec la plateforme ([ADR-0015](adr/0015-bail-de-session-device.md)), et un comportement
défini quand le renderer est hors ligne. La fenêtre d'exposition est donc finie, et sa durée se règle par dalle.
Voir [PROTOCOL-CONTROL.md](PROTOCOL-CONTROL.md).

## Resynchronisation

Quand un renderer redémarre ou que sa connexion de contrôle est rompue, son état peut avoir divergé.

À la reconnexion, il annonce sa **version d'état** dans son message d'ouverture. Adonis répond soit par les
changements manquants, soit par le registre complet s'il ne peut pas calculer le delta. L'opération est
idempotente : la rejouer ne produit aucun effet de bord.

C'est le pendant de ce qu'une architecture à état partagé aurait fourni gratuitement. C'est le coût assumé de
[ADR-0007](adr/0007-plan-de-controle-wss.md).
