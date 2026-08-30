# ADR-0006 — Modèle Renderer / Device / Scene séparé

**Statut** : Accepté — 2026-08-30

## Contexte

Le modèle actuel n'a qu'une entité, `Matrix`, qui porte à la fois le nom, la géométrie physique, le contenu
(`config`) et le propriétaire. La V1 y ajoutait le token d'authentification du device.

Le mot « matrix » désignait donc, selon la phrase, la dalle physique, l'appareil, ou le contenu affiché.

## Décision

**Trois entités distinctes** : `Renderer`, `Device`, `Scene`. Voir [DATA-MODEL.md](../DATA-MODEL.md).

- `Renderer` — un moteur de rendu, celui de la plateforme ou celui d'un utilisateur.
- `Device` — un appareil physique : identité, credential, géométrie, état.
- `Scene` — un contenu : configuration versionnée et validée.

## Alternatives écartées

**Garder `Matrix` unique, avec son token (approche V1).** Plus simple. Écarté parce qu'il devient impossible de
réutiliser un contenu sur deux dalles, ou de remplacer un appareil défaillant sans perdre son contenu — le
contenu et le matériel n'ont pas le même cycle de vie.

**Aller directement jusqu'à `Playlist`** (séquence de scènes avec durées), ce que la V1 préfigurait avec son
tableau `panels[]`. Écarté pour l'instant : une entité de plus à spécifier sans besoin établi. Le lien
`Device → Scene` pourra devenir `Device → Playlist → Scene[]` sans rien casser.

## Conséquences

- Une `Scene` peut être partagée par plusieurs `Device`.
- Chaque `Device` porte son propre credential, distinct de celui de son `Renderer`.
- Un chemin de migration depuis la table `matrices` actuelle doit être documenté.
- Le vocabulaire devient univoque, ce que formalise le [glossaire](../GLOSSARY.md).
