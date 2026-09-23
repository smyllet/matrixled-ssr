# ADR-0024 — Canal de contrôle : `ws` sur le serveur HTTP d'Adonis, une connexion par renderer

**Statut** : Accepté — 2026-09-23

## Contexte

[ADR-0007](0007-plan-de-controle-wss.md) a fixé la forme du plan de contrôle : un WebSocket que le renderer
ouvre **vers** Adonis et garde ouvert. Restait à décider comment Adonis le sert. Le framework n'a pas de
WebSocket intégré : son routeur ne voit que des requêtes HTTP, et `@adonisjs/transmit`, déjà utilisé pour le
dashboard ([ADR-0022](0022-notifications-dashboard-par-sse.md)), est du SSE, donc descendant uniquement.

Deux autres questions viennent avec la connexion elle-même : que faire quand un renderer en ouvre une seconde,
et où tenir le fait qu'il est en ligne.

## Décision

**Le canal est un upgrade WebSocket sur le serveur Node qu'Adonis écoute déjà**, servi par la bibliothèque
`ws`. Adonis laisse fournir la fabrique du serveur HTTP : `bin/server.ts` et `tests/bootstrap.ts` le créent par
`createServerWithRendererControl`. Seul un upgrade sur `/api/v1/renderer/control` est détourné (option
`shouldUpgradeCallback` de Node) ; toute autre requête, même porteuse d'un en-tête `Upgrade`, atteint le routeur
comme une requête HTTP ordinaire. Le chemin de contrôle n'est donc pas une route Adonis. L'authentification
réutilise la vérification du guard renderer, et **un refus est une réponse HTTP `401` au handshake**, avant tout
`101`. Une connexion acceptée est revérifiée une fois enregistrée : un token révoqué pendant que le handshake le
hachait ne lui survit pas.

**Une connexion par renderer, et la plus récente gagne.** Une seconde connexion ferme la première avec le code
`4001`. C'est le cas d'un renderer qui redémarre avant que sa connexion précédente, morte côté réseau, ne soit
détectée : la refuser le laisserait dehors jusqu'au heartbeat suivant.

**La présence est tenue en base** (`renderers.status`, `lastSeenAt`), et les connexions elles-mêmes sont en
mémoire. `lastSeenAt` est écrit à l'ouverture de la connexion, **à chaque pong** répondu au heartbeat, et à la
fermeture. Chaque écriture émet `renderer.updated`, pour que la dernière activité affichée par le dashboard
reste à jour en direct.

Le coût est assumé : une écriture en base par renderer connecté toutes les 30 s. Chaque dashboard qui voit
ce renderer recharge aussi sa liste de renderers — tous les dashboards dans le cas du renderer plateforme. À
revoir si le nombre de renderers connectés rend ce trafic sensible, par exemple en espaçant les écritures ou en
cessant de les notifier. Au démarrage, tout renderer resté `online` est
remis `offline` : un process qui démarre ne tient aucune connexion.

Ce reset repose sur une hypothèse qu'il faut nommer : **une seule instance d'Adonis**. Une seconde instance
remettrait hors ligne les renderers que la première sert, et aucune des deux ne pourrait joindre les
connexions de l'autre pour révoquer. Passer à plusieurs instances imposera un registre partagé des
connexions, qui sera une décision à part entière.

## Alternatives écartées

**Un port dédié au plan de contrôle.** Il aurait isolé le trafic, mais coûte une règle de proxy, un certificat
et une ouverture de pare-feu de plus pour chaque déploiement, sans rien apporter : le trafic de contrôle est
faible et événementiel.

**Socket.IO.** C'est la solution la plus répandue dans l'écosystème Node, mais elle impose son propre
protocole au-dessus du WebSocket. Le client est en Go ([ADR-0002](0002-renderer-en-go.md)) : il faudrait une
bibliothèque tierce pour parler un protocole dont on n'utilise aucune fonctionnalité (salles, acquittements,
repli en long polling).

**Transmit.** Déjà en place, mais c'est du SSE : le renderer doit aussi émettre (`renderer.hello`,
`device.status`), ce qu'un flux descendant ne permet pas.

**Refuser la seconde connexion.** C'est plus simple à raisonner, puisque la connexion en place n'est jamais
interrompue. Mais le cas qui produit une seconde connexion est précisément un renderer redémarré, dont la
connexion en place est déjà morte.

**N'écrire `lastSeenAt` qu'à l'ouverture et à la fermeture.** C'est une écriture de moins toutes les 30 s par
renderer, avec l'argument qu'un renderer `online` est par définition vu maintenant. Écarté parce que la colonne
doit dire **quand le renderer a répondu pour la dernière fois**. Une date figée à l'ouverture d'une connexion
vieille de plusieurs jours ne répond pas à cette question.

**Mettre à jour `lastSeenAt` sans notifier le dashboard.** Cela supprimerait les rechargements de liste, mais
la date affichée ne suivrait plus qu'aux rechargements de page, et une colonne qui prétend dire « vu il y a
30 s » afficherait une date arbitrairement ancienne.

## Conséquences

- L'endpoint est introuvable depuis `start/routes.ts`, et c'est voulu. [CLAUDE.md](../../CLAUDE.md) et le
  module de contrôle renvoient l'un vers l'autre pour qu'on le retrouve.
- La rotation du token d'un renderer ou sa suppression ferme sa connexion ouverte (code `4003`). Sans cela,
  une connexion ouverte avec un token fuité survivrait à la rotation censée la neutraliser.
- Le déploiement reste mono-instance tant qu'un registre partagé n'existe pas.
- L'arrêt a un ordre imposé. `server.close()` de Node attend aussi les sockets upgradés, et un renderer sain
  ne ferme jamais le sien : les connexions de contrôle sont fermées (`1001`), et leur passage `offline` écrit,
  **avant** la fermeture du serveur HTTP. `bin/server.ts` enregistre cette fermeture depuis `app.ready`, pour
  qu'elle s'exécute avant le hook d'arrêt d'Adonis.
