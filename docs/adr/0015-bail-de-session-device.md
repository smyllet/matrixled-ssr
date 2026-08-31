# ADR-0015 — Bail de session device, borné par l'absence de contact

**Statut** : Accepté — 2026-08-31

## Contexte

[ADR-0008](0008-renderer-autonome.md) rend le renderer autonome sur son cache et accepte en contrepartie que la
révocation ne soit pas instantanée. [PROTOCOL-CONTROL.md](../PROTOCOL-CONTROL.md) bornait cette fenêtre par trois
mécanismes, dont une durée de validité des entrées en cache.

**Cette borne ne fonctionnait pas.** Telle qu'elle était spécifiée, l'expiration refusait les nouvelles
connexions du device concerné « mais ne coupait pas celles déjà établies ». Or
[ADR-0001](0001-streaming-de-frames.md) fait du lien renderer → device une connexion **permanente** : un device
connecté reçoit ses frames en continu et ne se réauthentifie jamais. L'expiration ne s'appliquait donc qu'aux
reconnexions, c'est-à-dire à tout sauf à une dalle allumée — la seule population qu'il s'agissait de borner.

Le cas qui le rend visible n'est pas le vol franc mais le **token fuité** chez quelqu'un qui garde l'accès au
réseau : dalle prêtée, colocataire, ancien employé. La règle « une seule connexion active par device »
([PROTOCOL-DEVICE.md](../PROTOCOL-DEVICE.md)) lui permet d'évincer la dalle légitime et de prendre sa place. Sur
un renderer coupé de la plateforme, il y restait indéfiniment : la révocation ne peut pas arriver, et
l'expiration ne coupait rien.

## Décision

**Le droit d'un device à recevoir des frames est un bail, et ce bail expire par absence de contact avec la
plateforme** — pas par réception d'une révocation.

- `devices.offlineGrace` : durée pendant laquelle le renderer peut servir ce device sans confirmation de la
  plateforme. Défaut **7 jours**, `null` = illimité.
- Le renderer horodate son **dernier contact de contrôle réussi**. Tout device dont l'`offlineGrace` est dépassé
  depuis cet horodatage voit sa connexion fermée avec `ERROR 0x09`. Une seule horloge, un seuil par device.
- L'entrée n'est pas purgée mais **marquée expirée** : les reconnexions sont refusées avec `0x09` et non `0x04`,
  ce qui distingue « ton token est invalide » de « le renderer a perdu la plateforme ». La différence compte le
  jour où il faut diagnostiquer une dalle noire.
- Un contact réussi avec Adonis réarme tous les baux.

Le renversement est là : **le déclencheur devient l'absence de contact.** Un message de révocation ne peut par
définition pas traverser un canal coupé ; seule l'absence de nouvelles est observable des deux côtés.

## Alternatives écartées

**Un bail sur le renderer entier**, comme envisagé dans [ADR-0008](0008-renderer-autonome.md). Un seul délai, un
seul compteur, plus simple à spécifier. Écarté parce qu'il éteint tout en bloc : la panne couperait l'horloge du
salon en même temps que l'écran sensible. Le curseur entre révocation rapide et autonomie longue n'est pas le
même pour toutes les dalles, et le régler par device est précisément ce qui permet de garder
[ADR-0008](0008-renderer-autonome.md) intact là où il compte.

**Faire réauthentifier le device périodiquement.** L'expiration s'appliquerait alors naturellement, sans rien
changer au modèle. Écarté parce qu'il faudrait soit couper le flux à chaque cycle, soit spécifier un handshake
en cours de session — et parce que ça déplace le coût sur le firmware alors que le renderer dispose déjà de
toute l'information nécessaire pour décider seul.

**Déléguer la validation à Adonis** à chaque connexion : déjà écarté par [ADR-0008](0008-renderer-autonome.md),
pour la raison inchangée qu'une panne de la plateforme éteindrait toutes les dalles.

## Conséquences

- La fenêtre d'exposition devient **finie et réglable par dalle**, au lieu d'être infinie. C'est le curseur que
  l'utilisateur règle : court sur un écran qui affiche des données sensibles, `null` sur l'horloge du salon.
- **[SELF-HOSTING.md](../SELF-HOSTING.md) change de promesse.** « Ne jamais éteindre ses dalles parce que la
  plateforme ne répond plus » devient « jamais du seul fait d'une panne, mais oui quand un bail expire ». Le
  défaut de 7 jours fait qu'aucune panne réaliste n'éteint quoi que ce soit.
- **Portée à ne pas surestimer.** Ce mécanisme protège contre la panne, l'accident et le token fuité. Il ne
  protège pas contre un opérateur de renderer hostile — il a la machine et peut patcher le binaire. Et il n'a
  pas à couvrir le vol franc, déjà traité par la topologie : une dalle volée et emportée ne joint plus un
  renderer auto-hébergé, qui est derrière NAT et ne sert que son réseau local
  ([ADR-0007](0007-plan-de-controle-wss.md)) ; et le renderer de la plateforme étant colocalisé avec Adonis,
  `device.revoked` y parvient sans délai notable.
- Le firmware doit traiter `0x09` autrement qu'un refus d'authentification : il s'agit d'un état transitoire,
  qui se résout quand le renderer retrouve la plateforme. Retrait exponentiel, pas d'abandon définitif.
- Un `offlineGrace` à `null` restaure exactement le comportement antérieur, pour les dalles où l'autonomie prime
  sur la révocation.
- **Piste non traitée.** La règle `ERROR 0x08` rend un vol de token bruyant : l'imposteur et la dalle légitime
  s'évincent mutuellement en boucle, et Adonis voit le `device.status` battre. C'est un signal de détection
  gratuit, en amont de la révocation — il dit *quand* révoquer. Rien ne l'exploite aujourd'hui.
