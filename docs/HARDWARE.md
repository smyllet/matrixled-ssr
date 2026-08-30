# Matériel

> **Règle de ce document** : toute valeur est soit **sourcée** (documentation constructeur, ou code du firmware
> V1 qui a réellement fonctionné), soit explicitement marquée **à vérifier**. Rien n'est écrit de mémoire.
>
> Les versions antérieures de ce document contenaient plusieurs valeurs fausses, dont un brochage qui n'aurait
> pas fonctionné. Le détail figure en fin de document.

## Matériel de référence

**Adafruit MatrixPortal S3** pilotant une dalle **HUB75**, via **Adafruit Protomatter**.

C'est le seul matériel pour lequel un firmware a réellement tourné sur ce projet, et la seule technologie
supportée ([ADR-0005](adr/0005-hub75-dabord.md)).

### Caractéristiques

| Caractéristique | Valeur | Source |
|-----------------|--------|--------|
| Microcontrôleur | ESP32-S3 | Adafruit |
| Flash | 8 Mo | Adafruit |
| **PSRAM** | **2 Mo** | Adafruit |
| WiFi | 2,4 GHz uniquement | ESP32-S3, monobande |
| Connecteur dalle | HUB75, 2×8 broches | Adafruit |
| NeoPixel de statut | **GPIO 4** | Adafruit + firmware V1 |
| Bouton Up | GPIO 6 | Adafruit |
| Bouton Down | GPIO 7 | Adafruit |
| Capteur embarqué | Accéléromètre **LIS3DH** | Adafruit |

Deux points méritent attention car ils contredisent la documentation précédente :

- **2 Mo de PSRAM**, pas 8. Cela reste très confortable — une frame 64×32 occupe 6 Ko — mais l'ordre de grandeur
  compte pour les grandes dalles ([PERFORMANCE.md](PERFORMANCE.md)).
- Le seul capteur embarqué est un **accéléromètre**. Il n'y a pas de capteur de luminosité, donc pas de réglage
  automatique de la luminosité sans composant additionnel.

## Brochage HUB75

Valeurs issues du **firmware V1**, qui a effectivement piloté une dalle. C'est la source la plus fiable
disponible : du code qui a tourné prime sur une table recopiée.

```c
// Adafruit MatrixPortal S3 — Adafruit_Protomatter
uint8_t rgbPins[]  = {42, 41, 40, 38, 39, 37};   // R1 G1 B1 R2 G2 B2
uint8_t addrPins[] = {45, 36, 48, 35, 21};       // A B C D E
uint8_t clockPin   = 2;
uint8_t latchPin   = 47;
uint8_t oePin      = 14;

uint8_t rgbCount   = 1;
uint8_t addrCount  = 4;   // 4 lignes d'adresse pour une dalle 64×32
uint8_t bitDepth   = 6;

Adafruit_Protomatter matrix(
    WIDTH, bitDepth, rgbCount, rgbPins,
    addrCount, addrPins, clockPin, latchPin, oePin, false);
```

`addrCount` dépend de la hauteur de la dalle : 4 lignes d'adresse pour une 64×32, 5 pour une 64×64. La cinquième
broche d'adresse (E) passe par un cavalier sur la carte — **à vérifier** sur la carte utilisée, la documentation
Adafruit indiquant qu'il peut être relié à la broche 8 ou 16 du connecteur HUB75.

`bitDepth = 6` est un compromis entre profondeur de couleur et fréquence de rafraîchissement : Protomatter
recompose l'image par modulation temporelle, et chaque bit supplémentaire coûte du temps de rafraîchissement.

## Alimentation

| Élément | Valeur | Source |
|---------|--------|--------|
| Dalle 64×32, mesuré en usage | ~3,4 A à 5 V | Adafruit |
| Dalle 64×32, pire cas | ~4 A à 5 V | Adafruit |
| Alimentation recommandée, une dalle 64×32 | **5 V 4 A** | Adafruit |
| Tension | 5 V, **jamais plus** | Adafruit |

Le pire cas théorique — tous les pixels en blanc, pleine luminosité — donne un chiffre plus élevé, mais Adafruit
relève environ 3,4 A en pratique sur une 64×32 et recommande 4 A.

**Ordres de grandeur pour d'autres géométries** — extrapolés au prorata des pixels, donc **à vérifier** :

| Géométrie | Alimentation indicative |
|-----------|-------------------------|
| 32×32 | 5 V 2 A |
| 64×32 | 5 V 4 A *(sourcé)* |
| 64×64 | 5 V 8 A |
| 128×64 | 5 V 16 A |

### Précautions

- Ne jamais alimenter une dalle depuis le port USB d'un ordinateur : la limite est de 500 mA, soit un ordre de
  grandeur sous le besoin.
- Utiliser des conducteurs de section suffisante — AWG 18 ou plus gros au-delà de 5 A.
- Alimenter la dalle et la carte depuis la même masse.

## Réseau

| Caractéristique | Valeur |
|-----------------|--------|
| Bande | 2,4 GHz uniquement — l'ESP32-S3 ne fait pas de 5 GHz |
| Norme | 802.11 b/g/n |

Le point d'attention n'est pas le débit d'une dalle (1,48 Mbit/s en 64×32, voir
[PERFORMANCE.md](PERFORMANCE.md)) mais la contention : plusieurs dalles en flux permanent partagent le même
canal 2,4 GHz que le reste du réseau.

Réglages recommandés côté firmware : `WIFI_PS_NONE` pour supprimer le jitter de mise en veille, et `TCP_NODELAY`
pour éviter qu'une frame n'attende le remplissage d'un segment.

## Géométries supportées

Le protocole plafonne à **65 536 pixels** par device, soit 256×256, du fait de l'index de pixel sur 16 bits
([PROTOCOL-DEVICE.md](PROTOCOL-DEVICE.md)).

En pratique, la limite utile vient bien avant : de la bande passante WiFi et de l'alimentation. Une 128×128
demande 11,8 Mbit/s en flux complet permanent et une alimentation conséquente.

## Bibliothèques du firmware V1

Références utiles, telles qu'employées dans le `platformio.ini` V1 :

```ini
board = adafruit_matrixportal_esp32s3
framework = arduino

lib_deps =
    adafruit/Adafruit Protomatter@^1.7.0    ; pilotage HUB75
    adafruit/Adafruit NeoPixel@^1.12.0      ; NeoPixel de statut (GPIO 4)
    gilmaimon/ArduinoWebsockets@^0.5.4      ; client WebSocket
```

`AnimatedGIF` et `ArduinoJson`, présents en V1, ne sont plus nécessaires : le décodage GIF relevait de
l'approche par clip pré-rendu ([ADR-0001](adr/0001-streaming-de-frames.md)), et le protocole device ne
transporte aucun JSON.

> **Note sur l'authentification.** Le firmware V1 utilisait `client.addHeader("token", …)`. Cette approche n'est
> plus retenue : l'authentification se fait désormais par premier message binaire, pour rester implémentable
> depuis un navigateur ([ADR-0011](adr/0011-auth-premier-message.md)).

## Corrections apportées à ce document

Les valeurs suivantes figuraient dans la version précédente et étaient fausses :

| Affirmation précédente | Réalité | Impact |
|------------------------|---------|--------|
| Brochage CLK 41, OE 38, LAT 40, A 39, B 42, C 45, D 48 | Voir ci-dessus | **N'aurait pas fonctionné** |
| 8 Mo de PSRAM | 2 Mo | Dimensionnement des tampons |
| Capteur de luminosité BH1750 | Accéléromètre LIS3DH, pas de capteur de luminosité | Fonctionnalité inexistante |
| LED rouge GPIO 47, verte GPIO 48 | Un NeoPixel unique sur GPIO 4 | Diagnostic |
| Boutons A et B sur GPIO 0 et 1 | Up sur 6, Down sur 7 | — |
| 64×32 : 10 à 15 A, alimentation 5 V 20 A | ~3,4 A, alimentation 5 V 4 A | Surdimensionnement d'un facteur 5 |
| 64×64 : alimentation 5 V 40 A | Ordre de grandeur : 5 V 8 A | idem |

Les valeurs de consommation précédentes mélangeaient les ordres de grandeur des rubans adressables et des dalles
HUB75 — deux technologies dont la documentation promettait à tort le support simultané
([ADR-0005](adr/0005-hub75-dabord.md)).

## Sources

- [Adafruit MatrixPortal S3 — Overview](https://learn.adafruit.com/adafruit-matrixportal-s3/overview)
- [Adafruit MatrixPortal S3 — Pinouts](https://learn.adafruit.com/adafruit-matrixportal-s3/pinouts)
- [RGB LED Matrix Basics — Power](https://learn.adafruit.com/32x16-32x32-rgb-led-matrix/powering)
- Firmware V1 du projet : `git show c502659^:firmware/src/main.cpp`
