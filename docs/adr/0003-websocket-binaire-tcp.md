# ADR-0003 — WebSocket binaire sur TCP pour le chemin device

**Statut** : Accepté — 2026-08-30

## Contexte

Il faut acheminer ~30 frames/seconde du renderer vers chaque device. Une frame complète en 64×32 pèse
6 153 octets, soit largement plus que la MTU Ethernet de 1 500 octets.

## Décision

**WebSocket en mode binaire, sur TCP.** Une connexion persistante par device, ouverte par le device.

## Alternatives écartées

**UDP unicast.** Latence brute minimale et pas de blocage de tête de ligne. Écarté parce qu'il aurait fallu
spécifier soi-même la fragmentation (une frame dépasse la MTU), l'authentification par datagramme et la
détection de perte — beaucoup de protocole à écrire et à déboguer pour un gain de latence marginal sur un LAN.

**UDP multicast**, que proposait une version antérieure de la documentation. Écarté sans réserve : chaque device
affiche un contenu différent, le multicast n'a donc aucun sens ici, et il aggrave le problème de fragmentation.

## Conséquences

Ce sont les conséquences les plus structurantes de tout le jeu de décisions, parce qu'elles **suppriment** des
mécanismes que les versions antérieures de la spec décrivaient longuement :

- **TCP garantit la livraison et l'ordre : il n'y a pas de perte de frame.** L'accusé de réception par frame, la
  détection de trous dans les numéros de séquence, le seuil de frames perdues et la resynchronisation par frame
  complète sont donc sans objet. Ils ont été retirés du protocole.
- Les messages `PING`/`PONG` applicatifs sont eux aussi retirés : WebSocket fournit nativement un mécanisme de
  ping/pong, et le redoubler au niveau applicatif n'apporte rien.
- **Le risque bascule de la perte vers le backpressure.** Si un device ne consomme pas assez vite, le tampon
  d'émission TCP se remplit et la latence s'envole. Le protocole spécifie donc une sémantique
  « la dernière frame gagne » : le renderer jette au lieu d'empiler.
- Une frame tient dans un seul message WebSocket, sans fragmentation à gérer côté firmware.
- Un blocage de tête de ligne reste possible si le WiFi décroche : il se traduit par un gel de l'affichage, pas
  par une image corrompue.
