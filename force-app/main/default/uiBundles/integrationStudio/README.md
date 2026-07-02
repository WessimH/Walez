# Salesforce Integration Studio

Interface React embarquée dans Salesforce pour explorer, tester et superviser les intégrations d'une org.

`Integration Studio` centralise les outils utiles au quotidien pour les développeurs Salesforce : appels API, inspection JSON, génération de DTO Apex, requêtes SOQL, Named Credentials, Platform Events et visualisation de flux d'intégration.

## Sommaire

- [Vue d'ensemble](#vue-densemble)
- [Fonctionnalites](#fonctionnalites)
- [Architecture](#architecture)
- [Stack technique](#stack-technique)
- [Demarrage local](#demarrage-local)
- [Build et deploiement](#build-et-deploiement)
- [Qualite](#qualite)
- [Securite](#securite)
- [Structure du projet](#structure-du-projet)
- [Troubleshooting](#troubleshooting)

## Vue d'ensemble

Cette application est un **Salesforce UI Bundle** construit avec React, Vite et TypeScript. Elle vit dans un projet SFDX et est servie par Salesforce après build/deploiement.

Objectifs principaux :

- réduire le temps de diagnostic sur les intégrations Salesforce ;
- fournir une boîte à outils moderne directement dans l'org ;
- garder les secrets et appels sensibles côté Salesforce ;
- offrir une UX lisible pour les flux synchrones, asynchrones et event-driven.

## Fonctionnalites

| Module                      | Rôle                                             | Impact                                                      |
| --------------------------- | ------------------------------------------------ | ----------------------------------------------------------- |
| Home                        | Page d'accueil et point d'entrée                 | Oriente rapidement vers les outils disponibles              |
| API Tester                  | Test d'API REST via Salesforce                   | Valide endpoints, méthodes, headers, payloads et réponses   |
| JSON Formatter              | Formatage, minification et validation JSON       | Rend les payloads plus lisibles et détecte les erreurs      |
| Apex DTO Generator          | Génération de DTO Apex depuis un JSON            | Accélère la création de classes de désérialisation          |
| SOQL Builder                | Construction et exécution de requêtes SOQL       | Explore les données Salesforce sans écrire toute la syntaxe |
| Named Credentials Explorer  | Lecture des configurations Named Credentials     | Aide au diagnostic des intégrations sécurisées              |
| Platform Events Explorer    | Inspection et publication de Platform Events     | Facilite le travail sur les architectures event-driven      |
| Integration Flow Visualizer | Visualisation interactive des flux d'intégration | Supervise les étapes, statuts, durées et erreurs runtime    |
| Settings                    | Préférences locales de l'interface               | Ajuste le comportement sans toucher au backend              |

## Architecture

L'UI Bundle se trouve ici :

```text
force-app/main/default/uiBundles/integrationStudio
```

Flux d'exécution simplifié :

```text
React UI Bundle
  -> Salesforce Platform SDK
  -> Apex REST Controllers
  -> Metadata / SOQL / Callouts / Runtime Logs
```

Principes de conception :

- le frontend gère l'interface, l'état local et la présentation ;
- les appels sensibles passent par Apex et le Salesforce Platform SDK ;
- les Named Credentials restent la source de vérité pour les endpoints externes ;
- les visualisations de flux consomment un `diagramJson` et des données runtime ;
- les composants React volumineux sont découpés en hooks et sous-composants pour rester maintenables.

## Stack technique

- React 19
- React Router 7
- TypeScript 5
- Vite 7
- Tailwind CSS 4
- Salesforce UI Bundle SDK
- Salesforce Platform SDK
- React Flow (`@xyflow/react`)
- Vitest
- Playwright
- React Doctor

Prérequis :

- Node.js `>=22`
- npm
- Salesforce CLI (`sf`)
- Une org Salesforce cible pour les fonctionnalités connectées

## Demarrage local

Depuis la racine du repo :

```bash
cd force-app/main/default/uiBundles/integrationStudio
npm install
npm run dev
```

Vite démarre ensuite l'app en local, généralement sur :

```text
http://localhost:5173
```

Mode design :

```bash
npm run dev:design
```

Notes importantes :

- certaines pages peuvent s'afficher localement mais ne pourront pas appeler Salesforce hors contexte org ;
- les appels via `@salesforce/platform-sdk` nécessitent un environnement Salesforce compatible ;
- pour tester les écrans connectés de bout en bout, build puis déploie le bundle dans une org.

## Build et deploiement

### Build local

Depuis le dossier du UI Bundle :

```bash
npm run build
```

Le build génère les assets dans :

```text
force-app/main/default/uiBundles/integrationStudio/dist
```

### Déploiement UI Bundle uniquement

Depuis la racine du projet SFDX :

```bash
sf project deploy start \
  --source-dir force-app/main/default/uiBundles/integrationStudio \
  --target-org <alias>
```

### Déploiement complet du projet Salesforce

Depuis la racine du projet :

```bash
sf project deploy start --source-dir force-app --target-org <alias>
```

Remplace `<alias>` par l'alias de ton org Salesforce.

## Qualite

Commandes utiles depuis `force-app/main/default/uiBundles/integrationStudio` :

| Commande                            | Usage                                      |
| ----------------------------------- | ------------------------------------------ |
| `npm run build`                     | Compile TypeScript et génère le build Vite |
| `npm run lint`                      | Lance ESLint                               |
| `npm run test`                      | Lance Vitest                               |
| `npm run preview`                   | Sert le build localement                   |
| `npm run doctor`                    | Lance React Doctor                         |
| `npx react-doctor@latest --verbose` | Audit détaillé React Doctor                |

Checklist avant commit :

```bash
npm run build
npx react-doctor@latest --verbose
```

Le build peut afficher un message Salesforce du type `No authorization information found` si aucune org par défaut n'est connectée. Ce message est attendu en local tant que Vite termine le build avec succès.

## Securite

Règles à respecter :

- ne jamais stocker de secret dans le code React ;
- ne pas exposer de token, password, client secret ou endpoint sensible côté navigateur ;
- privilégier les Named Credentials pour les appels externes ;
- faire passer les opérations sensibles par Apex ;
- vérifier les données affichées dans les explorateurs avant de les rendre visibles à des profils non techniques.

Le frontend peut afficher des informations de configuration utiles, mais il ne doit pas devenir une source d'exposition de secrets.

## Structure du projet

```text
integrationStudio/
├── dist/                     # Assets générés par Vite
├── src/
│   ├── app.tsx               # Bootstrap React
│   ├── appLayout.tsx         # Layout principal
│   ├── components/           # Header, Sidebar et composants partagés
│   ├── pages/                # Outils métiers de l'application
│   ├── routes.tsx            # Définition des routes React Router
│   ├── styles/               # Styles globaux
│   └── utils/                # Helpers partages
├── package.json              # Scripts et dépendances du bundle
├── vite.config.ts            # Configuration Vite / Salesforce UI Bundle
└── integrationStudio.uibundle-meta.xml
```

Contrôleurs Apex reliés à l'application :

```text
force-app/main/default/classes/IntegrationStudioApiController.cls
force-app/main/default/classes/IntegrationStudioNamedCredCtrl.cls
force-app/main/default/classes/IntegrationStudioEventCtrl.cls
force-app/main/default/classes/IntegrationStudioSoqlController.cls
force-app/main/default/classes/IntegrationStudioFlowRuntimeCtrl.cls
force-app/main/default/classes/IntegrationStudioRuntimeCtrl.cls
force-app/main/default/classes/IntegrationStudioRuntimeService.cls
```

## Troubleshooting

| Problème                                              | Cause probable                          | Solution                                                                                     |
| ----------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------- |
| `No authorization information found` pendant le build | Aucune org Salesforce par défaut        | Connecter une org si nécessaire avec `sf org login web`, ou ignorer si le build Vite réussit |
| Page locale vide ou appels Salesforce indisponibles   | L'app tourne hors contexte Salesforce   | Déployer dans une org pour tester les fonctionnalités connectées                             |
| `npx react-doctor@latest` échoue sur le réseau        | Accès npm bloqué ou hors ligne          | Relancer avec accès réseau ou utiliser un environnement connecté                             |
| Les assets `dist/` changent après build               | Build Vite régénère les fichiers hashés | Inclure les nouveaux assets et supprimer les anciens dans le commit                          |
| Une page devient difficile a modifier                 | Composant trop volumineux               | Extraire un hook de logique et des composants de presentation                                |

## Workflow recommande

1. Modifier l'UI ou les controllers Apex concernes.
2. Lancer `npm run build`.
3. Lancer `npx react-doctor@latest --verbose` pour vérifier la qualité React.
4. Déployer dans une org de test.
5. Valider les pages connectées avec des données Salesforce réelles.
6. Committer uniquement un lot coherent.
