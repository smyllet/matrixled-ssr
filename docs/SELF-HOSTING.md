# Auto-héberger un renderer

> Décisions : [ADR-0007](adr/0007-plan-de-controle-wss.md), [ADR-0008](adr/0008-renderer-autonome.md).
> Protocole : [PROTOCOL-CONTROL.md](PROTOCOL-CONTROL.md).

La plateforme fournit un **renderer par défaut** mutualisé. Un utilisateur peut aussi faire tourner **son propre
renderer** sur son réseau, et y rattacher ses devices.

Ce document est le contrat entre la plateforme et un renderer tiers. Il est écrit pour que quelqu'un puisse en
écrire un sans autre référence que ce dossier.

## Pourquoi auto-héberger

- **Latence.** Le renderer est sur le même réseau que les dalles.
- **Autonomie.** Les dalles continuent de fonctionner si la plateforme est injoignable
  ([ADR-0008](adr/0008-renderer-autonome.md)).
- **Bande passante.** Le flux à ~185 KB/s par dalle ne sort pas du réseau local.

## Ce que voit un renderer tiers

| Reçoit | Ne reçoit pas |
|--------|---------------|
| Les devices **qui lui sont assignés** | Le registre global, les autres utilisateurs |
| L'**empreinte** de leurs tokens | Les tokens en clair |
| Leur géométrie et leurs réglages | Les comptes, les mots de passe, les sessions |
| Les scènes assignées à ces devices | Les scènes non assignées |
| — | Tout accès à la base de données |

Un renderer **n'accède jamais à la base** ([ADR-0004](adr/0004-device-vers-renderer.md)). C'était une préférence
d'architecture tant que tous les composants étaient internes ; c'est devenu une contrainte de sécurité dès lors
qu'un tiers peut en opérer un.

## Ce que la plateforme attend

### Le renderer compose, la plateforme jamais

Le renderer ouvre une connexion WSS sortante vers la plateforme et la maintient. **Aucun port n'a besoin d'être
ouvert vers l'extérieur** — c'est ce qui rend l'auto-hébergement praticable derrière une box.

Le seul port qu'il écoute est celui de ses devices, sur le réseau local.

### Le renderer est une entrée non fiable

La plateforme ne fait pas confiance à ce qu'un renderer déclare :

- il **ne peut pas revendiquer** un device qui ne lui est pas assigné ;
- toute métrique qu'il remonte est validée et bornée avant d'être persistée ;
- sa version et ses capacités déclarées sont validées avant usage.

Ce n'est pas une défiance envers l'utilisateur : c'est la conséquence normale du fait qu'un composant sorte du
périmètre opéré par la plateforme.

### Annoncer ses capacités honnêtement

C'est la seule obligation dont le non-respect casse réellement l'expérience. Un renderer qui surdéclare ses
capacités affichera un résultat faux au lieu de refuser une scène.

```jsonc
"capabilities": {
  "panel_types": ["hub75"],
  "scene_schema_versions": [1],
  "scene_nodes": [],
  "max_devices": 32,
  "max_pixels_per_device": 65536
}
```

| Champ | Sens |
|-------|------|
| `panel_types` | Technologies de dalle pilotées. Aujourd'hui `hub75` uniquement ([ADR-0005](adr/0005-hub75-dabord.md)) |
| `scene_schema_versions` | Versions d'enveloppe de scène comprises |
| `scene_nodes` | Primitives de rendu implémentées |
| `max_devices` | Nombre de devices servis simultanément |
| `max_pixels_per_device` | Plafond de géométrie. Ne peut excéder 65 536 ([PROTOCOL-DEVICE.md](PROTOCOL-DEVICE.md)) |

Le renderer déclare en outre ses **`endpoints`** : les adresses auxquelles ses devices peuvent le joindre,
`wss://`, `ws://`, ou les deux ([ADR-0016](adr/0016-transports-declares-par-le-renderer.md)). Sur un réseau
local, `ws://` en clair est un choix assumé : sans certificat reconnu, un `wss://` auto-signé non épinglé
n'apporte que du chiffrement, pas d'authentification. Déclarer aussi un `wss://` avec un certificat reconnu est
ce qui rend le renderer atteignable depuis le simulateur du dashboard hébergé ([SIMULATOR.md](SIMULATOR.md)).

Adonis refuse d'assigner ce que ces capacités ne couvrent pas, et remonte la cause à l'utilisateur.
**Un refus explicite vaut mieux qu'un affichage faux.**

Le vocabulaire de `scene_nodes` est volontairement vide aujourd'hui : il se remplira au fil des primitives
ajoutées. Le mécanisme, lui, est en place — c'est ce qui compte pour ne pas se retrouver coincé plus tard.

### Traiter les révocations

Un renderer conforme doit :

- fermer immédiatement la connexion d'un device sur `device.revoked` ;
- purger l'entrée de son cache ;
- remplacer l'entrée de cache et fermer la connexion en cours sur `device.credential_rotated`, avec le même
  code `ERROR 0x09` : le token présenté par cette connexion n'est plus valide
  ([ADR-0021](adr/0021-credential-du-simulateur-par-rotation.md)) ;
- horodater son dernier contact de contrôle réussi, et fermer avec `ERROR 0x0A` toute session dont
  l'`offlineGrace` est dépassé depuis cet horodatage — **connexions établies comprises**
  ([ADR-0015](adr/0015-bail-de-session-device.md)). Cet horodatage doit survivre à un redémarrage : sinon
  relancer le renderer remet le bail à zéro, et la borne ne borne plus rien
  ([ADR-0008](adr/0008-renderer-autonome.md)).

## Fonctionnement hors ligne

Quand la plateforme est injoignable, un renderer conforme :

- **continue de servir** les devices déjà authentifiés dont le bail court encore, sur son dernier état connu ;
- **continue d'accepter** les connexions de devices dont l'empreinte est en cache et le bail valide ;
- **refuse** les devices inconnus de son cache ;
- **coupe** les devices dont le bail a expiré, avec `ERROR 0x0A` ;
- accumule l'état à remonter et le rejoue à la reconnexion ;
- reconnecte avec un retrait exponentiel plafonné.

Il ne doit **jamais** éteindre une dalle du seul fait que la plateforme ne répond plus. C'est la raison d'être
de l'auto-hébergement, et cela compense la fragilité introduite par
[ADR-0001](adr/0001-streaming-de-frames.md) — sans quoi une panne distante noircirait un écran posé à trois
mètres de son serveur.

La seule extinction admise est l'**expiration du bail** ([ADR-0015](adr/0015-bail-de-session-device.md)), et
elle ne s'y substitue pas : son défaut de sept jours dépasse toute panne réaliste. Une dalle qui s'éteint au
bout de quelques minutes de coupure est un renderer mal configuré, pas un renderer conforme.

## Le renderer par défaut est multi-tenant

Le renderer de la plateforme sert plusieurs utilisateurs à la fois. Son isolation est une **obligation
spécifiée**, pas une propriété espérée :

- chaque objet reçu porte son propriétaire ;
- le cloisonnement se fait **par connexion device**, pas par convention de nommage ;
- aucune scène ni aucun credential ne franchit la frontière entre deux utilisateurs.

C'est précisément cette exigence qui a écarté un bus de données partagé sans autorisation par locataire au
profit d'un canal authentifié par renderer ([ADR-0007](adr/0007-plan-de-controle-wss.md)).

Un renderer auto-hébergé, lui, est mono-tenant : il ne sert que les devices de son propriétaire.

## Détails d'implémentation laissés libres

Ce que la plateforme ne spécifie pas, et dont elle n'a pas à connaître :

- comment le renderer stocke son état local — fichier, SQLite embarqué, Redis, peu importe ;
- comment il ordonnance ses boucles de rendu ;
- comment il est packagé et déployé.

Redis, en particulier, reste parfaitement légitime **à l'intérieur** d'un renderer comme cache et état local.
Il a seulement cessé d'être le bus entre services, pour les raisons exposées en
[ADR-0007](adr/0007-plan-de-controle-wss.md).
