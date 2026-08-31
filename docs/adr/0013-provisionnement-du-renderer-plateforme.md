# ADR-0013 — Credential du renderer plateforme provisionné par l'environnement

**Statut** : Accepté — 2026-08-30

## Contexte

[DATA-MODEL.md](../DATA-MODEL.md#credentials) pose que les credentials sont **générés à l'appairage et affichés
une seule fois**. La règle fonctionne pour un renderer auto-hébergé : son propriétaire le crée depuis le tableau
de bord, relève le token, le configure chez lui.

Le renderer de la plateforme, lui, n'a **pas de propriétaire** — c'est ce que signifie `ownerId = null`, et c'est
ce qui le rend visible par tous et modifiable par personne ([ADR-0006](0006-modele-renderer-device-scene.md)).
Personne ne peut donc l'appairer depuis l'interface. Il a pourtant besoin d'un credential pour ouvrir son canal
de contrôle ([PROTOCOL-CONTROL.md](../PROTOCOL-CONTROL.md)).

La migration qui l'insère lui donne un token généré puis jeté : la ligne est valide, le credential inutilisable.
Il manquait le chemin qui le rend utilisable.

## Décision

**Le credential du renderer plateforme est déclaré par le déploiement**, dans `PLATFORM_RENDERER_TOKEN`, et
appliqué au démarrage du serveur.

- L'opération est **idempotente** : le préfixe suffit à savoir si le credential stocké est déjà ce token, donc un
  démarrage normal ne hache rien ([ADR-0012](0012-format-des-tokens.md)).
- **Changer la variable et redémarrer, c'est faire une rotation.**
- Un token mal formé **empêche le démarrage**.

## Alternatives écartées

**Une commande `node ace renderer:issue-token`.** C'était le choix initial. Écarté pour deux raisons. D'abord
elle est techniquement impossible aujourd'hui : `@adonisjs/ace` 14.1.0 valide les métadonnées de chaque commande
locale avec `jsonschema` 1.5.0, dont la résolution de `$ref` lève `Invalid URL` — la présence d'un seul fichier
dans `commands/` fait échouer **tout** `node ace`, migrations comprises. Ensuite, même réparée, elle imposerait
une étape manuelle à chaque déploiement, sur une machine ayant accès à la base.

**Afficher le token dans la sortie de la migration.** Aucun outil à écrire. Écarté parce qu'un secret finirait
dans les journaux de déploiement — c'est déjà la raison pour laquelle [ADR-0011](0011-auth-premier-message.md)
refuse le token en chaîne de requête.

**Une interface d'administration.** Cohérente avec le reste du tableau de bord, mais elle suppose une notion de
rôle administrateur qui n'existe pas, et un écran à concevoir pour un seul objet.

**Donner un propriétaire au renderer plateforme.** Il redeviendrait appairable comme les autres, sans rien à
spécifier. Écarté parce que `ownerId = null` n'est pas un détail d'implémentation : c'est ce qui le rend commun à
tous les utilisateurs et administrable par aucun.

## Conséquences

- Le token devient un **secret de déploiement**, au même rang que `APP_KEY`. Le stockage haché continue de
  protéger contre le vol de la base — il n'a jamais eu pour objet de protéger contre l'accès à l'environnement de
  déploiement, et [ADR-0008](0008-renderer-autonome.md) visait la réplication chez un tiers, pas la plateforme
  elle-même.
- La rotation ne demande ni appel d'API ni accès à la base : une variable et un redémarrage.
- Le renderer plateforme fait **exception** à « généré à l'appairage, affiché une fois ». Les devices et les
  renderers auto-hébergés ne sont pas concernés et gardent le chemin d'appairage.
- Le déploiement génère le token lui-même, au format d'[ADR-0012](0012-format-des-tokens.md). La commande est
  documentée dans `.env.example`.
- Sans la variable, la plateforme démarre normalement : son renderer ne peut simplement pas se connecter. C'est
  le bon comportement tant que le renderer Go n'existe pas.
