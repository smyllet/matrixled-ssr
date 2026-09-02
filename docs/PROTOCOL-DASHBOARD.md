# Protocole de notification du dashboard

> **Version de l'enveloppe** : 1
> Décisions : [ADR-0022](adr/0022-notifications-dashboard-par-sse.md) (SSE, bus d'événements de domaine,
> charge utile minimale).

Ce document spécifie le canal **Adonis → navigateur** : les notifications qui disent au dashboard que quelque
chose a changé, pour qu'il le relise.

Ce **n'est pas le plan de contrôle**, qui désigne strictement le canal renderer ↔ Adonis
([PROTOCOL-CONTROL.md](PROTOCOL-CONTROL.md)) — malgré une enveloppe de même forme, volontairement calquée sur
la sienne. Les deux canaux n'ont ni les mêmes participants, ni les mêmes garanties : celui-ci ne porte aucune
configuration, ne demande aucun accusé de réception et ne survit à rien.

## Forme du canal

**Le navigateur ouvre un flux SSE** vers Adonis et le laisse ouvert. Le trafic est **strictement descendant** :
tout ce que le dashboard veut dire au serveur passe par l'API REST habituelle.

```
Navigateur ──── GET __transmit/events ────▶ Adonis   (text/event-stream, session)
           ◀──────────────────────────────  notifications de changement
           ──── GET /api/… ───────────────▶ Adonis   (relecture de la ressource)
```

Trois routes sont enregistrées à la racine par `@adonisjs/transmit`, hors du préfixe `/api` :
`GET __transmit/events` ouvre le flux, `POST __transmit/subscribe` et `POST __transmit/unsubscribe` gèrent les
abonnements. **Les trois sont protégées par le garde de session** : sans authentification sur
`__transmit/events`, n'importe qui ouvre un flux.

L'authentification n'est pas configurable depuis `config/transmit.ts` — le fournisseur n'enregistre pas ses
routes tout seul. C'est l'appel `transmit.registerRoutes()` du preload `start/transmit.ts` qui leur applique le
middleware d'authentification.

Un ping est émis toutes les **20 secondes**, sous les délais d'inactivité usuels des intermédiaires.

## Enveloppe

Tout message est un objet JSON de cette forme :

```jsonc
{
  "v": 1,                   // version de l'enveloppe
  "type": "scene.updated",  // nom de l'événement
  "payload": { "id": "…" }
}
```

Comme sur le plan de contrôle, `v` est **obligatoire** et vérifié à la réception : un message dont la version
majeure est inconnue est **ignoré et journalisé**, jamais interprété au mieux. Le client applique cette règle.

Il n'y a **pas** de champ `id` de message, contrairement au plan de contrôle. Le flux est strictement
descendant : il n'y a ni corrélation à établir, ni idempotence à garantir, puisqu'un message ne déclenche rien
d'autre qu'une relecture — et relire deux fois n'a aucun effet de bord.

## Catalogue

Neuf types, tous avec la même charge utile `{ id }` :

| Type | Émis quand |
|------|-----------|
| `matrix.created` · `matrix.updated` · `matrix.deleted` | Une entité `Matrix` du code est créée, modifiée, supprimée |
| `scene.created` · `scene.updated` · `scene.deleted` | Une scène est créée, modifiée, supprimée |
| `renderer.created` · `renderer.updated` · `renderer.deleted` | Un renderer est créé, modifié, supprimé — la rotation de son credential émet `renderer.updated` |

`matrix.*` cite l'entité du code telle qu'elle existe aujourd'hui : les specs définissent **device** et
**scene** ([GLOSSARY.md](GLOSSARY.md)), et ces types suivront le renommage de l'entité.

`.updated` n'est émis que si la mutation a réellement changé quelque chose — `SceneService.patchScene` ne
considère la scène modifiée que si le modèle est *dirty*, ce qui est aussi la condition sous laquelle il
incrémente `version`. Une requête qui n'écrit rien ne notifie rien.

**`device.status` est réservé, pas implémenté.** Il portera l'état observé d'un device, dont
[PROTOCOL-CONTROL.md](PROTOCOL-CONTROL.md#devicestatus) décrit déjà la remontée depuis le renderer. Il n'a pas
de producteur tant que cet état n'est pas observable (issues #26 → #28 → #47). C'est le premier type qui n'aura
pas d'événement de domaine CRUD derrière lui.

## Canaux

Deux canaux, servant le même flux et le même gestionnaire côté client.

| Canal | Contenu | Autorisation |
|-------|---------|--------------|
| `users/<id>` | Ce qui appartient à cet utilisateur | L'utilisateur authentifié **est** `<id>` |
| `platform` | Ce qui appartient à la plateforme, et que tous les utilisateurs voient | Toute session authentifiée ; refusé aux anonymes |

Le second n'est pas un raffinement : il découle du **modèle de visibilité**.
`RendererService.getVisibleRenderers` retourne les renderers de l'utilisateur **plus ceux sans propriétaire**,
donc le renderer plateforme figure dans la liste de tout le monde. Une notification le concernant n'a pas de
destinataire unique.

Les services émettent donc toujours, sans se demander qui écoute : **c'est le destinataire qui est arbitré à la
diffusion**. Un événement portant un propriétaire part sur son canal, un événement sans propriétaire part sur
`platform`.

Ce canal **n'a aucun producteur aujourd'hui** : `RendererPolicy` interdit `patch`, `delete` et `rotateToken`
sur un renderer sans propriétaire — il s'administre depuis la console, pas depuis le dashboard. Il existe parce
que le modèle de visibilité l'exige, et parce que `status` et `lastSeenAt`, déjà exposés par le transformer,
bougeront avec #47.

Une règle d'autorisation cassée laisserait un utilisateur s'abonner au canal d'un autre : même réduites à des
identifiants, ce sont ses données. La règle vit donc dans un module testable indépendamment de son
enregistrement — les deux peuvent casser séparément.

## Charge utile minimale

Un message ne porte **que l'identifiant** de ce qui a changé. Le client relit la ressource par l'API REST.

Ce n'est pas une économie d'octets, c'est un refus de dupliquer un contrat. `Transformer.transform()` a besoin
d'un `HttpContext` pour produire son JSON, et `transmit.broadcast()` n'en a pas ; reconstruire l'objet à la main
créerait un **second contrat de sérialisation** en parallèle des transformers, qui divergerait du premier au
premier champ ajouté — et le canal exposerait alors des champs que l'API, elle, filtre.

Le coût est un aller-retour REST sur des événements de CRUD, pas sur un flux à 30 FPS.

Une conséquence : le client n'a **rien à faire d'un `payload.id`** qu'il ne connaît pas. Il relit la liste
concernée, laquelle contient déjà l'entité créée ou ne contient plus l'entité supprimée.

## Reconnexion, et son échec

`EventSource` reconnecte nativement, et le client ré-enregistre ses abonnements de lui-même. Il n'y a **aucune
resynchronisation** à spécifier : la relecture qui suit chaque message repart de la source de vérité, donc une
coupure ne peut faire perdre que des notifications, pas de l'état.

Mais le client **abandonne définitivement** après `maxReconnectAttempts` tentatives — 5 par défaut. Le SSE
étant le **seul** chemin de rafraîchissement, l'interface cesse alors de refléter quoi que ce soit, **y compris
les actions de l'utilisateur lui-même** : il crée une scène, la requête réussit, et la liste ne bouge pas.

Une péremption silencieuse est pire qu'un échec visible. Le dashboard affiche donc un bandeau invitant à
recharger la page, seul moyen de reprendre un flux — le client ne se rétablit pas tout seul passé ce point.

Un `401` sur un abonnement signifie une session expirée, et redirige vers la page de connexion.

## Conséquences d'exploitation

**Mono-instance.** Il n'y a pas de transport partagé entre processus : une diffusion n'atteint que les clients
connectés au **même** process. Derrière un répartiteur de charge, une partie des clients ne recevrait rien, et
**silencieusement** — leur flux resterait ouvert. Voir [ADR-0022](adr/0022-notifications-dashboard-par-sse.md).

**Reverse proxy.** La réponse porte déjà `X-Accel-Buffering: no`, ce qui suffit à désactiver la mise en tampon
des proxys qui l'honorent. La **compression**, en revanche, doit être désactivée sur `__transmit/events` : un
flux sans fin compressé n'est jamais vidé, et les messages restent dans le tampon du compresseur.

**HTTP/1.1** plafonne à ~6 connexions par origine, flux SSE compris. Plusieurs onglets ouverts peuvent donc
faire attendre des requêtes REST. HTTP/2 supprime le problème.
