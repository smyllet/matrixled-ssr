# ADR-0016 — Le renderer déclare ses transports

**Statut** : Accepté — 2026-08-31

## Contexte

[PROTOCOL-DEVICE.md](../PROTOCOL-DEVICE.md) annonçait une `renderer_url` en `wss://`, sans jamais dire comment
un renderer auto-hébergé l'obtient. Or il est derrière NAT, sur une adresse de réseau local
([ADR-0007](0007-plan-de-controle-wss.md)) : aucune autorité publique ne lui délivrera de certificat pour
`192.168.1.50`.

La réponse implicite était « certificat auto-signé ». Elle ne tient pas : un device qui accepte un certificat
auto-signé sans l'épingler obtient du **chiffrement sans authentification**. N'importe qui sur le réseau local
peut se placer au milieu et capter le token, qui passe en premier message
([ADR-0011](0011-auth-premier-message.md)). Le `wss://` était donc décoratif dans ce cas précis.

Le simulateur a rendu le problème visible. Étant une page du dashboard
([ARCHITECTURE.md](../ARCHITECTURE.md)), il est soumis aux règles du navigateur : une page servie en HTTPS ne
peut pas ouvrir un `ws://`, ni un `wss://` dont le certificat n'est pas reconnu. Là où un firmware peut ignorer
une validation, un navigateur refuse — conformément à la règle de conception de
[SIMULATOR.md](../SIMULATOR.md), qui veut que le simulateur révèle ce que le protocole suppose sans le dire.

## Décision

**Le renderer déclare les transports sur lesquels il est joignable, et le client choisit.**

- `renderer.hello` porte `endpoints`, une liste d'adresses au lieu d'une adresse unique. Un renderer peut
  n'annoncer que `wss://`, que `ws://`, ou les deux.
- Le bootstrap renvoie cette liste telle quelle. **Le choix appartient au client**, pas à Adonis :
  - un firmware retient `wss://` s'il est présent, `ws://` sinon ;
  - le simulateur ne retient que les schémas que le navigateur autorise **depuis l'origine de la page qui le
    sert** : servi en HTTPS il ne garde que `wss://`, servi en HTTP il accepte les deux.

Le critère est le schéma de la page, et non celui de la plateforme. C'est la même règle, correctement évaluée,
et elle rattrape gratuitement le cas qui compte le plus : en développement le dashboard est servi sur
`http://localhost:3000`, donc le simulateur y atteint un renderer en `ws://` sur le réseau local. Le seul cas
réellement contraint est le dashboard hébergé en HTTPS.

Renvoyer la liste entière plutôt qu'une adresse choisie par Adonis préserve une propriété qui a un prix :
**simulateur et firmware continuent d'emprunter exactement le même bootstrap.** Une réponse qui varierait selon
l'appelant ferait du simulateur un client à part, donc un instrument de vérification qui ne vérifie plus la
bonne chose.

`ws://` en clair sur un réseau local est **assumé** : c'est ce que l'auto-signé offrait déjà en pratique, sans
le prétendre.

## Alternatives écartées

**Épingler l'empreinte du certificat**, livrée au bootstrap à côté de l'adresse. Le firmware obtiendrait une
authentification réelle pour quelques lignes de spécification, et c'est strictement meilleur que l'auto-signé
non vérifié. Écarté **pour l'instant** seulement : ça ne débloque pas le navigateur, qui ne sait pas épingler, et
ça reste cumulable avec la présente décision le jour où le lien local doit être durci.

**Faire émettre les certificats par la plateforme** pour chaque renderer auto-hébergé, avec une zone DNS
publique pointant vers des adresses privées. Ça fonctionne réellement et ça débloquerait le navigateur partout.
Écarté : il faudrait faire de l'ACME pour le compte des utilisateurs, livrer des clés privées à des machines
tierces et publier leurs adresses locales. Hors de proportion, et à contre-courant de la posture du projet sur
les secrets répliqués ([ADR-0012](0012-format-des-tokens.md)).

**Laisser Adonis choisir l'adresse selon l'appelant.** Plus simple pour les clients, qui reçoivent une chaîne.
Écarté pour la raison ci-dessus : le simulateur cesserait d'exercer le même chemin que le matériel.

## Conséquences

- `Renderer.endpoint` devient `Renderer.endpoints`, une liste. C'est la seule rupture de forme.
- **La déclaration n'est pas vérifiable.** Un renderer auto-hébergé est injoignable depuis Adonis, qui ne peut
  donc pas sonder ce qu'il annonce — et « je sers du TLS » ne veut de toute façon pas dire « un navigateur
  acceptera mon certificat ». C'est cohérent avec le fait que le renderer soit une entrée non fiable
  ([SELF-HOSTING.md](../SELF-HOSTING.md)) : Adonis borne et persiste, il ne valide pas la réalité. Le mode
  d'échec est donc un simulateur qui propose un renderer et échoue à s'y connecter ; la réponse est un message
  d'erreur qui nomme la cause probable, pas une machinerie de sonde.
- Le simulateur hébergé n'atteint que les renderers déclarant `wss://` avec un certificat reconnu — en pratique
  celui de la plateforme. En développement, il les atteint tous.
- Aucun changement au protocole binaire : seul le contenu du bootstrap et de `renderer.hello` change.
