# Glossaire

Ce document fixe le vocabulaire du projet. Chaque terme a **un seul sens**, et c'est celui-ci.

Ce glossaire n'est pas cosmétique. Dans les versions antérieures de la documentation, le mot « matrix »
désignait selon la phrase la dalle physique, l'appareil qui la pilote, ou le contenu affiché dessus — trois
choses qui ont des cycles de vie différents et qui sont aujourd'hui trois entités distinctes
([ADR-0006](adr/0006-modele-renderer-device-scene.md)).

---

## Entités

**Renderer** — Un moteur de rendu : le programme Go qui calcule les frames et les diffuse aux devices. Il en
existe deux sortes, qui parlent le même protocole :

- *renderer par défaut* — celui de la plateforme, mutualisé entre tous les utilisateurs ;
- *renderer auto-hébergé* — celui qu'un utilisateur fait tourner chez lui.

**Device** — Un appareil qui affiche : un Matrix Portal S3, ou un simulateur. Porte une identité, un credential,
une géométrie et un état. Un device se connecte à **un** renderer.

**Scene** — Un contenu à afficher, décrit par une configuration versionnée et validée. Une scène est une donnée,
pas un processus. Plusieurs devices peuvent afficher la même scène.

**Simulateur** — Une page du dashboard Nuxt qui remplace le matériel : elle parle le protocole device et peint
les frames sur un canvas. C'est un **device**, pas une prévisualisation.

---

## Matériel

**Panel** *(dalle)* — Le composant physique qui émet la lumière. Une dalle HUB75, par exemple 64×32.
Le terme désigne le matériel d'affichage, jamais l'appareil qui le pilote.

**HUB75** — L'interface des dalles LED matricielles utilisées par le projet. À ne pas confondre avec les
**rubans adressables** (WS2812B, SK6812, APA102), qui ne sont pas supportés
([ADR-0005](adr/0005-hub75-dabord.md)) et dont relèvent les notions d'ordre de couleurs et de mappage
géométrique.

**Chaînage** — Le raccordement de plusieurs dalles pour former une surface plus grande. `chainLength` compte les
dalles, pas les pixels.

**Protomatter** — La bibliothèque Adafruit qui pilote une dalle HUB75 depuis un ESP32-S3.

---

## Protocole

**Frame** — Une image complète destinée à une dalle, à un instant donné. L'unité de diffusion du chemin device.

**FULL** — Une frame transmise intégralement, tous les pixels.

**DELTA** — Une frame transmise en ne décrivant que les pixels modifiés depuis la précédente.

**Plan de données** — Le chemin qui porte les frames : renderer → device, binaire, à cadence élevée.

**Plan de contrôle** — Le chemin qui porte la configuration et l'état : renderer ↔ Adonis, JSON, à faible
fréquence. Voir [ADR-0007](adr/0007-plan-de-controle-wss.md).

**Bootstrap** — La phase de démarrage d'un device : il demande à la plateforme l'adresse de son renderer avant
de s'y connecter ([ADR-0009](adr/0009-bootstrap-par-redirection.md)).

**Capacités** — L'ensemble des primitives qu'un renderer sait rendre, qu'il annonce à sa connexion. Adonis
refuse d'assigner une scène qui les dépasse.

**Backpressure** — La situation où un device consomme les frames moins vite que le renderer ne les produit. Le
protocole y répond en jetant les frames en retard plutôt qu'en les empilant.

---

## Termes proscrits

| Ne pas écrire | Écrire | Pourquoi |
|---------------|--------|----------|
| « matrix » pour parler du matériel | **device** ou **panel** selon ce qu'on désigne | Ambigu entre appareil, dalle et contenu |
| « matrix » pour parler du contenu | **scene** | idem |
| « zone », « layout » côté device | — | Ce sont des notions internes au renderer, jamais transmises au device |
| « ACK », « frame perdue » | — | Sans objet sur TCP ([ADR-0003](adr/0003-websocket-binaire-tcp.md)) |
| « SSR » sans précision | **rendu côté serveur des frames** | Le projet ne fait pas de rendu HTML côté serveur |
