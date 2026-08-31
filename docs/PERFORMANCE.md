# Performances

> **Avertissement de lecture.** Ce document distingue strictement trois natures de chiffres :
> **calculé** (arithmétique reproductible à partir des formats de [PROTOCOL-DEVICE.md](PROTOCOL-DEVICE.md)),
> **mesuré** (relevé sur du matériel, avec sa méthode), **budget** (objectif de conception, non vérifié).
>
> Une version antérieure de ce document présentait des budgets comme des « benchmarks ». Aucun n'avait été
> relevé. Un chiffre inventé est pire qu'un chiffre absent : il empêche de constater qu'on ne sait pas.
>
> **À ce jour, ce document ne contient aucune valeur mesurée.**

## Bande passante — calculé

Formules, directement issues des en-têtes du protocole :

```
FULL   = 10 + largeur × hauteur × 3   octets
DELTA  = 7  + 5 × pixels_modifiés     octets
```

**Les débits ci-dessous sont donnés à 30 FPS parce que c'est la cadence par défaut, pas parce qu'elle est
figée.** `targetFps` se règle par device, de 1 à 60 ([ADR-0001](adr/0001-streaming-de-frames.md)) ; la taille
d'une frame n'en dépend pas, le débit lui est directement proportionnel. Un device à 10 FPS consomme le tiers de
la ligne correspondante, un device à 60 FPS le double.

### Frame complète, à 30 FPS

| Géométrie | Pixels | FULL | Débit @30 FPS | |
|-----------|--------|------|---------------|---|
| 32×32 | 1 024 | 3 082 o | 90,3 Kio/s | 0,74 Mbit/s |
| **64×32** | **2 048** | **6 154 o** | **180,3 Kio/s** | **1,48 Mbit/s** |
| 64×64 | 4 096 | 12 298 o | 360,3 Kio/s | 2,95 Mbit/s |
| 128×64 | 8 192 | 24 586 o | 720,3 Kio/s | 5,90 Mbit/s |
| 128×128 | 16 384 | 49 162 o | 1,41 Mio/s | 11,8 Mbit/s |
| 256×256 | 65 536 | 196 618 o | 5,63 Mio/s | 47,2 Mbit/s |

256×256 est le maximum absolu du protocole, imposé par l'index de pixel sur 16 bits.

### Apport du mode différentiel

Pour une dalle 64×32, à 30 FPS :

| Pixels modifiés | DELTA | Débit @30 FPS | vs FULL |
|-----------------|-------|---------------|---------|
| 1 % (20 px) | 107 o | 3,1 Kio/s | ÷ 58 |
| 10 % (205 px) | 1 032 o | 30,2 Kio/s | ÷ 6,0 |
| 25 % (512 px) | 2 567 o | 75,2 Kio/s | ÷ 2,4 |
| 60 % (1 229 px) | 6 152 o | 180,2 Kio/s | ≈ égal |

**Point de bascule** : le mode différentiel cesse d'être rentable à `(3P + 3) / 5` pixels modifiés, soit environ
**60 % des pixels**. Le renderer n'a pas besoin de ce chiffre — il compare directement les deux tailles avant
chaque envoi ([PROTOCOL-DEVICE.md](PROTOCOL-DEVICE.md#arbitrage-full--delta)) — mais il éclaire les ordres de
grandeur.

Un affichage statique consomme **zéro** : une frame identique à la précédente n'est pas envoyée.

### Ce que ça implique — calculé

Le WiFi 2,4 GHz du Matrix Portal S3 (802.11 b/g/n, monobande) délivre en pratique quelques dizaines de Mbit/s
partagés entre tous les appareils du réseau. À 1,48 Mbit/s par dalle 64×32 en flux complet permanent, la
contrainte n'est pas le débit d'une dalle mais **leur cumul** et la contention avec le reste du réseau.

C'est le coût assumé de [ADR-0001](adr/0001-streaming-de-frames.md), et la raison d'être du mode différentiel.

## Budget temps par frame — budget

À 30 FPS, une frame dispose de **33,3 ms**. Répartition **cible**, non mesurée :

| Étape | Budget |
|-------|--------|
| Calcul de la frame (renderer) | 10 ms |
| Diff et sérialisation (renderer) | 3 ms |
| Réseau | 5 ms |
| Réception et parsing (device) | 5 ms |
| Écriture dans le tampon (device) | 5 ms |
| **Total** | **28 ms** — marge 5 ms |

Ces valeurs servent à décider où regarder quand la cadence décroche, pas à affirmer que la cadence tient.

## Architecture temps réel du firmware — budget

C'est l'élément qui rend 30 FPS crédible côté device, et il ne relève pas du protocole mais de l'ordonnancement.

Le rafraîchissement d'une dalle HUB75 n'est pas un événement : c'est une **charge de fond permanente**. Protomatter
recompose l'image en permanence par modulation temporelle — la profondeur de couleur se paie en temps de
rafraîchissement, et le firmware V1 tournait à `bitDepth = 6`. Cette charge coexiste avec la pile WiFi et le
parsing du protocole.

Répartition **cible** sur les deux cœurs de l'ESP32-S3 :

| Cœur | Tâche | Priorité |
|------|-------|----------|
| 0 | Rafraîchissement physique de la dalle, exclusivement | 24 |
| 1 | Pile WiFi, réception WebSocket, parsing, écriture du tampon | normale |

Isoler le rafraîchissement sur son propre cœur, à haute priorité, évite qu'une rafale réseau ne provoque un
scintillement visible.

### Réglages associés

| Réglage | Effet attendu |
|---------|---------------|
| `WIFI_PS_NONE` | Désactive la mise en veille WiFi. Élimine un jitter de plusieurs dizaines de ms |
| `TCP_NODELAY` | Désactive l'algorithme de Nagle. Évite qu'une frame attende un remplissage de segment |
| Double tampon | Évite le déchirement entre écriture et rafraîchissement |

La mémoire disponible est une contrainte réelle : le Matrix Portal S3 dispose de **2 Mo de PSRAM**, pas
davantage ([HARDWARE.md](HARDWARE.md)). Une frame 64×32 en RGB888 occupe 6 Ko, deux tampons 12 Ko — confortable.
Une dalle 256×256 occuperait 192 Ko par tampon, ce qui reste tenable mais change d'ordre de grandeur.

## Méthode de mesure

Rien de ce qui précède ne remplace une mesure. Ce qu'il faut relever, et comment :

### Côté device

`STATUS_UPDATE` transporte déjà l'essentiel ([PROTOCOL-DEVICE.md](PROTOCOL-DEVICE.md#0x05--status_update)) :
`fps`, `frames_applied`, `last_applied_sequence`, `free_heap`, `free_psram`, `wifi_rssi`.

**Latence de bout en bout** : différence entre la séquence émise par le renderer et le `last_applied_sequence`
remonté, multipliée par la période de frame. C'est la mesure la plus utile du système, et elle ne coûte rien —
elle tombe du protocole existant.

### Côté renderer

| Métrique | Ce qu'elle révèle |
|----------|-------------------|
| Temps de calcul par frame | Si le renderer tient la cadence |
| Ratio FULL / DELTA | L'efficacité réelle du mode différentiel sur du contenu réel |
| Frames abandonnées pour backpressure | Un device qui ne suit pas — voir [PROTOCOL-DEVICE.md](PROTOCOL-DEVICE.md#backpressure) |
| Octets émis par device | La bande passante réelle, à comparer au calculé ci-dessus |

Le compteur de frames abandonnées est le signal le plus important : sur TCP il n'y a pas de perte, donc c'est
**le seul indicateur de saturation** du chemin de données.

### Ce qui n'est pas mesurable sur le matériel de référence

- **Tension d'alimentation** — aucun capteur.
- **Température CPU** — le capteur interne de l'ESP32-S3 n'est pas assez fiable pour piloter une décision.
- **Perte de paquets** — sans objet sur TCP.

Ces trois métriques figuraient dans les versions antérieures du protocole. Elles ont été retirées plutôt que
remplies avec des valeurs fabriquées.

## À remplir

Ce tableau reste vide tant qu'aucune mesure n'a été faite. C'est volontaire.

| Date | Matériel | Géométrie | FPS mesurées | Latence | Ratio DELTA | Méthode |
|------|----------|-----------|--------------|---------|-------------|---------|
| — | — | — | — | — | — | — |
