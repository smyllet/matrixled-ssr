# ADR-0022 — Notifications du dashboard en SSE, émises par un bus d'événements de domaine

**Statut** : Accepté — 2026-09-02

## Contexte

Le dashboard se rafraîchissait par des **hooks Nuxt locaux à l'onglet** : un panneau de création appelait
`callHook('app:scene:created')`, la page liste l'écoutait et relisait. Ce bus ne franchit ni l'onglet, ni le
client, ni le serveur — deux onglets ouverts divergent, et **rien de ce qui change côté serveur ne peut
atteindre l'interface**. Un des neuf hooks déclarés était même écouté sans être jamais émis : le mécanisme avait
déjà une branche morte.

Le besoin d'un push serveur → navigateur est par ailleurs **déjà inscrit dans le backlog sans transport** :
l'issue #47 exige des mises à jour de statut sans rechargement manuel, #57 veut faire remonter le battement
d'un device, #45 et #46 veulent afficher un refus d'assignation avec sa cause. Aucun de ces besoins n'avait de
chemin vers le navigateur : [ARCHITECTURE.md](../ARCHITECTURE.md) ne décrivait que trois protocoles, tous en
aval d'Adonis.

## Décision

**Adonis pousse des notifications vers le navigateur en SSE**, dans une enveloppe JSON versionnée
`{v, type, payload}`, et ce canal **remplace** les hooks Nuxt plutôt que de s'empiler à côté d'eux. Il est
spécifié par [PROTOCOL-DASHBOARD.md](../PROTOCOL-DASHBOARD.md).

Deux choix le structurent.

**Les services émettent des événements de domaine, pas des diffusions.** Chaque mutation réussie publie un
événement (`scene.updated`, `renderer.deleted`, …) sur le bus applicatif. Un **listener** — et un seul
aujourd'hui — traduit ces événements en messages SSE. Les événements ignorent le SSE : ils portent un nom
neutre, connaissent leur propriétaire et leur identifiant, rien de plus.

**Deux canaux, pas un.** `users/<id>` porte ce qui appartient à un utilisateur ; `platform` porte ce qui
appartient à la plateforme et que tous les utilisateurs voient. Le second découle du modèle de visibilité : un
renderer sans propriétaire figure dans la liste de tout le monde, donc une notification le concernant n'a pas de
destinataire unique. Les services émettent toujours ; **c'est le listener qui arbitre le destinataire**.

La charge utile se réduit à l'identifiant de ce qui a changé, le client relisant par l'API REST.

## Alternatives écartées

**Garder les hooks Nuxt.** Zéro nouveau composant, et ils fonctionnaient. Écartés parce qu'ils ne répondent pas
à la question posée : un bus local à l'onglet ne peut pas transporter un changement venu du serveur, et c'est
exactement ce dont #47, #57, #45 et #46 ont besoin. Les garder **en plus** du SSE aurait laissé deux chemins de
rafraîchissement à comprendre et à maintenir cohérents, pour un seul résultat visible.

**Injecter un service de diffusion dans les trois services métier.** C'était la forme initialement prévue, et
la plus courte : un `BroadcastService` injecté, appelé après chaque mutation. Écartée parce qu'elle **soude le
transport au domaine** — chaque futur consommateur (journal d'audit, webhooks, le `device.status` de #47)
imposerait de rouvrir les trois services pour y ajouter un appel, et chacun de ces appels devrait redécouvrir la
condition sous laquelle la mutation a réellement eu lieu. Avec un bus, les services annoncent ce qu'ils ont fait
une fois pour toutes, et un consommateur s'attache sans les toucher. Le coût assumé est un indirection de plus
entre la mutation et la diffusion, et un bus dont les défaillances doivent être rattrapées explicitement — un
listener qui échoue ne doit pas faire échouer la mutation qui l'a déclenché, ni tuer le process.

**Interrogation périodique (polling).** Trivial. Écartée pour les mêmes raisons qu'en
[ADR-0007](0007-plan-de-controle-wss.md) : latence de propagation et requêtes gaspillées — ici multipliées par
le nombre d'onglets ouverts, pour des données qui ne changent presque jamais.

**Réutiliser un WebSocket, comme le canal renderer.** Un seul mécanisme de temps réel dans le projet aurait été
séduisant. Écarté parce que les contraintes qui ont produit [ADR-0007](0007-plan-de-controle-wss.md) — le NAT
et la frontière de confiance d'un renderer tiers — **sont absentes du navigateur** : il compose toujours, et il
est déjà authentifié par une session. Ne restait qu'un trafic strictement descendant, pour lequel `EventSource`
reconnecte nativement là où un WebSocket demande d'écrire soi-même le retrait exponentiel.

**Pousser la ressource complète plutôt que son identifiant.** Aurait évité l'aller-retour REST. Écarté parce que
les transformers ont besoin d'un `HttpContext` que la diffusion n'a pas : reconstruire l'objet à la main
créerait un **second contrat de sérialisation**, qui divergerait des transformers au premier champ ajouté et
pourrait exposer sur ce canal des champs que l'API filtre.

**Un transport partagé (Redis) dès maintenant.** Il n'y a aucune seconde instance à servir, aucun Redis dans la
composition, et [ADR-0010](0010-postgresql-partout.md) assume « PostgreSQL partout ». L'ajouter par anticipation
aurait introduit une dépendance opérationnelle pour un problème que personne n'a.

## Conséquences

- **Le SSE est le seul chemin de rafraîchissement du dashboard.** Sa perte définitive — le client abandonne
  après cinq reconnexions — fige l'interface sur les actions de l'utilisateur lui-même. D'où un bandeau
  invitant à recharger : une péremption silencieuse est pire qu'un échec visible.
- **Mono-instance.** Sans transport partagé, une diffusion n'atteint que les clients du même process. Derrière
  un répartiteur de charge, une partie des clients ne recevrait rien, **silencieusement**. C'est acceptable tant
  que le déploiement est mono-process ; passer à plusieurs impose de choisir un transport avant de répartir.
- **Le contrat n'étant garanti par aucun compilateur**, l'enveloppe est versionnée et le catalogue documenté —
  voir [PROTOCOL-DASHBOARD.md](../PROTOCOL-DASHBOARD.md). La règle sur `v` est celle du plan de contrôle :
  version inconnue ignorée et journalisée.
- **Une quatrième flèche dans l'architecture.** [ARCHITECTURE.md](../ARCHITECTURE.md) décrivait trois
  protocoles, tous en aval d'Adonis ; celui-ci est le premier qui remonte vers le navigateur.
- **Le bus d'événements est un point d'extension, pas une abstraction gratuite.** Le prochain consommateur
  s'y attache sans rouvrir les services — c'est ce qui rendra `device.status` (#26 → #28 → #47) additif.
- **Un canal séparé pour la télémétrie périodique reste ouvert.** Les événements de CRUD sont rares ; un flux
  de statut à cadence régulière n'a pas les mêmes propriétés et pourra justifier son propre canal.
- **En production**, la compression doit être désactivée sur `__transmit/events`. La mise en tampon, elle, est
  déjà couverte par l'en-tête `X-Accel-Buffering: no` que la réponse porte.
