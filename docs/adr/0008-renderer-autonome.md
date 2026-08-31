# ADR-0008 — Renderer auto-hébergé autonome sur dernier état connu

**Statut** : Accepté — 2026-08-30

## Contexte

Un renderer auto-hébergé tourne sur le réseau local de l'utilisateur, à côté de ses dalles. Que doit-il faire
quand la plateforme est injoignable ?

La question n'est pas théorique : elle détermine si le renderer persiste son état localement, et donc **comment
les tokens device sont validés** — soit localement, soit en interrogeant Adonis à chaque connexion.

## Décision

**Le renderer reste autonome sur son dernier état connu.** Il persiste localement la configuration et les
empreintes des tokens device, et continue de servir ses dalles pendant une panne de la plateforme.

## Alternatives écartées

**Déléguer la validation à Adonis** à chaque ouverture de connexion device (un aller-retour à la connexion, pas
par frame). Aucun secret ne quitterait la plateforme et une révocation serait immédiate. Écarté parce qu'une
panne d'Adonis éteindrait toutes les dalles, y compris auto-hébergées — ce qui vide l'auto-hébergement de son
intérêt.

**Bail signé à durée limitée** (par exemple 24 h), renouvelé tant que la plateforme répond. Compromis
intéressant qui borne l'exposition en cas de compromission, mais ajoute une notion d'expiration, une dépendance
aux horloges et un comportement de fin de bail à spécifier. Écarté pour l'instant ; reste la piste naturelle si
le délai de révocation devient un problème.

## Conséquences

- La dalle du salon continue de fonctionner si un service distant tombe. C'est l'argument central de
  l'auto-hébergement, et il compense la fragilité introduite par [ADR-0001](0001-streaming-de-frames.md).
- **« Dernier état connu » ne dit rien des valeurs affichées.** Ce que devient une donnée externe pendant une
  panne dépend de qui va la chercher — question ouverte, instruite par
  [ADR-0014](0014-sources-de-donnees-cote-adonis.md), encore `Proposé`. Quelle qu'en soit l'issue, cet ADR-ci
  garantit qu'une dalle reste **allumée** pendant une panne, pas que ce qu'elle affiche reste **vrai**.
- **Les empreintes de tokens device sont répliquées chez un tiers.** D'où le stockage haché, jamais en clair :
  le renderer reçoit l'empreinte et hache le token qu'on lui présente.
- **La révocation n'est pas instantanée.** Il faut spécifier un événement de révocation sur le canal de
  contrôle, une durée de validité des entrées en cache, et le comportement quand le renderer est hors ligne.
- **Le renderer a besoin d'un stockage local persistant, et c'est le redémarrage qui l'impose, pas la panne.**
  Tant que le process tourne, un cache en mémoire traverse très bien une coupure. Un renderer qui redémarre
  pendant que la plateforme est injoignable, lui, revient sans rien : il ne connaît plus aucune empreinte,
  refuse donc tous ses devices ([SELF-HOSTING.md](../SELF-HOSTING.md)) et éteint précisément les dalles que cet
  ADR promet de garder allumées. Doivent survivre au redémarrage les empreintes et préfixes des devices
  assignés, le dernier état des scènes, et **l'horodatage du dernier contact de contrôle réussi** — sans ce
  dernier, redémarrer remettrait le compteur du bail à zéro et rendrait la borne de
  [ADR-0015](0015-bail-de-session-device.md) contournable.
