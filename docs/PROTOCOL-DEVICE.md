# Protocole device

> **Version du protocole** : 1
> **Statut** : spécification de référence
> Décisions : [ADR-0003](adr/0003-websocket-binaire-tcp.md) (WebSocket/TCP),
> [ADR-0011](adr/0011-auth-premier-message.md) (authentification),
> [ADR-0009](adr/0009-bootstrap-par-redirection.md) (bootstrap).

Ce document spécifie les échanges entre un **renderer** et un **device**. Il est écrit pour être implémentable
sans autre référence — par un firmware ESP32 comme par une page web ([SIMULATOR.md](SIMULATOR.md)).

## Principes

1. **Binaire, sans exception.** Aucun JSON sur ce chemin : le coût de parsing est payé trente fois par seconde
   sur un microcontrôleur. Les notions de zone et de layout n'apparaissent pas ici — elles sont internes au
   renderer et ne sont jamais transmises.
2. **Little-endian pour toutes les valeurs multi-octets**, sans exception. C'est l'ordre natif de l'ESP32 et du
   x86 : un `memcpy` suffit des deux côtés.
3. **Taille déductible du header.** Aucun message n'exige de scanner son contenu pour connaître sa longueur.
4. **Le device ne décide rien.** Il reçoit, décode, écrit. Aucune logique d'affichage embarquée.

### Notation

`u8`, `u16`, `u32` : entiers non signés, little-endian. `i16` : entier **signé**, little-endian.
`f32` : IEEE 754 simple précision, little-endian. Les offsets sont en octets, à partir de 0.

---

## Bootstrap

Avant toute connexion WebSocket, le device demande à la plateforme l'adresse de son renderer.

```http
GET /api/v1/device/bootstrap
Authorization: Bearer <token device>
```

```jsonc
{
  "renderer_urls": ["wss://renderer.example.net:8889", "ws://192.168.1.50:8889"],
  "panel": { "width": 64, "height": 32, "chain": 1 },
  "scene_version": 42
}
```

`renderer_urls` est la liste déclarée par le renderer, transmise telle quelle. **Le client choisit** : un
firmware retient `wss://` s'il est présent et `ws://` sinon ; le simulateur ne retient que ce que le navigateur
autorise depuis l'origine de la page qui le sert
([ADR-0016](adr/0016-transports-declares-par-le-renderer.md)).

Le device **met cette réponse en cache localement** et repart dessus si la plateforme ne répond pas au
redémarrage suivant. Sans ce cache, une panne de la plateforme empêcherait tout redémarrage, ce qui contredirait
l'autonomie garantie par [ADR-0008](adr/0008-renderer-autonome.md).

C'est le seul échange HTTP du cycle de vie d'un device, et le seul en JSON.

---

## Séquence de connexion

```
Device                                              Renderer
  │                                                     │
  │  ── ouverture WebSocket (aucun credential) ────────▶│
  │                                                     │  démarre le délai
  │                                                     │  d'authentification
  │  ── 0x01 DEVICE_HELLO (token, version, géométrie) ─▶│
  │                                                     │  valide l'empreinte
  │                                                     │  vérifie la géométrie
  │◀─ 0x02 CONFIG (géométrie autoritaire, fps) ─────────│
  │                                                     │
  │◀─ 0x03 FULL_FRAME (obligatoire en premier) ─────────│
  │◀─ 0x04 DELTA_FRAME ─────────────────────────────────│
  │◀─ 0x04 DELTA_FRAME ─────────────────────────────────│
  │  ── 0x05 STATUS_UPDATE (périodique) ───────────────▶│
  │                                                     │
```

**En cas d'échec**, le renderer envoie un `0x06 ERROR` puis ferme la connexion. Il ne laisse jamais une
connexion non authentifiée ouverte.

### Authentification

La connexion s'ouvre **sans credential** : l'API WebSocket des navigateurs ne permet pas de définir d'en-tête
HTTP, et le simulateur doit parler exactement le même protocole que le matériel
([ADR-0011](adr/0011-auth-premier-message.md)).

Le device envoie donc son token dans le premier message binaire. Le renderer :

- démarre un **délai d'authentification de 5 secondes** à l'ouverture de la socket ;
- ferme la connexion avec `ERROR 0x05` si le premier message n'est pas un `DEVICE_HELLO` valide dans ce délai ;
- ferme avec `ERROR 0x04` si l'empreinte du token ne correspond à aucun device qui lui est assigné.

Le renderer ne détient que des **empreintes** de tokens, jamais les tokens en clair
([DATA-MODEL.md](DATA-MODEL.md#credentials)).

### Négociation de version

`DEVICE_HELLO` porte `protocol_version`. Le renderer refuse avec `ERROR 0x06` toute version majeure qu'il ne
sait pas parler. La version retenue est renvoyée dans `CONFIG`.

### Contrôle de géométrie

`DEVICE_HELLO` déclare la géométrie que le device croit avoir ; `CONFIG` renvoie celle qui **fait autorité**,
issue du registre. En cas de divergence, le renderer envoie `ERROR 0x03` et ferme : afficher une frame calculée
pour une autre géométrie produirait une image corrompue et, si la frame est plus grande que le tampon, un
débordement.

### Une seule connexion active par device

Si un device déjà connecté ouvre une seconde connexion, **la nouvelle remplace l'ancienne** : le renderer envoie
`ERROR 0x08` sur la précédente et la ferme.

Cette règle est nécessaire indépendamment du simulateur : après une coupure WiFi, l'ancienne socket reste
souvent ouverte côté renderer, et sans cette règle le device se retrouverait incapable de se reconnecter jusqu'à
expiration du keep-alive TCP.

### Expiration du bail

Le droit de recevoir des frames est un **bail**, borné par l'`offlineGrace` du device
([ADR-0015](adr/0015-bail-de-session-device.md)). Quand le renderer est resté sans contact avec la plateforme
plus longtemps que cette durée, il ferme la connexion avec `ERROR 0x0A`, **y compris une connexion établie de
longue date**. Les reconnexions sont ensuite refusées avec le même code tant que le contact n'est pas rétabli.

`0x0A` n'est ni `0x04` ni `0x09` : le token reste valide, c'est le renderer qui n'est plus en mesure de
l'affirmer.
L'état est transitoire et se résout dès que la plateforme redevient joignable. Le device réessaie donc avec un
retrait exponentiel plafonné, sans considérer son credential comme perdu.

---

## Messages

**Les codes suivent l'ordre de la session** : poignée de main, configuration, données, télémétrie, erreur.
C'est l'ordre dans lequel ce document les décrit, et celui dans lequel une trace les fait apparaître.

| Code | Nom | Sens | Taille |
|------|-----|------|--------|
| `0x01` | `DEVICE_HELLO` | Device → Renderer | 11 + N |
| `0x02` | `CONFIG` | Renderer → Device | 10 |
| `0x03` | `FULL_FRAME` | Renderer → Device | 9 + w×h×3 |
| `0x04` | `DELTA_FRAME` | Renderer → Device | 7 + 5×N |
| `0x05` | `STATUS_UPDATE` | Device → Renderer | 27 |
| `0x06` | `ERROR` | Bidirectionnel | 4 + M |

`0x00` n'est le code d'aucun message et ne doit jamais en devenir un : un octet nul est ce qu'on lit d'un tampon
mal initialisé ou d'une frame tronquée, et c'est la seule valeur dont l'invalidité distingue un bug d'un message.

**Les codes d'erreur forment un espace de nommage distinct.** Le `0x06` de cette table est le message `ERROR` ;
le `0x06` de la table des codes d'erreur est « version de protocole non supportée ». Rien ne les relie, et une
implémentation qui les confondrait n'échouerait pas bruyamment.

### 0x01 — DEVICE_HELLO

| Offset | Taille | Type | Champ |
|--------|--------|------|-------|
| 0 | 1 | u8 | Type = `0x01` |
| 1 | 1 | u8 | `protocol_version` (= 1) |
| 2 | 2 | u16 | `firmware_version` (majeure × 256 + mineure) |
| 4 | 2 | u16 | `declared_width` |
| 6 | 2 | u16 | `declared_height` |
| 8 | 1 | u8 | `panel_type` — `0x00` = HUB75 |
| 9 | 1 | u8 | `flags` — bit 0 : device simulé |
| 10 | 1 | u8 | `token_len` (N) |
| 11 | N | u8[] | `token`, ASCII, **sans terminateur** |

**Total = 11 + N**

### 0x02 — CONFIG

| Offset | Taille | Type | Champ |
|--------|--------|------|-------|
| 0 | 1 | u8 | Type = `0x02` |
| 1 | 1 | u8 | `protocol_version` retenue |
| 2 | 2 | u16 | `width` faisant autorité |
| 4 | 2 | u16 | `height` faisant autorité |
| 6 | 1 | u8 | `brightness` (0–255) |
| 7 | 1 | u8 | `target_fps` — cadence **effective** de ce device, 1 à 60 ([ADR-0019](adr/0019-cadence-portee-par-la-scene.md)) |
| 8 | 2 | u16 | `status_interval_s` — période des `STATUS_UPDATE` |

**Total = 10 octets**

La cadence transmise ici est celle de la scène, éventuellement divisée par le plafond du device. Le calcul est
fait par Adonis : le device reçoit un seul chiffre et n'arbitre rien.

`CONFIG` peut être renvoyé à tout moment pour modifier luminosité ou cadence sans rouvrir la connexion. Un
changement de géométrie, lui, impose une reconnexion.

### 0x03 — FULL_FRAME

| Offset | Taille | Type | Champ |
|--------|--------|------|-------|
| 0 | 1 | u8 | Type = `0x03` |
| 1 | 4 | u32 | `sequence` |
| 5 | 2 | u16 | `width` |
| 7 | 2 | u16 | `height` |
| 9 | w×h×3 | u8[] | RGB888, **row-major** |

**Total = 9 + (width × height × 3)** — soit 6 153 octets en 64×32.

Ordre des pixels : ligne par ligne, de gauche à droite et de haut en bas. `index = y × width + x`.

Le device **doit** rejeter la frame si `width` ou `height` diffèrent de sa configuration, ou si la taille du
message ne correspond pas à la formule. C'est la dernière barrière contre un débordement de tampon.

### 0x04 — DELTA_FRAME

| Offset | Taille | Type | Champ |
|--------|--------|------|-------|
| 0 | 1 | u8 | Type = `0x04` |
| 1 | 4 | u32 | `sequence` |
| 5 | 2 | u16 | `count` (N) |
| 7 | 5 × N | — | N entrées consécutives |

Chaque entrée fait 5 octets :

| Offset relatif | Taille | Type | Champ |
|----------------|--------|------|-------|
| 0 | 2 | u16 | `index` — **little-endian** |
| 2 | 1 | u8 | R |
| 3 | 1 | u8 | G |
| 4 | 1 | u8 | B |

**Total = 7 + (5 × N)**

L'index sur 16 bits **plafonne une dalle à 65 536 pixels**, soit 256×256. Cette limite est structurelle : la
dépasser impose une version 2 du protocole.

**Aucune frame ne porte la luminosité** : elle n'est transportée que par `CONFIG`, qui en est la seule source.
La faire voyager aussi dans l'en-tête d'une frame imposerait une règle de précédence, et donc un défaut — une
frame calculée avant un changement de luminosité écraserait le réglage frais en arrivant après lui. La
luminosité est un réglage du device, pas un attribut de l'image : une scène qui veut fondre au noir assombrit
ses pixels.

### Le compteur `sequence`

Les deux types de frame portent le même compteur, et il obéit à trois règles :

- **Il appartient à la connexion d'un device**, pas à la scène ni au groupe de rendu. Le renderer l'incrémente de
  1 à chaque frame **réellement envoyée à ce device**, quel que soit son type. Un device plafonné
  ([ADR-0019](adr/0019-cadence-portee-par-la-scene.md)) ne voit donc aucun trou : les frames qu'il ne reçoit pas
  ne lui ont jamais été numérotées. Deux devices d'un même groupe ont des compteurs indépendants, et c'est
  nécessaire — un compteur partagé rendrait faux le calcul de latence, qui multiplie un écart de séquence par une
  période de frame.
- **Il repart de 0 à chaque connexion**, sur la `FULL_FRAME` obligatoire qui ouvre la session. Le device n'a donc
  aucun état à conserver d'une session à l'autre, et une reconnexion ne se distingue pas d'un premier démarrage.
- **Il boucle modulo 2³²**, ce qui laisse environ deux ans et demi de session continue à 60 FPS. La comparaison
  avec `last_applied_sequence` doit se faire modulo, sans quoi ce bouclage produirait une latence aberrante une
  fois par éternité.

Le device ne fait rien d'autre que le mémoriser et le renvoyer : ni détection de trou, ni demande de
retransmission. L'ordre et l'intégrité sont garantis par TCP ([ADR-0003](adr/0003-websocket-binaire-tcp.md)), et
une frame perdue serait de toute façon remplacée par la suivante avant d'être utile.

### 0x05 — STATUS_UPDATE

| Offset | Taille | Type | Champ |
|--------|--------|------|-------|
| 0 | 1 | u8 | Type = `0x05` |
| 1 | 4 | f32 | `fps` mesurées |
| 5 | 4 | u32 | `frames_applied` |
| 9 | 4 | u32 | `last_applied_sequence` |
| 13 | 2 | **i16** | `wifi_rssi` en dBm — **valeur signée** |
| 15 | 4 | u32 | `free_heap` en octets |
| 19 | 4 | u32 | `free_psram` en octets |
| 23 | 4 | u32 | `uptime_s` |

**Total = 27 octets**

`last_applied_sequence` sert à mesurer la latence de bout en bout et à détecter un device qui décroche. Ce n'est
**pas** un accusé de réception : il ne déclenche aucune retransmission, TCP s'en charge
([ADR-0003](adr/0003-websocket-binaire-tcp.md)).

Trois métriques des versions antérieures ont été retirées : la **tension d'alimentation** et la **température
CPU**, faute de capteur fiable sur le matériel de référence, et le **compteur de paquets perdus**, sans objet
sur TCP. Une métrique inventée est pire qu'une métrique absente.

### 0x06 — ERROR

| Offset | Taille | Type | Champ |
|--------|--------|------|-------|
| 0 | 1 | u8 | Type = `0x06` |
| 1 | 1 | u8 | `code` |
| 2 | 2 | u16 | `msg_len` (M) |
| 4 | M | u8[] | Message UTF-8, **sans terminateur** |

**Total = 4 + M**

La longueur est explicite plutôt que délimitée par un octet nul : chercher un terminateur dans un flux binaire
est une source classique de dépassement de lecture.

`0x00` n'est le code d'aucune erreur, comme il n'est le code d'aucun message.

| Code | Signification |
|------|---------------|
| `0x01` | Message malformé |
| `0x02` | Frame trop grande pour le tampon |
| `0x03` | Géométrie incohérente avec le registre |
| `0x04` | Authentification refusée |
| `0x05` | Délai d'authentification dépassé |
| `0x06` | Version de protocole non supportée |
| `0x07` | Allocation mémoire impossible |
| `0x08` | Connexion remplacée par une plus récente |
| `0x09` | Device inconnu ou révoqué |
| `0x0A` | Bail expiré : le renderer a perdu le contact avec la plateforme |

---

## Arbitrage FULL / DELTA

Avant chaque envoi, le renderer calcule les deux tailles et **envoie la plus petite** :

```
fullSize  = 9 + width × height × 3
deltaSize = 7  + 5 × nombre_de_pixels_modifiés

si   aucun pixel modifié       → n'envoyer rien
sinon si deltaSize < fullSize  → DELTA_FRAME
sinon                          → FULL_FRAME
```

La règle est **exacte** : elle compare les deux coûts réels au lieu d'approcher le point de bascule par un seuil
en pourcentage. Le point d'équilibre s'en déduit — le mode différentiel cesse d'être rentable au-delà de
`(3 × width × height + 2) / 5` pixels modifiés, soit environ 60 % des pixels.

Cas particuliers, à respecter impérativement :

- **La première frame d'une session est toujours une `FULL_FRAME`.** Le renderer ne connaît pas l'état de la
  dalle avant elle.
- **Après toute reconnexion**, même immédiate, la première frame est une `FULL_FRAME`. L'état du device est
  réputé inconnu.
- Une frame identique à la précédente n'est pas envoyée. Un affichage statique consomme donc zéro bande
  passante.

---

## Backpressure

C'est le **seul mode de défaillance réel** du chemin de données. TCP garantissant la livraison et l'ordre, il
n'y a pas de perte de frame ; en revanche, si un device consomme moins vite que le renderer ne produit, le
tampon d'émission se remplit et la latence croît sans borne.

Règle : **la dernière frame gagne.**

- Le renderer conserve au plus **une** frame en attente par device.
- Si la socket n'est pas immédiatement écrivable, la frame en attente est **remplacée**, jamais mise en file.
- Une frame remplacée est comptée comme abandonnée, et l'état différentiel est invalidé : la prochaine frame
  effectivement émise sera une `FULL_FRAME`, puisque le renderer ne sait plus ce que le device affiche.

Empiler les frames produirait un affichage en retard croissant, ce qui est pire qu'un affichage qui saute des
images.

---

## Reconnexion

Le device reconnecte avec un **retrait exponentiel** — 1 s, 2 s, 4 s… plafonné à 30 s — et une part d'aléa pour
éviter que plusieurs devices ne se reconnectent en cœur après une coupure.

À chaque reconnexion, le cycle complet est rejoué : `DEVICE_HELLO`, `CONFIG`, puis `FULL_FRAME`.

Le keep-alive s'appuie sur le **ping/pong natif de WebSocket**. Il n'existe pas de message applicatif de
keep-alive : le redoubler au niveau applicatif n'apporterait rien
([ADR-0003](adr/0003-websocket-binaire-tcp.md)).

---

## Conformité

Une implémentation conforme doit :

- rejeter tout message dont la taille ne correspond pas à la formule de son type ;
- rejeter toute frame dont la géométrie diffère de celle négociée dans `CONFIG` ;
- traiter `wifi_rssi` comme une valeur **signée** ;
- lire toutes les valeurs multi-octets en **little-endian** ;
- n'exiger aucun en-tête HTTP personnalisé à l'ouverture de la connexion.

Le [simulateur](SIMULATOR.md) fait office d'implémentation de référence.
