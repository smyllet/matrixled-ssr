# ADR-0014 — Les sources de données appartiennent à Adonis

**Statut** : Proposé — 2026-08-31

> En discussion, non appliqué. Le reste de la documentation ne s'y conforme pas encore. Avant acceptation :
> confirmer que les sources se poussent bien sur le plan de contrôle plutôt que par un canal dédié, et vérifier
> sur une première source réelle que le modèle « nom, valeur, validité » suffit.

## Contexte

Une scène affiche rarement du contenu figé : l'heure, une température, un nombre de mails non lus, un cours, un
prochain passage de bus. Ces valeurs viennent de l'extérieur du système, et il faut décider **qui va les
chercher**.

La question s'est posée en relisant [ADR-0008](0008-renderer-autonome.md) : « le renderer reste autonome sur son
dernier état connu » ne veut rien dire tant qu'on n'a pas dit de quel état on parle. Tant que les sources ne sont
pas modélisées, l'autonomie du renderer est une promesse sans contenu.

L'heure est le cas qui force la décision, parce qu'elle est la seule source qu'un renderer pourrait produire
seul : il a une horloge système. La traiter à part était tentant.

## Décision

**Toutes les valeurs affichées viennent d'Adonis, par un mécanisme unique. L'heure n'y fait pas exception.**

- Une **source** a un nom, une valeur, et une durée de validité.
- Une scène **se lie** à des sources nommées. Elle ne sait pas d'où vient une valeur.
- Adonis récupère ou calcule les valeurs et les pousse sur le plan de contrôle
  ([ADR-0007](0007-plan-de-controle-wss.md)).
- Le renderer les met en cache et **rend une fonction pure de `(scène, valeurs)`**. Il ne connecte rien, ne
  calcule aucune valeur, et n'interprète aucune source en particulier.

**Entre deux poussées, une valeur ne bouge pas.** Le renderer n'extrapole rien : il affiche la dernière valeur
reçue. Une horloge dont la valeur n'est plus rafraîchie affiche une heure figée.

La répartition est donc : **Adonis possède la donnée, le renderer possède le mouvement.** Les transitions, le
défilement et les animations restent locales et rendues à la cadence du device — c'est ce qui continue de
justifier [ADR-0002](0002-renderer-en-go.md). Aucune valeur ne transite à la cadence de rendu.

## Alternatives écartées

**Le renderer récupère les sources lui-même.** Il a Internet, et une panne de la plateforme ne périmerait alors
plus rien : l'autonomie promise par [ADR-0008](0008-renderer-autonome.md) serait entière. Écarté parce qu'un
renderer auto-hébergé tourne chez un tiers : lui confier les sources reviendrait à lui répliquer les
identifiants des comptes de l'utilisateur — clé d'API du service de mail, jeton du calendrier. C'est exactement
ce que le projet refuse déjà pour les tokens device, qui ne sont répliqués que sous forme d'empreintes
([ADR-0012](0012-format-des-tokens.md)). Il faudrait en plus un connecteur par service dans chaque renderer, et
donc une compatibilité de connecteurs à négocier en plus des primitives de rendu.

**Traiter l'heure comme un cas local.** Le renderer a une horloge système ; il pourrait rendre une horloge sans
rien recevoir, et une panne de la plateforme n'y changerait rien. Écarté au nom de l'uniformité : une exception
impose un second chemin de donnée à spécifier, une base de fuseaux horaires et une configuration de locale
embarquées dans le renderer, et deux comportements différents à expliquer selon la source. Le fuseau, le format
et la locale vivent une seule fois, à côté des préférences de l'utilisateur.

**Pousser une loi d'évolution avec la valeur** — pour l'heure, un instant de référence et un fuseau, que le
renderer prolonge avec son horloge monotone. Ce n'est pas une exception mais une généralisation : un compteur,
une progression, un compte à rebours en bénéficieraient aussi, et l'horloge redeviendrait autonome. Écarté
**pour l'instant** : c'est un concept de plus dans un modèle de sources qui n'a pas encore servi. C'est la piste
naturelle une fois le produit fonctionnel, et le jour où le gel de l'heure devient gênant en pratique.

## Conséquences

- **L'horloge devient la scène la moins autonome.** Une panne de la plateforme la fige en une minute, et une
  heure figée est la donnée la plus visiblement fausse qu'une dalle puisse afficher — tout le monde dans la
  pièce en connaît la vraie valeur. C'est le coût assumé de l'uniformité, et il porte précisément sur l'exemple
  qui motivait [ADR-0008](0008-renderer-autonome.md).
- **L'autonomie du renderer cesse d'être une propriété déclarée pour devenir une conséquence.** Un renderer
  reste utile aussi longtemps que les valeurs de son cache restent valides : indéfiniment pour une scène sans
  source, une minute pour une horloge. [ADR-0008](0008-renderer-autonome.md) garantit qu'il continue de
  **tourner** ; il ne garantit pas que ce qu'il affiche reste **vrai**.
- **Adonis entre dans un chemin périodique**, sans entrer dans le chemin de rendu. Une horloge à la minute, c'est
  une poussée par minute et par device sur le plan de contrôle — négligeable en regard des 30 frames par seconde
  du plan de données, mais le plan de contrôle cesse d'être purement événementiel.
- Les identifiants des services tiers ne quittent jamais la plateforme.
- **Reste à spécifier** : le message de poussée des valeurs sur le plan de contrôle
  ([PROTOCOL-CONTROL.md](../PROTOCOL-CONTROL.md), issue #27), la syntaxe de liaison dans la configuration de
  scène, et le catalogue des sources. Cet ADR fixe la propriété et la forme, pas le vocabulaire — comme
  `scene_nodes`, il se remplira au fil des sources ajoutées.
- Ce qu'affiche le renderer quand une valeur a dépassé sa validité — la laisser figée, la marquer, basculer sur
  un repli — n'est pas tranché ici. Aujourd'hui elle reste affichée telle quelle.
