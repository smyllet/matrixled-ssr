# ADR-0020 — Le simulateur est un device déclaré, pas un device emprunté

**Statut** : Accepté — 2026-08-31

## Contexte

Deux documents décrivaient deux modèles différents.

[DATA-MODEL.md](../DATA-MODEL.md) portait un champ `isSimulator` décrit comme distinguant « un simulateur dans
l'interface » : une étiquette. [SIMULATOR.md](../SIMULATOR.md) décrivait à l'inverse un simulateur qui se
connecte avec le token de **n'importe quel** device du registre, matériel compris, et allait jusqu'à en tirer un
comportement voulu — « ouvrir le simulateur sur un device allumé coupe la dalle ».

La contradiction n'est pas cosmétique : dans ce second modèle, le drapeau ne décrit rien que quoi que ce soit
maintienne vrai. Un device marqué simulateur peut être revendiqué par du firmware, un device matériel peut être
revendiqué par un onglet. Un champ que rien ne garantit est pire qu'un champ absent, parce que l'interface
l'affiche comme s'il signifiait quelque chose.

S'y ajoute une gêne d'usage : observer une dalle imposait de saisir le token d'un device de production dans une
page de debug, et d'éteindre cette dalle pendant l'observation.

## Décision

**Un device déclare sa nature.** `devices.kind` vaut `hardware` ou `simulator`, est choisi à la création et
n'est plus modifiable ensuite.

- Le simulateur ne propose que les devices `kind = simulator`. Observer une scène consiste à créer un device
  simulateur et à lui assigner cette scène, pas à emprunter l'identité d'une dalle.
- **Le renderer n'en sait rien.** `kind` ne voyage pas sur le plan de contrôle et n'apparaît pas dans le
  protocole device. C'est déjà ce qu'exige [SIMULATOR.md](../SIMULATOR.md) : aucun cas particulier côté renderer,
  sans quoi le simulateur cesserait de vérifier ce qu'il prétend vérifier.

**Ce que cette règle est, et ce qu'elle n'est pas.** C'est une règle de registre, tenue par le dashboard et
l'API. Ce n'est pas une frontière d'authentification : rien dans `DEVICE_HELLO` ne distingue un navigateur d'un
firmware, et le renderer ne pourrait donc pas l'appliquer même s'il le voulait. Il n'y a d'ailleurs rien à en
protéger — les deux devices appartiennent au même utilisateur. Ce qu'on écarte est une confusion, pas un
attaquant.

## Alternatives écartées

**Le statu quo : le simulateur emprunte le token d'un device existant.** C'est ce que décrivait
[SIMULATOR.md](../SIMULATOR.md). Écarté parce qu'il rend l'observation destructrice — regarder ce qu'affiche une
dalle l'éteint — et parce qu'il laisse `isSimulator` mentir. Il fait en outre de la page de debug l'endroit où
l'on saisit le credential d'un device de production.

**Supprimer le drapeau.** L'autre façon cohérente de lever la contradiction : un device est un device, et rien
ne le qualifie. Écarté parce qu'on perd ce qui a de la valeur dans la distinction. Une dalle éteinte et un onglet
fermé produisent exactement le même `offline` : sans la nature du device, la supervision ne peut pas dire ce
qu'elle est en train de montrer, et le simulateur ne peut pas présélectionner les devices qui le concernent.

**Conserver `isSimulator`, en le rendant structurant.** C'est le changement minimal, et il suffirait. Écarté
surtout pour le nom : `isSimulator` se lit comme un drapeau d'affichage, il a été traité comme tel, et c'est
précisément ainsi que la contradiction est née. Un booléen ferme par ailleurs l'ensemble définitivement, alors
qu'un troisième client — une capture, un enregistreur — est concevable. L'énumération est une réserve à bas coût,
pas un plan : deux valeurs existent aujourd'hui, et rien de plus n'est prévu.

**Un simulateur hors registre, sans device ni token.** Une page qui recevrait les frames par le plan de contrôle
ou depuis Adonis. Écarté : ce serait une prévisualisation, elle n'exercerait plus le protocole device, et il
faudrait un second chemin d'émission dans le renderer. C'est exactement ce que
[SIMULATOR.md](../SIMULATOR.md) refuse d'être.

## Conséquences

- **L'observation sans perturbation devient le chemin normal, et gagne au change.** Un device simulateur portant
  la même scène qu'une dalle tombe dans le **même groupe de rendu** ([ADR-0017](0017-rendu-mutualise.md)) : le
  renderer calcule une seule frame pour les deux. À géométrie et `maxFps` identiques, le simulateur reçoit donc
  les mêmes frames que la dalle — au `sequence` près, qui appartient à chaque connexion, et à l'arbitrage
  `FULL`/`DELTA` près, qui dépend de l'historique de chaque connexion.
- **Ce qu'on perd** : on ne voit plus les octets exacts que reçoit *une* dalle donnée sur *sa* socket. Un défaut
  propre à cette connexion reste donc invisible au simulateur. La reproduction ci-dessus rejoue le contenu, pas
  la connexion.
- **La règle « une seule connexion active par device » ne change pas**, mais son illustration change : simulateur
  et matériel ne se disputent plus un device. Elle reste observable — deux onglets sur le même device simulateur
  — et reste nécessaire pour sa raison propre, la socket restée ouverte après une coupure WiFi
  ([ADR-0011](0011-auth-premier-message.md)).
- Le dashboard doit pouvoir créer un device simulateur sans matériel en face : même formulaire, même appairage,
  même token ([ADR-0012](0012-format-des-tokens.md)).
- Les devices issus de la migration depuis `matrices` sont tous `hardware`.
