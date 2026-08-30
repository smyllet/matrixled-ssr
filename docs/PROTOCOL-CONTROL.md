# Protocole de contrôle

> **Version de l'enveloppe** : 1
> Décisions : [ADR-0007](adr/0007-plan-de-controle-wss.md) (WSS sortant, JSON versionné),
> [ADR-0004](adr/0004-device-vers-renderer.md) (Adonis seul propriétaire de la base),
> [ADR-0008](adr/0008-renderer-autonome.md) (autonomie hors ligne).

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
    "endpoint": "wss://renderer.lan:8889",
    "state_version": 41
  }
}
```

`version`, `capabilities` et `endpoint` sont **déclarés par le renderer**. Ce sont des données non fiables :
Adonis les valide et les borne avant de les persister ([ARCHITECTURE.md](ARCHITECTURE.md#frontière-de-confiance)).

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

Registre complet des devices assignés à ce renderer, avec leurs scènes. Réponse par défaut à `renderer.hello`.

```jsonc
{
  "v": 1, "type": "sync.full", "id": "…",
  "payload": {
    "state_version": 47,
    "devices": [
      {
        "device_id": "…",
        "token_prefix": "71ce04ba82df",
        "token_hash": "scrypt$…",
        "panel_type": "hub75",
        "width": 64, "height": 32, "chain_length": 1,
        "brightness": 128,
        "target_fps": 30,
        "scene": { "scene_id": "…", "version": 12, "config": { "version": 1, "nodes": [] } }
      }
    ]
  }
}
```

Le renderer reçoit **l'empreinte** du token, jamais le token. C'est ce qui rend acceptable sa réplication chez un
tiers ([DATA-MODEL.md](DATA-MODEL.md#credentials)).

Il reçoit aussi le **préfixe**, et il en a besoin : un `DEVICE_HELLO` ne porte que le token, sans identifiant de
device ([PROTOCOL-DEVICE.md](PROTOCOL-DEVICE.md#authentification)). Le préfixe est ce qui rattache le token
présenté à une entrée du cache ; l'empreinte ne sert qu'ensuite, à vérifier le secret
([ADR-0012](adr/0012-format-des-tokens.md)).

Il ne reçoit **que ses propres devices assignés**, jamais le registre global. Sur le renderer par défaut, qui est
multi-tenant, cette restriction est la frontière d'isolation entre utilisateurs.

### `sync.delta`

Changements depuis un `state_version` donné, quand Adonis peut les calculer. Même forme, restreinte aux entrées
modifiées, avec les suppressions listées.

### `device.assigned` / `device.unassigned`

Un device entre ou sort du périmètre de ce renderer. À la désassignation, le renderer ferme la connexion du
device et **purge son entrée de cache**.

### `device.revoked`

Le credential d'un device n'est plus valide.

```jsonc
{ "v": 1, "type": "device.revoked", "id": "…", "payload": { "device_id": "…" } }
```

Le renderer ferme immédiatement la connexion concernée avec `ERROR 0x09` et retire l'empreinte de son cache.

### `scene.updated`

La scène assignée à un ou plusieurs devices a changé. Porte la configuration complète et sa version — pas un
diff : une scène est petite, et un diff introduirait un état intermédiaire à gérer.

### `config.updated`

Changement de luminosité ou de cadence sans changement de scène. Se traduit par un `CONFIG` sur le chemin device,
sans reconnexion.

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
2. **Durée de validité du cache** — une entrée non revalidée expire. Passé ce délai, le renderer refuse les
   nouvelles connexions du device concerné, mais ne coupe pas celles déjà établies.
3. **Comportement hors ligne** — un renderer déconnecté de la plateforme continue de servir les devices déjà
   authentifiés sur son cache. C'est le compromis explicite de [ADR-0008](adr/0008-renderer-autonome.md) : la
   dalle du salon survit à une panne, au prix d'un délai de révocation.

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
