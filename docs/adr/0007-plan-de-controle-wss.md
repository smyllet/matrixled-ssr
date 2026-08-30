# ADR-0007 — Plan de contrôle en WSS sortant, JSON versionné

**Statut** : Accepté — 2026-08-30

## Contexte

Adonis doit transmettre au renderer la configuration, le registre des devices et les scènes ; le renderer doit
remonter l'état des devices. Il faut un canal entre les deux.

**Le facteur décisif est un besoin produit** : la plateforme fournit un renderer par défaut mutualisé, et doit
permettre à terme aux utilisateurs d'héberger leur propre renderer privé. Cela introduit deux contraintes
absentes des premières versions de la spec :

1. Une **frontière de confiance** — un renderer tiers n'est pas un composant interne.
2. Une **contrainte NAT** — un renderer chez un utilisateur ne peut recevoir aucune connexion entrante.

## Décision

**Le renderer compose vers Adonis** en WSS, s'authentifie avec un token de renderer, et maintient la connexion
ouverte. Les messages sont du JSON dans une enveloppe versionnée `{v, type, payload}`.

Le JSON est acceptable ici : ce canal est à faible fréquence. La contrainte binaire de
[ADR-0003](0003-websocket-binaire-tcp.md) ne vaut que pour le chemin device.

## Alternatives écartées

**Redis en Pub/Sub**, qui était l'architecture d'un prototype antérieur et fonctionnait bien. Écarté à cause de
la frontière de confiance : Redis n'offre pas d'autorisation par locataire — qui accède au serveur accède à tout
l'espace de clés, donc aux configurations et credentials de tous les utilisateurs. S'y ajoute la contrainte NAT,
et le fait que le Pub/Sub est une diffusion dont l'isolation ne tiendrait qu'à une convention de nommage.

Redis reste parfaitement légitime **à l'intérieur** du renderer par défaut, comme cache et état local. Il passe
du rang de décision d'architecture à celui de détail d'implémentation d'un composant.

**gRPC en flux bidirectionnel.** Contrat typé et généré des deux côtés. Écarté parce qu'exposer un serveur gRPC
depuis Adonis est inhabituel, que HTTP/2 avec négociation ALPN traverse mal certains proxys d'entreprise — ce
qui pénalise justement l'auto-hébergement — et que cela imposerait la chaîne d'outils protobuf à tout tiers
voulant écrire son propre renderer.

**Interrogation HTTP périodique et webhooks.** Trivial à implémenter. Écarté pour la latence de propagation des
changements et l'absence de détection fine d'un renderer mort.

## Conséquences

- **Aucune connexion entrante vers un renderer, jamais.** Cette hypothèse doit tenir dans tous les documents.
- Le contrat n'étant plus garanti par un compilateur, l'enveloppe doit être **explicitement versionnée** et le
  catalogue d'événements documenté — voir [PROTOCOL-CONTROL.md](../PROTOCOL-CONTROL.md).
- La resynchronisation, que Redis offrait gratuitement, doit être spécifiée : à la reconnexion, le renderer
  annonce sa version d'état et Adonis répond par un delta ou par le registre complet.
- Le renderer annonce ses **capacités** à la connexion ; Adonis refuse d'assigner une scène qui les dépasse.
- Un renderer tiers est une **entrée non fiable** : il ne peut pas revendiquer un device qui ne lui est pas
  assigné, et tout état qu'il remonte doit être validé et borné côté Adonis.
