# ADR-0011 — Authentification device par premier message binaire

**Statut** : Accepté — 2026-08-30

## Contexte

Le firmware V1 s'authentifiait par en-tête HTTP à l'ouverture du WebSocket
(`client.addHeader("token", RENDERER_TOKEN)`). C'est la solution naturelle, et un ESP32 sait la mettre en œuvre.

Mais le projet prévoit un **simulateur** : une page web de debug qui remplace le matériel et parle le protocole
device au renderer. C'est un client device de plein droit, et il tourne dans un navigateur.

**L'API WebSocket des navigateurs ne permet pas de définir d'en-tête HTTP personnalisé.** La voie de la V1 est
donc fermée si l'on veut que le simulateur parle exactement le même protocole que le matériel.

## Décision

**Authentification par premier message binaire.** La connexion s'ouvre sans credential ; le client envoie
immédiatement son token ; le renderer ferme la connexion si rien de valide n'arrive dans le délai imparti.

## Alternatives écartées

**En-tête HTTP.** Impossible depuis un navigateur.

**Token en chaîne de requête** (`wss://…/?token=…`). Fonctionne des deux côtés. Écarté parce que les credentials
se retrouveraient dans les journaux d'accès, l'historique et les référents — une URL n'est pas un endroit pour
un secret.

**Deux chemins d'authentification**, en-tête pour le matériel et chaîne de requête pour le navigateur. Écarté :
deux chemins à spécifier, implémenter et tester pour un seul protocole, et le simulateur cesserait d'être une
implémentation de référence fidèle.

## Conséquences

- Un seul chemin d'authentification, identique pour le matériel et le navigateur.
- Aucun secret ne transite dans une URL.
- Le renderer doit appliquer un **délai d'authentification** et fermer les connexions muettes, sous peine de
  laisser des sockets non authentifiées ouvertes.
- Le simulateur reste une implémentation de référence fidèle du protocole
  ([SIMULATOR.md](../SIMULATOR.md)).
- Corollaire à spécifier : **une seule connexion active par device**. Simulateur et matériel peuvent revendiquer
  le même device, et après une coupure WiFi l'ancienne socket est souvent encore ouverte côté renderer.
