# Simulateur

> Décisions liées : [ADR-0011](adr/0011-auth-premier-message.md) (authentification),
> [ADR-0020](adr/0020-simulateur-device-declare.md) (un device déclaré).
> Protocole implémenté : [PROTOCOL-DEVICE.md](PROTOCOL-DEVICE.md).

Une page web de debug qui **tient le rôle du matériel** : elle parle le protocole device au renderer et peint
les frames reçues sur un canvas.

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

Un simulateur est un `Device` du registre comme un autre : token, géométrie, renderer assigné. Il se **déclare**
comme tel — `kind = simulator`, choisi à la création — et n'emprunte l'identité d'aucune dalle
([ADR-0020](adr/0020-simulateur-device-declare.md)).

C'est ce qui sépare observer de déranger. Pour voir ce qu'affiche une dalle, on crée un device simulateur et on
lui assigne la même scène : le renderer les place dans le **même groupe de rendu**
([ADR-0017](adr/0017-rendu-mutualise.md)) et ne calcule qu'une frame pour les deux. À géométrie et `maxFps`
identiques, le simulateur reçoit donc ce que reçoit la dalle — au `sequence` près, qui appartient à chaque
connexion, et à l'arbitrage `FULL`/`DELTA` près, qui dépend de l'historique de chacune.

Ce n'est pas pour autant un miroir de la connexion de la dalle : un défaut qui ne se produit que sur *sa* socket
ne se voit pas ici.

**Aucun cas particulier côté renderer.** `kind` ne lui est même pas transmis : il n'a pas à savoir s'il parle à
du silicium ou à un onglet — c'est d'ailleurs la condition pour que le simulateur teste quelque chose d'utile.

## Interaction avec la règle de connexion unique

La règle **une seule connexion active par device**
([PROTOCOL-DEVICE.md](PROTOCOL-DEVICE.md#une-seule-connexion-active-par-device)) vaut pour le simulateur comme
pour le reste : deux onglets ouverts sur le même device simulateur se coupent l'un l'autre, le dernier arrivé
gagnant.

Elle reste donc immédiatement observable, mais sans qu'ouvrir le simulateur n'éteigne une dalle — un device
simulateur ne partage son identité avec aucun matériel. Et elle garde sa raison d'être propre : après une
coupure WiFi, l'ancienne socket reste souvent ouverte côté renderer, et sans cette règle le device serait
incapable de se reconnecter.

## Comment il obtient son token

Un token n'est affiché qu'une fois, à l'appairage, et seule son empreinte est conservée
([ADR-0012](adr/0012-format-des-tokens.md)) : le dashboard ne peut pas le redonner, il ne l'a plus. Le faire
ressaisir reviendrait à demander à l'utilisateur d'avoir archivé à la main le credential d'une page de debug
qu'il ouvre depuis une session déjà authentifiée.

Le dashboard **fait donc tourner le credential** du device simulateur à l'ouverture, et remet le secret frais à
la page ([ADR-0021](adr/0021-credential-du-simulateur-par-rotation.md)) :

1. `POST /api/v1/devices/:id/credential` — refusé si le device n'appartient pas à l'utilisateur, et refusé aussi
   si son renderer est hors ligne : le secret frais ne pourrait pas l'atteindre, et l'ancien serait détruit pour
   rien.
2. Adonis pousse `device.credential_rotated` au renderer, **puis** rend le token à la page.
3. La page enchaîne le bootstrap et le `DEVICE_HELLO` habituels, sans rien de spécifique au navigateur.

Le secret reste **en mémoire** dans l'onglet, jamais en `localStorage` : un nouveau est à un clic, le persister
n'apporterait qu'une exposition.

Deux effets à connaître. Ouvrir le simulateur **invalide l'onglet précédent** sur ce device, dont le token vient
de mourir. Et le `token_prefix` change à chaque ouverture : il n'identifie donc pas ce device dans les journaux,
c'est l'`id` qui le fait.

Si le renderer n'a pas encore appliqué la rotation quand la page se présente, le handshake échoue en
`ERROR 0x04` et le simulateur réessaie quelques fois. Dans cette fenêtre, et dans elle seule, un refus
d'authentification est transitoire par construction.

## Attendus fonctionnels

- Sélection d'un device `kind = simulator` parmi ceux de l'utilisateur. **Aucun token à saisir** : il est
  obtenu par rotation à l'ouverture.
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
