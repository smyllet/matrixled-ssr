# ADR-0021 — Le simulateur obtient son credential par rotation à l'ouverture

**Statut** : Accepté — 2026-08-31

## Contexte

[SIMULATOR.md](../SIMULATOR.md) attendait de l'utilisateur qu'il choisisse un device **et saisisse son token**.
Or [ADR-0012](0012-format-des-tokens.md) veut qu'un token soit affiché une seule fois, à l'appairage, et que
seule son empreinte soit conservée. Le dashboard ne peut donc pas le redonner : il ne l'a plus.

L'attendu revenait ainsi à demander à l'utilisateur d'avoir archivé à la main le credential d'une page de debug
qu'il ouvre depuis une session déjà authentifiée. En pratique il ne l'a pas, et il recrée un device à chaque
fois.

[ADR-0020](0020-simulateur-device-declare.md) rend le problème net : un device simulateur n'existe que pour être
ouvert depuis le dashboard. Un credential qu'on ne peut pas récupérer n'a alors aucun porteur.

## Décision

**Le dashboard fait tourner le credential du device simulateur au moment où l'utilisateur ouvre le simulateur**,
et remet le secret frais à la page.

```http
POST /api/v1/devices/:id/credential      → { "token": "mxd_71ce04ba82df_4d2f…" }
```

- La rotation vaut pour **tout** device : c'est la réponse à une fuite, que
  [ADR-0012](0012-format-des-tokens.md) nommait déjà sans qu'aucune route ne l'offre. Elle n'est **automatique
  et sans confirmation que pour `kind = simulator`**, parce que personne d'autre ne détient ce credential. Sur un
  device `hardware`, la même rotation est une action explicite et avertie : la dalle s'éteint jusqu'à
  reprovisionnement.
- **La règle « affiché une seule fois » n'est pas assouplie.** Chaque token reste montré une fois, à sa
  création. On ne relit pas un secret, on en crée un.
- Le secret vit **en mémoire dans la page**, jamais en `localStorage` : un nouveau est à un clic, le persister
  n'apporte rien qu'une exposition.
- Un événement de plan de contrôle, `device.credential_rotated`, porte le nouveau couple préfixe/empreinte au
  renderer, qui remplace son entrée de cache et **ferme la connexion en cours** avec `ERROR 0x09` — le token
  qu'elle avait présenté n'est plus valide. Aucun nouveau code d'erreur.
- **Ordre imposé** : Adonis émet l'événement avant de rendre le secret à la page.
- **Adonis refuse la rotation si le renderer est hors ligne.** Le secret frais ne pourrait pas l'atteindre, et
  l'ancien serait détruit pour rien. Un renderer auto-hébergé qui a perdu son canal continue de servir ses
  dalles ([ADR-0008](0008-renderer-autonome.md)) mais ne peut plus apprendre une empreinte. Le refus nomme sa
  cause ; `renderers.status` pouvant être en retard, c'est une politesse, pas une garantie.
- **Fenêtre de course.** Si le simulateur se présente avant que le renderer n'ait appliqué l'événement, il reçoit
  `ERROR 0x04`. Le simulateur réessaie alors un nombre borné de fois, et **lui seul, et seulement dans les
  secondes qui suivent une rotation qu'il a lui-même demandée** : le refus y est transitoire par construction.
  Ailleurs, rejouer un credential refusé reste exactement ce qu'on ne veut pas.

## Alternatives écartées

**Stocker le token des devices simulateurs en clair pour pouvoir le redonner.** La solution évidente, et celle
qui vide [ADR-0012](0012-format-des-tokens.md) de son contenu : sa valeur tient à ce qu'aucun secret ne soit
relisible. Une exception « seulement pour les simulateurs » est une exception qui se propage, et la V1 stockait
déjà les tokens en clair — c'est le défaut qu'on vient de corriger.

**Un credential de session court, à côté du token permanent.** Le renderer connaîtrait deux empreintes par
device, avec une expiration à gérer, soit un second mécanisme de bail à côté de
[ADR-0015](0015-bail-de-session-device.md). Écarté parce que la rotation obtient le même résultat sans notion
nouvelle : un device simulateur n'a aucun credential à préserver, donc rien ne justifie d'en maintenir deux.

**La saisie manuelle, c'est-à-dire le statu quo.** Écartée faute d'objet : il n'y a rien à saisir.

**Une voie de frames authentifiée par la session utilisateur, sans token de device.** Ce serait un second chemin
d'entrée dans le renderer, et le simulateur cesserait d'exercer le protocole device — donc de vérifier quoi que
ce soit ([ADR-0020](0020-simulateur-device-declare.md)).

## Conséquences

- [ADR-0012](0012-format-des-tokens.md) gagne l'endpoint qui lui manquait : « une rotation reste la seule
  réponse à une fuite » n'était réalisable nulle part.
- **Ouvrir le simulateur invalide l'onglet précédent.** C'est cohérent avec une seule connexion active par
  device, mais la cause est différente : ici l'ancienne connexion tombe parce que son token est mort, pas parce
  qu'une nouvelle l'a remplacée.
- **Le `token_prefix` d'un device simulateur change à chaque ouverture.** Il ne peut donc pas servir à suivre ce
  device dans les journaux : un préfixe identifie un credential, l'`id` identifie un device.
- **Piste non tranchée** : Adonis n'a aujourd'hui aucun accusé de réception du renderer, ce qui laisse la
  fenêtre de course ouverte et traitée par un réessai. L'enveloppe porte déjà un `id` « pour corrélation », donc
  la porte est ouverte. À reprendre si le réessai se révèle insuffisant en pratique.
