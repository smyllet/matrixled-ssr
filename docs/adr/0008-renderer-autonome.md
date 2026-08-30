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
- **Les empreintes de tokens device sont répliquées chez un tiers.** D'où le stockage haché, jamais en clair :
  le renderer reçoit l'empreinte et hache le token qu'on lui présente.
- **La révocation n'est pas instantanée.** Il faut spécifier un événement de révocation sur le canal de
  contrôle, une durée de validité des entrées en cache, et le comportement quand le renderer est hors ligne.
- Le renderer a besoin d'un stockage local persistant.
