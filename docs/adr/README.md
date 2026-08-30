# Architecture Decision Records

Chaque fichier consigne **une** décision : son contexte, le choix retenu, les alternatives écartées et les
conséquences qui en découlent.

Le but de ce dossier est de rendre les décisions **rediscutables à moindre coût**. Une décision dont on a gardé
la trace des alternatives se rouvre en lisant un fichier ; une décision dont on a perdu le raisonnement se
rouvre en refaisant toute l'analyse.

## Statuts

| Statut | Signification |
|--------|---------------|
| `Accepté` | En vigueur, le reste de la documentation s'y conforme |
| `Remplacé par ADR-XXXX` | Ne plus appliquer, voir l'ADR indiquée |
| `Proposé` | En discussion, non appliqué |

## Index

| # | Décision | Statut |
|---|----------|--------|
| [0001](0001-streaming-de-frames.md) | Streaming de frames plutôt que clip pré-rendu | Accepté |
| [0002](0002-renderer-en-go.md) | Renderer en Go, process séparé | Accepté |
| [0003](0003-websocket-binaire-tcp.md) | WebSocket binaire sur TCP pour le chemin device | Accepté |
| [0004](0004-device-vers-renderer.md) | Le device se connecte au renderer ; Adonis seul propriétaire de la base | Accepté |
| [0005](0005-hub75-dabord.md) | HUB75 d'abord, `panelType` comme point d'extension | Accepté |
| [0006](0006-modele-renderer-device-scene.md) | Modèle Renderer / Device / Scene séparé | Accepté |
| [0007](0007-plan-de-controle-wss.md) | Plan de contrôle en WSS sortant, JSON versionné | Accepté |
| [0008](0008-renderer-autonome.md) | Renderer auto-hébergé autonome sur dernier état connu | Accepté |
| [0009](0009-bootstrap-par-redirection.md) | Bootstrap device par redirection depuis la plateforme | Accepté |
| [0010](0010-postgresql-partout.md) | PostgreSQL partout, dev et test compris | Accepté |
| [0011](0011-auth-premier-message.md) | Authentification device par premier message binaire | Accepté |
