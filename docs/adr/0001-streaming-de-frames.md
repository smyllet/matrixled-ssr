# ADR-0001 — Streaming de frames plutôt que clip pré-rendu

**Statut** : Accepté — 2026-08-30

## Contexte

La V1 du projet rendait le contenu côté serveur en un GIF animé, servi en HTTP. Le Matrix Portal S3 le
téléchargeait puis le jouait **en boucle et en autonomie** ; un WebSocket ne servait qu'à notifier « ton contenu
a changé, re-télécharge ». Cette approche fonctionnait.

Deux modèles de diffusion s'opposaient donc :

- **Clip pré-rendu** : le serveur envoie une animation complète, le device la joue seul.
- **Streaming** : le serveur envoie chaque frame, le device n'est qu'un tampon d'affichage.

## Décision

**Streaming de frames binaires à 30 FPS.** Le renderer calcule chaque frame et l'envoie au device, qui se
contente de l'écrire sur la dalle.

## Alternative écartée

**Clip pré-rendu joué en autonomie (approche V1).** Elle consomme une bande passante quasi nulle, survit à une
panne du serveur, et se satisfait d'un réseau médiocre. Elle a été écartée parce qu'elle plafonne la
granularité du contenu à un cycle d'animation figé : pas de contenu réagissant à un événement en moins d'un
cycle, pas de rendu piloté par une donnée qui change en continu.

Une variante hybride avait été envisagée — un protocole unique où un « clip » de N frames est mis en tampon par
le device, le mode live n'étant qu'un clip de longueur 1 renvoyé en continu. Elle offrait les deux régimes pour
un seul parseur. Elle a été écartée au profit du streaming simple, plus direct à spécifier et à implémenter.

## Conséquences

- La bande passante devient une contrainte de conception permanente : ~185 KB/s par matrice 64×32 à 30 FPS.
  Voir [PERFORMANCE.md](../PERFORMANCE.md).
- Un mode différentiel est nécessaire pour rendre ce coût acceptable — voir
  [PROTOCOL-DEVICE.md](../PROTOCOL-DEVICE.md).
- **Le device n'affiche plus rien si son renderer est injoignable.** C'est le prix assumé de cette décision, et
  c'est précisément ce qui rend [ADR-0008](0008-renderer-autonome.md) important : le renderer, lui, doit
  survivre à une panne de la plateforme.
- Le firmware reste minimal : recevoir, décoder, écrire. Aucune logique d'affichage embarquée.
