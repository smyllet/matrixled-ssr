# ADR-0012 — Token à préfixe public et secret haché

**Statut** : Accepté — 2026-08-30

## Contexte

[DATA-MODEL.md](../DATA-MODEL.md#credentials) impose que les credentials de renderer et de device soient stockés
**hachés**, jamais en clair : [ADR-0008](0008-renderer-autonome.md) réplique ces empreintes chez un tiers, et un
renderer compromis ne doit pas livrer de credentials réutilisables.

Mais un client présente son token **sans identifiant**, sur les trois chemins :

- `DEVICE_HELLO` ne porte que le token ([PROTOCOL-DEVICE.md](../PROTOCOL-DEVICE.md#authentification),
  [ADR-0011](0011-auth-premier-message.md)) ;
- le canal de contrôle ouvre avec `Authorization: Bearer <token renderer>`
  ([PROTOCOL-CONTROL.md](../PROTOCOL-CONTROL.md)) ;
- le bootstrap device appelle Adonis avec `Authorization: Bearer <token device>`
  ([ADR-0009](0009-bootstrap-par-redirection.md)).

Or un hachage salé ne se recherche pas : il faut déjà savoir quelle ligne vérifier. Le stockage haché et la
résolution du token sont donc en tension, et rien dans la documentation ne disait comment la lever.

## Décision

**Le token porte un préfixe public qui sert de clé de recherche, et un secret qui seul est haché.**

```
mxr_2f9c1ab34d7e_9a8b…   renderer
mxd_71ce04ba82df_4d2f…   device
   └─ préfixe (6 octets)  └─ secret (32 octets)
```

- Le préfixe est stocké en clair, **unique et indexé**. Il identifie la ligne.
- Le secret est haché avec le hasher de l'application (scrypt, `config/hash.ts`) et vérifié par comparaison.
- L'étiquette (`mxr` / `mxd`) porte la portée : un token de device présenté sur le canal renderer est rejeté
  avant tout calcul cryptographique.

C'est aussi ce que `tokenPrefix` faisait déjà dans le modèle de données — le champ existait pour « identifier un
token dans une interface ou un journal sans le divulguer ». Cette décision lui donne son second rôle, celui de
clé de recherche, et fixe le format qui le rend fiable.

## Alternatives écartées

**Empreinte SHA-256 déterministe du token entier, colonne indexée.** Une seule lecture, aucun préfixe à gérer,
trivial à réimplémenter côté Go. Écarté parce que l'empreinte est justement ce qu'on réplique chez un tiers : un
hachage sans sel ni coût transforme une base dérobée en attaque hors ligne. Le secret a 256 bits d'entropie, ce
qui rend la force brute irréaliste — mais le stockage haché existe précisément pour ne pas reposer sur cette
seule hypothèse.

**Vérifier en balayant toutes les lignes.** Aucun format à spécifier, aucune donnée en clair. Écarté parce que le
coût est linéaire en nombre de credentials **multiplié** par le coût d'un scrypt, à chaque connexion : sur le
renderer par défaut, qui est multi-tenant, c'est un vecteur de déni de service.

**Token auto-porteur signé (JWT).** Aucune recherche du tout. Écarté parce que la révocation exigerait une liste
noire répliquée, alors que [ADR-0008](0008-renderer-autonome.md) rend déjà la révocation non instantanée : on
cumulerait les deux difficultés.

## Conséquences

- `token_prefix` est **unique et indexé**. C'est un identifiant public : il peut être affiché et journalisé, et
  il ne révèle rien.
- Un renderer doit recevoir le **préfixe en plus de l'empreinte** pour chacun de ses devices. Sans lui, il ne
  peut rattacher un `DEVICE_HELLO` à aucune entrée de son cache : `sync.full` est corrigé en ce sens.
- Renderer et device partagent un seul mécanisme d'émission et de vérification, donc un seul chemin à tester.
- Le coût de vérification est celui de scrypt, payé une fois par connexion — jamais par frame.
- L'empreinte est une chaîne PHC qui nomme son propre algorithme : en changer plus tard n'invalide pas les
  tokens existants.
- Une rotation reste la seule réponse à une fuite, et elle invalide immédiatement le token précédent.
