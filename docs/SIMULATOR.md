# Simulateur

> Décision liée : [ADR-0011](adr/0011-auth-premier-message.md).
> Protocole implémenté : [PROTOCOL-DEVICE.md](PROTOCOL-DEVICE.md).

Une page web de debug qui **remplace le matériel** : elle parle le protocole device au renderer et peint les
frames reçues sur un canvas.

## Ce que c'est, et ce que ce n'est pas

Le simulateur est un **device**. Il se trouve du côté client du protocole, exactement comme un Matrix Portal S3 :
il s'authentifie avec un token, reçoit des frames, les affiche.

Ce n'est **pas** une prévisualisation. Une prévisualisation afficherait ce que le renderer *va* produire en
réutilisant sa logique de rendu. Le simulateur affiche ce que le renderer *a réellement envoyé*, sans partager
une ligne de code avec lui.

Cette distinction n'est pas académique : elle est ce qui fait du simulateur un instrument de vérification. Un
composant qui partagerait le code du renderer validerait surtout sa propre cohérence.

## Pourquoi il compte

**C'est l'implémentation de référence du protocole device.** Un protocole binaire dont il n'existe qu'une seule
implémentation ne se vérifie pas : on ne distingue pas la spécification de ce que le code fait. Deux
implémentations indépendantes, dont une lisible en quelques minutes, transforment la spécification en quelque
chose d'exécutable.

Conséquences pratiques :

- développer le renderer et le dashboard **sans matériel** ;
- reproduire un comportement sans mobiliser une dalle ;
- vérifier qu'un changement de protocole est réellement implémentable ailleurs que dans le firmware.

À traiter comme un livrable, pas comme un utilitaire jetable.

## La contrainte qu'il impose au protocole

**L'API WebSocket des navigateurs ne permet pas de définir d'en-tête HTTP personnalisé.**

Le firmware V1 s'authentifiait pourtant ainsi (`client.addHeader("token", …)`), et c'est la solution naturelle
côté matériel. Maintenir cette voie aurait imposé un second chemin d'authentification pour le navigateur — donc
un simulateur qui ne parle plus tout à fait le même protocole, donc un instrument de vérification qui ne vérifie
plus la bonne chose.

D'où l'authentification par premier message binaire, identique pour les deux
([ADR-0011](adr/0011-auth-premier-message.md)).

C'est un bon exemple de contrainte qu'il valait mieux découvrir en concevant qu'en implémentant : la corriger
après coup aurait signifié reflasher tout matériel déjà déployé.

**Règle de conception** : rien dans le protocole device ne doit dépendre d'une capacité qu'un navigateur n'a
pas. Cette règle fait partie de la relecture de conformité de
[PROTOCOL-DEVICE.md](PROTOCOL-DEVICE.md#conformité).

## Place dans le modèle

Un simulateur est un `Device` du registre comme un autre : token, géométrie, renderer assigné. Le drapeau
`isSimulator` sert uniquement à le distinguer dans l'interface.

**Aucun cas particulier côté renderer.** Il n'a pas à savoir s'il parle à du silicium ou à un onglet — c'est
d'ailleurs la condition pour que le simulateur teste quelque chose d'utile.

## Interaction avec la règle de connexion unique

Simulateur et matériel peuvent revendiquer le même device. La règle **une seule connexion active par device**
([PROTOCOL-DEVICE.md](PROTOCOL-DEVICE.md#une-seule-connexion-active-par-device)) devient donc immédiatement
observable : ouvrir le simulateur sur un device allumé coupe la dalle, et inversement.

Ce n'est pas un effet de bord regrettable, c'est le comportement voulu, et le simulateur le rend visible au lieu
de le laisser dormir jusqu'au jour où un ESP32 se reconnecte après une coupure WiFi.

Pour observer un device sans le déranger, il faut créer un second device dédié.

## Attendus fonctionnels

- Saisie ou sélection d'un device et de son token.
- Connexion, affichage de la phase de handshake et des erreurs reçues.
- Rendu des frames sur un canvas, avec zoom — un pixel de dalle occupe plusieurs pixels d'écran.
- Affichage des compteurs : FPS reçues, dernière séquence, part de `FULL` et de `DELTA`, octets reçus.
- Émission de `STATUS_UPDATE` avec des valeurs plausibles, pour exercer le chemin de télémétrie de bout en bout.
- Journal des messages, décodés type par type.

Un simulateur qui n'émettrait pas de `STATUS_UPDATE` laisserait toute la remontée d'état non testée — c'est-à-
dire précisément la partie que le matériel rend pénible à observer.

## Où il vit

Une page du dashboard Nuxt, derrière l'authentification utilisateur. Elle récupère l'adresse du renderer par le
même mécanisme de bootstrap que le matériel, ce qui exerce aussi ce chemin
([ADR-0009](adr/0009-bootstrap-par-redirection.md)).

## Ce qu'il peut atteindre

Le simulateur est soumis aux règles du navigateur, que le firmware ne connaît pas : une page servie en HTTPS ne
peut ouvrir ni un `ws://`, ni un `wss://` dont le certificat n'est pas reconnu.

Il ne propose donc que les `renderer_urls` compatibles avec **l'origine de la page qui le sert**
([ADR-0016](adr/0016-transports-declares-par-le-renderer.md)) :

| Le simulateur est servi depuis | Il peut atteindre |
|--------------------------------|-------------------|
| `http://localhost:3000` — développement | tout : `ws://` comme `wss://`, y compris un renderer auto-hébergé sur le réseau local |
| Le dashboard hébergé, en HTTPS | uniquement les renderers déclarant `wss://` avec un certificat reconnu — en pratique celui de la plateforme |

Le cas qui justifie le simulateur — développer le renderer et le dashboard sans matériel — tombe dans la
première ligne. La contrainte ne mord que sur le dashboard hébergé.

Quand aucune URL n'est utilisable, le simulateur doit le **dire** plutôt que d'échouer à la connexion : Adonis ne
peut pas vérifier ce qu'un renderer déclare, donc un `wss://` annoncé peut très bien présenter un certificat que
le navigateur refuse. Nommer la cause probable vaut mieux qu'une socket qui se ferme sans explication.
