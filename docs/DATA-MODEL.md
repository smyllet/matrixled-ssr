# Modèle de données

> Vocabulaire : [glossaire](GLOSSARY.md). Décision fondatrice : [ADR-0006](adr/0006-modele-renderer-device-scene.md).

Trois entités, trois cycles de vie différents. Un contenu survit au matériel qui l'affiche ; un appareil survit
au contenu qu'on lui assigne ; un moteur de rendu sert plusieurs appareils.

```
User ──┬──▶ Renderer  (ownerId nullable : null = renderer de la plateforme)
       │        ▲
       │        │ rendererId
       ├──▶ Device ──── sceneId ────▶ Scene
       │                                ▲
       └────────────────────────────────┘
```

## Renderer

Un moteur de rendu déclaré auprès de la plateforme.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | uuid | Clé primaire |
| `ownerId` | uuid \| null | Propriétaire. `null` = renderer de la plateforme |
| `name` | string | Nom lisible |
| `tokenHash` | string | Empreinte du secret du credential |
| `tokenPrefix` | string | Préfixe en clair, unique et indexé : identifie le token et sert à le retrouver |
| `isDefault` | boolean | Renderer assigné par défaut aux nouveaux devices |
| `version` | string \| null | Version annoncée à la connexion. `null` tant qu'il ne s'est pas connecté |
| `capabilities` | jsonb \| null | Primitives que ce renderer sait rendre. `null` tant qu'il ne s'est pas connecté |
| `endpoints` | jsonb \| null | Adresses annoncées, transmises telles quelles aux devices au bootstrap. Liste : `wss://`, `ws://`, ou les deux ([ADR-0016](adr/0016-transports-declares-par-le-renderer.md)) |
| `status` | enum | `online` \| `offline` |
| `lastSeenAt` | timestamptz \| null | Dernière activité sur le canal de contrôle |
| `createdAt` / `updatedAt` | timestamptz | |

**Règles**

- Exactement un renderer porte `isDefault = true` et `ownerId = null`.
- `version`, `capabilities` et `endpoints` sont **déclarés par le renderer** à sa connexion. Ce sont des données
  non fiables : Adonis les valide et les borne avant de les persister.
- `status` et `lastSeenAt` sont dérivés de l'état de la connexion de contrôle, jamais renseignés par une requête.

## Device

Un appareil qui affiche : matériel ou simulateur.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | uuid | Clé primaire |
| `userId` | uuid | Propriétaire |
| `rendererId` | uuid | Renderer qui sert ce device |
| `sceneId` | uuid \| null | Scène assignée. `null` = écran noir |
| `name` | string | Nom lisible, 3 à 100 caractères |
| `tokenHash` | string | Empreinte du secret du credential |
| `tokenPrefix` | string | Préfixe en clair, unique et indexé |
| `panelType` | enum | `hub75` — seule valeur supportée ([ADR-0005](adr/0005-hub75-dabord.md)) |
| `isSimulator` | boolean | Distingue un simulateur dans l'interface |
| `width` / `height` | integer | Géométrie totale en pixels |
| `chainLength` | integer | Nombre de dalles chaînées |
| `brightness` | integer | Luminosité de la dalle, 0 à 255. Défaut 128 |
| `targetFps` | integer | Cadence visée, 1 à 60. Défaut 30 ([ADR-0001](adr/0001-streaming-de-frames.md)) |
| `offlineGrace` | integer \| null | Secondes pendant lesquelles le renderer peut servir ce device sans contact avec la plateforme. `null` = illimité. Défaut 604 800, soit 7 jours ([ADR-0015](adr/0015-bail-de-session-device.md)) |
| `firmwareVersion` | string \| null | Déclarée par le device |
| `protocolVersion` | integer \| null | Déclarée par le device |
| `status` | enum | `online` \| `offline` \| `error` |
| `lastSeenAt` | timestamptz \| null | |
| `ipAddress` | inet \| null | Dernière adresse observée |
| `createdAt` / `updatedAt` | timestamptz | |

**Règles**

- `width × height ≤ 65 536`. La limite dérive de l'index de pixel sur 16 bits du protocole
  ([PROTOCOL-DEVICE.md](PROTOCOL-DEVICE.md)), soit 256×256 au maximum.
- `1 ≤ targetFps ≤ 60`. Bornée à l'écriture : la valeur part telle quelle vers le renderer puis vers le device,
  et rien en aval ne la revalide.
- `offlineGrace` est le curseur entre révocation rapide et autonomie longue. Le mettre à `null` rend la fenêtre
  d'exposition de ce device infinie : c'est un choix légitime pour une dalle sans donnée sensible, jamais un
  défaut.
- `width` et `height` sont strictement positifs et multiples de la géométrie d'une dalle.
- `firmwareVersion`, `protocolVersion`, `status`, `lastSeenAt` et `ipAddress` sont **observés**, jamais saisis.
- Un device appartient à un utilisateur ; son renderer peut appartenir à un autre utilisateur uniquement s'il
  s'agit du renderer de la plateforme.

## Scene

Un contenu à afficher.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | uuid | Clé primaire |
| `userId` | uuid | Propriétaire |
| `name` | string | Nom lisible, 3 à 100 caractères |
| `config` | jsonb | Configuration versionnée et validée |
| `version` | integer | Incrémenté à chaque modification, sert au diff du plan de contrôle |
| `createdAt` / `updatedAt` | timestamptz | |

### Configuration de scène

`config` n'est **pas** un objet libre. Elle porte un numéro de version en tête et est validée par un schéma
VineJS à l'écriture. Le précédent existe : la V1 validait déjà sa configuration de rendu par un schéma versionné.

```jsonc
{
  "version": 1,
  "nodes": [
    // catalogue de primitives volontairement ouvert
  ]
}
```

**Ce qui est spécifié aujourd'hui** : l'enveloppe est versionnée, validée à l'écriture, et son numéro de version
est le point d'entrée de toute migration future.

**Ce qui est volontairement laissé ouvert** : le catalogue de primitives. Il se remplira avec les
fonctionnalités. Poser l'enveloppe maintenant suffit à ne fermer aucune porte ; figer les primitives avant de les
avoir conçues n'apporterait rien.

Chaque primitive ajoutée au catalogue devra apparaître dans le vocabulaire de capacités
([SELF-HOSTING.md](SELF-HOSTING.md)), sans quoi un renderer en retard de version afficherait un résultat faux au
lieu de refuser la scène.

## Credentials

Les tokens de renderer et de device suivent la même règle, et le même format
([ADR-0012](adr/0012-format-des-tokens.md)) :

```
mxr_2f9c1ab34d7e_9a8b…   renderer
mxd_71ce04ba82df_4d2f…   device
   └─ préfixe            └─ secret
```

- générés à l'appairage, **affichés une seule fois** ;
- seul le secret est stocké, **haché** — `tokenHash` — jamais en clair ;
- `tokenPrefix` reste en clair, unique et indexé. Il a deux rôles : identifier un token dans une interface ou un
  journal sans le divulguer, et **le retrouver**. Un client présente son token sans identifiant — le préfixe est
  ce qui le rattache à une ligne, puisqu'une empreinte salée ne se recherche pas.
- l'étiquette de tête porte la portée : un token de device présenté sur le canal renderer est rejeté sans même
  vérifier le secret.

**Une exception : le renderer de la plateforme.** Il n'a pas de propriétaire, donc personne ne peut l'appairer
depuis l'interface. Son credential est déclaré par le déploiement dans `PLATFORM_RENDERER_TOKEN` et appliqué au
démarrage ; le changer et redémarrer vaut rotation
([ADR-0013](adr/0013-provisionnement-du-renderer-plateforme.md)).

Le renderer reçoit l'**empreinte** des tokens de ses devices et hache le token qu'on lui présente pour comparer.
C'est ce qui rend acceptable la réplication chez un tiers imposée par
[ADR-0008](adr/0008-renderer-autonome.md) : un renderer compromis ne livre pas de credentials réutilisables.

La V1 stockait le token en clair. Ce n'est plus acceptable dès lors qu'un renderer peut être hébergé par un
tiers.

## Migration depuis `matrices`

La table `matrices` actuelle porte `id`, `name`, `width`, `height`, `config`, `userId`. Elle mélange appareil et
contenu.

Le découpage :

| Colonne actuelle | Destination |
|------------------|-------------|
| `id`, `name`, `width`, `height`, `userId` | `devices` |
| `config`, `userId` | `scenes`, avec un nom dérivé de celui de la matrice |
| — | `devices.sceneId` pointe vers la scène créée |
| — | `devices.rendererId` pointe vers le renderer par défaut |
| — | `devices.tokenHash` doit être régénéré : aucun token n'existe dans le schéma actuel |

Points d'attention :

- La table actuelle **n'a pas de token** — le guard correspondant avait été retiré. Chaque device migré devra
  donc être ré-appairé.
- `config` est aujourd'hui un objet libre non validé. Les valeurs existantes ne passeront pas la validation du
  schéma versionné et devront être soit converties, soit remises à une scène vide.
- `createMatrixValidator` plafonne la géométrie à 128 ; la nouvelle limite est de 65 536 pixels au total.

L'écriture de la migration ne fait pas partie du périmètre de cette refonte documentaire.
