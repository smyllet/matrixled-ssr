# ADR-0009 — Bootstrap device par redirection depuis la plateforme

**Statut** : Accepté — 2026-08-30

## Contexte

Un device doit savoir à quel renderer se connecter. En V1, l'adresse était gravée dans `secrets.h` à la
compilation. Avec plusieurs renderers possibles — celui de la plateforme, celui de l'utilisateur — cette adresse
devient une donnée de configuration, pas une constante de compilation.

## Décision

**Le device est flashé avec l'adresse de la plateforme et son token.** Au démarrage il interroge Adonis, reçoit
l'adresse de son renderer, puis ouvre la connexion binaire vers celui-ci.

## Alternatives écartées

**Adresse gravée à la compilation (V1).** Aucun service de démarrage à spécifier, aucune dépendance au boot.
Écarté parce que réassigner une dalle à un autre renderer imposerait de la reflasher physiquement — rédhibitoire
dès qu'un utilisateur peut basculer entre le renderer par défaut et le sien.

**Portail de configuration WiFi et découverte mDNS.** Meilleure expérience pour l'utilisateur final, qui n'aurait
rien à flasher. Écarté pour l'instant : nettement plus de firmware à spécifier et à écrire, pour un projet dont
le firmware n'existe pas encore. Reste souhaitable à terme.

## Conséquences

- Réassigner un device devient un changement de configuration.
- Une seule adresse est gravée dans le firmware, et elle est stable.
- **Le device dépend d'Adonis à l'allumage.** Il doit donc mettre en cache la dernière réponse reçue et
  retomber dessus si la plateforme ne répond pas, sans quoi une panne de la plateforme empêcherait un
  redémarrage — ce qui contredirait [ADR-0008](0008-renderer-autonome.md).
- Une route HTTP de démarrage s'ajoute à l'API, authentifiée par token device.
