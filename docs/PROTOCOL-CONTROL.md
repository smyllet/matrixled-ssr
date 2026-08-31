# Protocole de contrôle

> **Version de l'enveloppe** : 1
> Décisions : [ADR-0007](adr/0007-plan-de-controle-wss.md) (WSS sortant, JSON versionné),
> [ADR-0004](adr/0004-device-vers-renderer.md) (Adonis seul propriétaire de la base),
> [ADR-0008](adr/0008-renderer-autonome.md) (autonomie hors ligne),
> [ADR-0017](adr/0017-rendu-mutualise.md) (scènes normalisées dans le registre).

Ce document spécifie le canal entre un **renderer** et **AdonisJS** : configuration et registre dans un sens,
état dans l'autre.

## Forme du canal

**Le renderer compose vers Adonis**, en WSS, et maintient la connexion ouverte. Jamais l'inverse : un renderer
auto-hébergé est derrière NAT et ne peut recevoir aucune connexion entrante. Cette hypothèse est structurante et
tient dans toute la documentation.

```
Renderer ──── WSS ────▶ wss://plateforme/api/v1/renderer/control
         ◀───────────── configuration, assignations, révocations
         ─────────────▶ état des devices, télémétrie
```

L'authentification se fait par en-tête `Authorization: Bearer <token renderer>` à l'ouverture. Contrairement au
chemin device, aucune contrainte navigateur ne s'applique ici — un renderer est toujours un programme.

Le format est du **JSON**, ce qui n'est pas une entorse au principe « binaire uniquement » : celui-ci ne vaut
que pour le chemin device, où le coût de parsing est payé trente fois par seconde sur un microcontrôleur. Ici le
trafic est événementiel.

## Enveloppe

Tout message est un objet JSON de cette forme :

```jsonc
{
  "v": 1,                    // version de l'enveloppe
  "type": "device.assigned", // nom de l'événement
  "id": "01J9…",             // identifiant du message, pour corrélation et idempotence
  "payload": { }
}
```

Le contrat n'étant garanti par aucun compilateur ([ADR-0002](adr/0002-renderer-en-go.md) introduit une frontière
de langages), `v` est **obligatoire** et vérifié à la réception. Un message dont la version majeure est inconnue
est ignoré et journalisé, jamais interprété au mieux.

`id` rend chaque message rejouable sans effet de bord, ce dont dépend la resynchronisation.

---

## Renderer → Adonis

### `renderer.hello`

Premier message après l'ouverture. Il porte l'identité, les capacités et **la version d'état connue**.

```jsonc
{
  "v": 1, "type": "renderer.hello", "id": "…",
  "payload": {
    "version": "0.3.1",
    "protocol_versions": [1],
    "capabilities": {
      "panel_types": ["hub75"],
      "scene_schema_versions": [1],
      "scene_nodes": [],
      "max_devices": 32,
      "max_pixels_per_device": 65536
    },
    "endpoints": ["wss://renderer.lan:8889", "ws://192.168.1.50:8889"],
    "state_version": 41
  }
}
```

`version`, `capabilities` et `endpoints` sont **déclarés par le renderer**. Ce sont des données non fiables :
Adonis les valide et les borne avant de les persister ([ARCHITECTURE.md](ARCHITECTURE.md#frontière-de-confiance)).

`endpoints` est une **liste** : un renderer peut être joignable en `wss://`, en `ws://`, ou les deux. Adonis la
transmet telle quelle au bootstrap et **ne choisit pas** à la place du client
([ADR-0016](adr/0016-transports-declares-par-le-renderer.md)). Il ne peut d'ailleurs rien vérifier : un renderer
auto-hébergé lui est injoignable.

`state_version` est le pivot de la resynchronisation.

### `device.status`

État observé d'un device, émis à chaque changement et périodiquement.

```jsonc
{
  "v": 1, "type": "device.status", "id": "…",
  "payload": {
    "device_id": "…",
    "status": "online",
    "last_seen_at": "2026-08-30T12:00:00Z",
    "ip_address": "192.168.1.42",
    "firmware_version": "1.0",
    "protocol_version": 1,
    "metrics": {
      "fps": 29.8,
      "frames_applied": 128400,
      "last_applied_sequence": 128400,
      "wifi_rssi": -54,
      "free_heap": 180224,
      "free_psram": 1835008,
      "uptime_s": 4280
    }
  }
}
```

**Adonis n'accorde aucune confiance à ce message.** Il vérifie que `device_id` est bien assigné à ce renderer —
un renderer ne peut pas revendiquer un device qui ne lui appartient pas — puis borne chaque métrique avant de la
persister.

### `renderer.metrics`

Télémétrie agrégée du renderer : nombre de devices servis, frames émises, octets émis, charge.

---

## Adonis → Renderer

### `sync.full`

Registre complet des devices assignés à ce renderer, et des scènes qu'ils référencent. Réponse par défaut à
`renderer.hello`.

```jsonc
{
  "v": 1, "type": "sync.full", "id": "…",
  "payload": {
    "state_version": 47,
    "scenes": [
      { "scene_id": "…", "version": 12, "width": 64, "height": 32, "target_fps": 30,
        "config": { "version": 1, "nodes": [] } }
    ],
    "devices": [
      {
        "device_id": "…",
        "token_prefix": "71ce04ba82df",
        "token_hash": "scrypt$…",
        "panel_type": "hub75",
        "width": 64, "height": 32, "chain_length": 1,
        "brightness": 128,
        "max_fps": null,
        "scene_id": "…"
      }
    ]
  }
}
```

**Les scènes sont une section à part, et un device n'en porte que la référence.** Le modèle lie déjà N devices à
une scène ([DATA-MODEL.md](DATA-MODEL.md#scene)) ; recopier la configuration dans chaque entrée de device aurait
autorisé deux copies divergentes d'une même scène en une même version, et aurait présenté comme N contenus
indépendants ce que le renderer doit calculer une seule fois ([ADR-0017](adr/0017-rendu-mutualise.md)).

Une scène porte **sa** géométrie, distincte de celle du device : le renderer l'évalue en natif puis réplique
chaque pixel en un bloc `k×k`, où `k` est le rapport entier entre les deux
([ADR-0018](adr/0018-geometrie-native-de-la-scene.md)). Adonis n'assigne jamais une paire dont le rapport n'est
pas un entier identique sur les deux axes ; le renderer qui en reçoit une malgré tout refuse la scène et
journalise, il ne redimensionne pas au mieux.

**La cadence est portée par la scène**, `max_fps` n'étant qu'un plafond d'émission par device — `null` la
plupart du temps ([ADR-0019](adr/0019-cadence-portee-par-la-scene.md)). Le renderer évalue à `target_fps` et
n'émet qu'une frame sur `n = ⌈target_fps / max_fps⌉` vers un device plafonné.

`scene_id` vaut `null` pour un device sans scène assignée — écran noir. Tout `scene_id` référencé par un device
**doit** figurer dans `scenes` ; un message qui référence une scène absente est rejeté en entier plutôt
qu'appliqué partiellement. Une scène qu'aucun device ne référence n'est pas envoyée.

Le renderer reçoit **l'empreinte** du token, jamais le token. C'est ce qui rend acceptable sa réplication chez un
tiers ([DATA-MODEL.md](DATA-MODEL.md#credentials)).

Il reçoit aussi le **préfixe**, et il en a besoin : un `DEVICE_HELLO` ne porte que le token, sans identifiant de
device ([PROTOCOL-DEVICE.md](PROTOCOL-DEVICE.md#authentification)). Le préfixe est ce qui rattache le token
présenté à une entrée du cache ; l'empreinte ne sert qu'ensuite, à vérifier le secret
([ADR-0012](adr/0012-format-des-tokens.md)).

Il ne reçoit **que ses propres devices assignés**, jamais le registre global. Sur le renderer par défaut, qui est
multi-tenant, cette restriction est la frontière d'isolation entre utilisateurs.

### `sync.delta`

Changements depuis un `state_version` donné, quand Adonis peut les calculer. Même forme — les deux sections
`scenes` et `devices` — restreinte aux entrées modifiées, avec les suppressions listées. Une scène modifiée y
figure **une fois**, quel que soit le nombre de devices qui la référencent.

### `device.assigned` / `device.unassigned`

Un device entre ou sort du périmètre de ce renderer. À la désassignation, le renderer ferme la connexion du
device et **purge son entrée de cache**. Il purge aussi la scène référencée s'il était le dernier device à la
référencer.

### `device.revoked`

Le credential d'un device n'est plus valide.

```jsonc
{ "v": 1, "type": "device.revoked", "id": "…", "payload": { "device_id": "…" } }
```

Le renderer ferme immédiatement la connexion concernée avec `ERROR 0x09` et retire l'empreinte de son cache.

### `device.credential_rotated`

Le credential d'un device a été remplacé. Le renderer met à jour son entrée de cache et **ferme la connexion en
cours** avec `ERROR 0x09` : le token qu'elle avait présenté n'est plus valide.

```jsonc
{
  "v": 1, "type": "device.credential_rotated", "id": "…",
  "payload": { "device_id": "…", "token_prefix": "71ce04ba82df", "token_hash": "scrypt$…" }
}
```

C'est la réponse à une fuite pour n'importe quel device ([ADR-0012](adr/0012-format-des-tokens.md)), et le moyen
par lequel le simulateur obtient à l'ouverture un token utilisable, puisque aucun secret n'est relisible
([ADR-0021](adr/0021-credential-du-simulateur-par-rotation.md)).

Adonis émet cet événement **avant** de rendre le secret à son demandeur, et refuse la rotation quand le renderer
est hors ligne : un secret que le renderer ne peut pas apprendre ne servirait qu'à détruire le précédent.

### `scene.updated`

Une scène a changé. Le message porte la scène, pas les devices : il est émis **une fois**, et le renderer
l'applique à tous les devices qui la référencent — il les connaît par son registre.

```jsonc
{
  "v": 1, "type": "scene.updated", "id": "…",
  "payload": { "scene_id": "…", "version": 13, "width": 64, "height": 32, "target_fps": 30,
               "config": { "version": 1, "nodes": [] } }
}
```

La configuration est complète, jamais un diff : une scène est petite, et un diff introduirait un état
intermédiaire à gérer.

### `config.updated`

Changement de luminosité ou de plafond d'émission sans changement de scène. Se traduit par un `CONFIG` sur le
chemin device, sans reconnexion. Un changement de **cadence** relève de `scene.updated`, puisque la cadence
appartient à la scène — mais il produit lui aussi un `CONFIG`, la cadence effective de chaque device en
dépendant.

---

## Resynchronisation

Une architecture à état partagé aurait fourni la resynchronisation gratuitement. C'est le coût assumé de
[ADR-0007](adr/0007-plan-de-controle-wss.md), et il doit donc être spécifié explicitement.

```
1. Le renderer (re)connecte et envoie renderer.hello avec son state_version.
2. Adonis compare :
   - state_version à jour        → rien à envoyer
   - retard calculable           → sync.delta
   - retard non calculable       → sync.full
3. Le renderer applique, puis adopte le state_version reçu.
```

Toutes les opérations sont **idempotentes** : rejouer un `sync.full` ou un `sync.delta` déjà appliqué ne produit
aucun effet de bord. C'est ce qui rend la reprise sûre après une coupure de durée quelconque.

Le renderer reconnecte avec un retrait exponentiel plafonné, et **continue de servir ses devices pendant toute
la coupure** ([ADR-0008](adr/0008-renderer-autonome.md)).

---

## Révocation et fenêtre d'exposition

Le renderer met en cache les empreintes de tokens device pour rester autonome. Une révocation n'est donc pas
instantanée. Trois mécanismes bornent la fenêtre :

1. **Événement immédiat** — `device.revoked` est traité dès réception, connexion fermée.
2. **Bail de session** — chaque device porte un `offlineGrace`. Passé ce délai sans contact de contrôle
   réussi, le renderer ferme la connexion avec `ERROR 0x0A` et refuse les reconnexions jusqu'au rétablissement.
   La coupure vise **aussi les connexions établies** : le lien renderer → device étant permanent
   ([ADR-0001](adr/0001-streaming-de-frames.md)), une expiration qui ne filtrerait que les reconnexions ne
   s'appliquerait jamais à une dalle allumée ([ADR-0015](adr/0015-bail-de-session-device.md)).
3. **Comportement hors ligne** — un renderer déconnecté continue de servir les devices déjà authentifiés dont le
   bail court encore. C'est le compromis explicite de [ADR-0008](adr/0008-renderer-autonome.md) : la dalle du
   salon survit à une panne, au prix d'un délai de révocation — mais ce délai est désormais fini et réglable par
   dalle, au lieu d'être illimité.

Le déclencheur du point 2 est **l'absence de contact**, non la réception d'un message : un `device.revoked` ne
peut pas traverser un canal coupé, et c'est précisément quand le canal est coupé qu'on ne peut plus rien
révoquer.

Une révocation vraiment immédiate imposerait de déléguer la validation à Adonis, alternative écartée parce
qu'elle éteindrait toutes les dalles en cas de panne de la plateforme.

---

## Négociation de capacités

Un renderer auto-hébergé sera toujours en retard d'une version sur la plateforme. Sans négociation, il
afficherait un résultat faux au lieu de refuser proprement.

À la réception de `renderer.hello`, Adonis compare les capacités déclarées aux exigences des scènes assignées :

- une scène dont la `version` de schéma n'est pas supportée **n'est pas assignée** ;
- une scène utilisant une primitive absente de `scene_nodes` **n'est pas assignée** ;
- un device dont la géométrie dépasse `max_pixels_per_device` **n'est pas assigné** ;
- au-delà de `max_devices`, l'assignation est refusée.

Chaque refus est remonté à l'utilisateur dans le dashboard avec sa cause. **Un refus explicite vaut mieux qu'un
affichage faux.**

Le mécanisme est spécifié dès maintenant ; le vocabulaire de `scene_nodes` se remplira avec les primitives.
Voir [SELF-HOSTING.md](SELF-HOSTING.md).
