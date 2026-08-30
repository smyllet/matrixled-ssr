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
| `tokenHash` | string | Empreinte du credential de connexion |
| `tokenPrefix` | string | Préfixe en clair, pour identifier un token sans le révéler |
| `isDefault` | boolean | Renderer assigné par défaut aux nouveaux devices |
| `version` | string | Version annoncée à la connexion |
| `capabilities` | jsonb | Primitives que ce renderer sait rendre |
| `endpoint` | string \| null | Adresse annoncée, transmise aux devices au bootstrap |
| `status` | enum | `online` \| `offline` |
| `lastSeenAt` | timestamptz \| null | Dernière activité sur le canal de contrôle |
| `createdAt` / `updatedAt` | timestamptz | |

**Règles**

- Exactement un renderer porte `isDefault = true` et `ownerId = null`.
- `version`, `capabilities` et `endpoint` sont **déclarés par le renderer** à sa connexion. Ce sont des données
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
| `tokenHash` | string | Empreinte du credential |
| `tokenPrefix` | string | Préfixe en clair |
| `panelType` | enum | `hub75` — seule valeur supportée ([ADR-0005](adr/0005-hub75-dabord.md)) |
| `isSimulator` | boolean | Distingue un simulateur dans l'interface |
| `width` / `height` | integer | Géométrie totale en pixels |
| `chainLength` | integer | Nombre de dalles chaînées |
| `firmwareVersion` | string \| null | Déclarée par le device |
| `protocolVersion` | integer \| null | Déclarée par le device |
| `status` | enum | `online` \| `offline` \| `error` |
| `lastSeenAt` | timestamptz \| null | |
| `ipAddress` | inet \| null | Dernière adresse observée |
| `createdAt` / `updatedAt` | timestamptz | |

**Règles**

- `width × height ≤ 65 536`. La limite dérive de l'index de pixel sur 16 bits du protocole
  ([PROTOCOL-DEVICE.md](PROTOCOL-DEVICE.md)), soit 256×256 au maximum.
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

Les tokens de renderer et de device suivent la même règle :

- générés à l'appairage, **affichés une seule fois** ;
- stockés **hachés** — `tokenHash` — jamais en clair ;
- `tokenPrefix` conserve les premiers caractères en clair pour permettre d'identifier un token dans une
  interface ou un journal sans le divulguer.

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
