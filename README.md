# Salesforce Integration Studio

Une application React moderne intégrée à Salesforce qui regroupe **7 outils développeur** dans une seule interface pour tester, explorer, concevoir et superviser les intégrations Salesforce.

A modern React application embedded in Salesforce that brings together **7 developer tools** in one interface to test, explore, design and monitor Salesforce integrations.

---

# 🇫🇷 Documentation française

## Présentation

**Salesforce Integration Studio** est une console développeur pensée pour centraliser les principaux besoins liés aux intégrations Salesforce.

L’application permet de :

- tester des APIs ;
- formater et analyser du JSON ;
- générer des DTO Apex ;
- construire des requêtes SOQL ;
- explorer les Named Credentials ;
- inspecter les Platform Events ;
- visualiser et superviser des flux d’intégration de bout en bout.

L’objectif est de fournir une expérience moderne, claire et productive directement dans Salesforce, sans exposer de secrets côté React.

## Les 7 outils

### 1. API Tester

Permet de tester rapidement des endpoints HTTP depuis Salesforce.

Fonctionnalités principales :

- choix de la méthode HTTP ;
- saisie de l’URL ou de l’endpoint ;
- ajout d’en-têtes ;
- envoi de payloads JSON ;
- affichage du statut HTTP ;
- lecture de la réponse ;
- mesure du temps d’exécution ;
- support des appels via Salesforce et Named Credentials.

Cas d’usage :

- tester une API REST ;
- vérifier une intégration externe ;
- valider un endpoint MuleSoft ;
- diagnostiquer une erreur HTTP.

---

### 2. JSON Formatter

Permet de lire, formater, minifier et valider du JSON.

Fonctionnalités principales :

- formatage automatique ;
- indentation lisible ;
- minification ;
- validation syntaxique ;
- copie rapide du résultat ;
- détection des erreurs JSON.

Cas d’usage :

- nettoyer un payload ;
- préparer une requête API ;
- analyser une réponse MuleSoft ;
- vérifier un message Platform Event.

---

### 3. Apex DTO Generator

Permet de générer des classes Apex à partir d’un exemple JSON.

Fonctionnalités principales :

- génération automatique des classes Apex ;
- création des propriétés ;
- gestion des objets imbriqués ;
- gestion des listes ;
- typage Apex ;
- production d’un DTO directement exploitable.

Cas d’usage :

- créer rapidement une structure de désérialisation ;
- transformer une réponse JSON en classes Apex ;
- accélérer la création d’intégrations REST.

---

### 4. SOQL Builder

Permet de construire des requêtes SOQL sans devoir saisir toute la syntaxe manuellement.

Fonctionnalités principales :

- sélection de l’objet Salesforce ;
- sélection des champs ;
- ajout de filtres ;
- tri ;
- limite de résultats ;
- génération de la requête ;
- exécution dans Salesforce ;
- affichage du résultat.

Cas d’usage :

- explorer les données d’une org ;
- tester une requête ;
- préparer une classe Apex ;
- vérifier un mapping d’intégration.

---

### 5. Named Credentials Explorer

Permet d’explorer les Named Credentials disponibles dans l’org.

Fonctionnalités principales :

- affichage des Named Credentials ;
- lecture des principales informations de configuration ;
- visualisation de l’endpoint ;
- vérification de la disponibilité d’une configuration ;
- aide au diagnostic des intégrations sécurisées.

Sécurité :

- aucun secret n’est exposé dans React ;
- l’exécution reste côté Salesforce ;
- les informations sensibles restent protégées par la plateforme.

Cas d’usage :

- vérifier une configuration d’API ;
- retrouver un endpoint ;
- diagnostiquer un problème de connexion ;
- préparer un callout Apex.

---

### 6. Platform Events Explorer

Permet d’explorer les Platform Events présents dans l’org Salesforce.

Fonctionnalités principales :

- détection des objets se terminant par `__e` ;
- affichage du label et du nom API ;
- lecture des champs accessibles ;
- préparation des payloads ;
- aide à la compréhension d’une architecture event-driven.

Cas d’usage :

- analyser un Platform Event ;
- préparer un publisher Apex ;
- vérifier les champs disponibles ;
- documenter une intégration asynchrone.

---

### 7. Integration Flow Visualizer

Permet de modéliser et superviser graphiquement un flux d’intégration complet.

Fonctionnalités principales :

- diagramme interactif basé sur React Flow ;
- nœuds personnalisés ;
- flux directionnels et bidirectionnels ;
- animations modernes ;
- mini-map ;
- zoom et déplacement ;
- sauvegarde automatique de la position des nœuds ;
- statut runtime par étape ;
- durée réelle ;
- Correlation ID ;
- date de dernière exécution ;
- message d’erreur ;
- panneau de détails techniques ;
- HUD de supervision ;
- design futuriste avec glassmorphism et effets lumineux.

### Exemple de flux supervisé

```text
Salesforce
→ Apex Controller
→ MuleSoft
→ ERP
→ MuleSoft
→ Salesforce
```

Étapes runtime utilisées :

```text
salesforce-apex
apex-mulesoft
mulesoft-erp
erp-mulesoft
mulesoft-salesforce
```

Chaque étape est enregistrée avec le même `Correlation_Id__c`.

### Statuts gérés

- Succès
- Erreur
- En cours
- Inconnu

### Données runtime affichées

- statut ;
- durée ;
- date d’exécution ;
- Correlation ID ;
- message d’erreur ;
- informations techniques de la requête et de la réponse.

---

## Page d’accueil

La page d’accueil présente :

- l’identité de l’application ;
- les raccourcis vers les outils ;
- le nombre de modules disponibles ;
- un indicateur de connexion Salesforce ;
- un rappel de sécurité ;
- un accès rapide à l’API Tester et au SOQL Builder.

---

## Architecture générale

```text
Salesforce
   │
   ▼
React UI Bundle
   │
   ▼
Salesforce Platform SDK
   │
   ▼
Apex REST / Apex Services
   │
   ├── API Tester
   ├── JSON tools
   ├── DTO generation
   ├── SOQL execution
   ├── Named Credentials
   ├── Platform Events
   └── Integration monitoring
```

Pour le module Integration Flow Visualizer :

```text
Salesforce UI
   │
   ▼
React Flow Visualizer
   │
   ▼
Apex REST API
   │
   ▼
Integration_Execution_Log__c
   │
   ▼
MuleSoft
   │
   ▼
Dolibarr ERP
```

---

## Stack technique

### Frontend

- React
- TypeScript
- React Flow / XYFlow
- Tailwind CSS
- Lucide React
- Salesforce Platform SDK

### Salesforce

- Apex
- Apex REST
- Queueable Apex
- SOQL
- Custom Objects
- Named Credentials
- Platform Events
- Salesforce CLI
- Salesforce UI Bundles

### Intégration

- MuleSoft Anypoint Studio
- APIs REST
- JSON
- Correlation IDs
- HTTP callouts

### ERP de démonstration

- Dolibarr
- Docker
- MariaDB

---

## Objets Salesforce utilisés pour le monitoring

### `Integration_Flow__c`

Décrit un flux d’intégration.

Champs principaux :

- `Name`
- `Description__c`
- `Status__c`
- `Diagram_JSON__c`
- `Is_Active__c`

### `Integration_Execution_Log__c`

Stocke les informations runtime.

Champs principaux :

- `Flow__c`
- `Edge_Id__c`
- `Status__c`
- `Started_At__c`
- `Ended_At__c`
- `Duration_Ms__c`
- `Correlation_Id__c`
- `Error_Message__c`
- `Details_JSON__c`

---

## Structure du projet

```text
src/
├── components/
│   └── flow/
│       ├── AnimatedFlowEdge.tsx
│       ├── BidirectionalFlowEdge.tsx
│       └── FuturisticFlowNode.tsx
│
├── pages/
│   ├── Home.tsx
│   ├── ApiTester.tsx
│   ├── JsonFormatter.tsx
│   ├── ApexDtoGenerator.tsx
│   ├── SoqlBuilder.tsx
│   ├── NamedCredentials.tsx
│   ├── PlatformEvents.tsx
│   ├── IntegrationFlowVisualizer.tsx
│   ├── Settings.tsx
│   └── FlowCanvas.css
│
force-app/
└── main/
    └── default/
        ├── classes/
        ├── objects/
        └── uiBundles/
```

---

## Installation

### Prérequis

- Node.js
- npm
- Salesforce CLI
- une org Salesforce connectée ;
- un projet Salesforce DX ;
- MuleSoft Anypoint Studio pour les scénarios d’intégration ;
- Docker pour lancer Dolibarr localement.

### Installer les dépendances

```powershell
npm install
```

### Build

```powershell
npm run build
```

---

## Déploiement

### Déployer le bundle React

```powershell
sf project deploy start `
  --source-dir force-app/main/default/uiBundles/integrationStudio `
  --target-org vroomandgo-dev
```

### Déployer les classes Apex

```powershell
sf project deploy start `
  --source-dir force-app/main/default/classes `
  --target-org vroomandgo-dev
```

---

## Endpoint runtime

```text
/services/apexrest/integration-studio/flows-runtime
```

Cet endpoint renvoie les définitions de flux enrichies avec les dernières données d’exécution.

---

## Vérifier les logs runtime

```powershell
sf data query `
  --query "SELECT Edge_Id__c, Status__c, Correlation_Id__c, Duration_Ms__c, CreatedDate FROM Integration_Execution_Log__c ORDER BY CreatedDate DESC LIMIT 20" `
  --target-org vroomandgo-dev
```

---

## Sécurité

- aucun secret n’est stocké côté React ;
- les callouts passent par Salesforce ;
- les Named Credentials protègent les informations sensibles ;
- les permissions Salesforce restent appliquées ;
- les APIs Apex contrôlent les données exposées à l’interface.

---

## Évolutions possibles

- historique des exécutions ;
- replay visuel d’un flux ;
- filtres par statut ou Correlation ID ;
- export PNG ou PDF ;
- comparaison entre plusieurs runs ;
- alertes temps réel ;
- rafraîchissement via Platform Events ;
- mode plein écran ;
- éditeur graphique de flux ;
- sauvegarde de collections de requêtes API ;
- historique SOQL ;
- génération de tests Apex à partir des DTO.

---

# 🇬🇧 English documentation

## Overview

**Salesforce Integration Studio** is a modern developer console embedded in Salesforce that centralizes the main tools required to build, test and monitor Salesforce integrations.

The application includes **7 developer tools**:

1. API Tester
2. JSON Formatter
3. Apex DTO Generator
4. SOQL Builder
5. Named Credentials Explorer
6. Platform Events Explorer
7. Integration Flow Visualizer

The goal is to provide a productive and secure experience directly inside Salesforce.

---

## The 7 tools

### 1. API Tester

Used to test HTTP endpoints from Salesforce.

Main features:

- HTTP method selection;
- endpoint configuration;
- custom headers;
- JSON payloads;
- response body display;
- HTTP status display;
- execution duration;
- support for Salesforce callouts and Named Credentials.

---

### 2. JSON Formatter

Used to format, minify and validate JSON.

Main features:

- pretty formatting;
- minification;
- syntax validation;
- error detection;
- copy-ready output.

---

### 3. Apex DTO Generator

Generates Apex DTO classes from JSON examples.

Main features:

- automatic Apex class generation;
- typed properties;
- nested object support;
- list support;
- ready-to-use deserialization models.

---

### 4. SOQL Builder

Builds and executes SOQL queries through a guided interface.

Main features:

- Salesforce object selection;
- field selection;
- filters;
- sorting;
- limits;
- generated SOQL;
- query execution;
- result display.

---

### 5. Named Credentials Explorer

Displays the Named Credentials available in the Salesforce org.

Main features:

- credential discovery;
- endpoint inspection;
- integration configuration checks;
- secure architecture diagnostics.

No secret is exposed to the React application.

---

### 6. Platform Events Explorer

Explores Salesforce Platform Events.

Main features:

- detection of `__e` objects;
- API name and label display;
- accessible field inspection;
- payload preparation;
- event-driven architecture documentation.

---

### 7. Integration Flow Visualizer

Provides a graphical and runtime view of integration flows.

Main features:

- interactive React Flow diagram;
- custom futuristic nodes;
- directional and bidirectional edges;
- animated particles;
- mini-map;
- zoom and pan;
- automatic node position persistence;
- runtime status;
- real execution duration;
- correlation ID;
- last execution date;
- error messages;
- technical details panel;
- monitoring HUD;
- glassmorphism and neon effects.

### Monitored example

```text
Salesforce
→ Apex Controller
→ MuleSoft
→ ERP
→ MuleSoft
→ Salesforce
```

Runtime edge identifiers:

```text
salesforce-apex
apex-mulesoft
mulesoft-erp
erp-mulesoft
mulesoft-salesforce
```

---

## General architecture

```text
Salesforce
   │
   ▼
React UI Bundle
   │
   ▼
Salesforce Platform SDK
   │
   ▼
Apex REST / Apex Services
   │
   ├── API testing
   ├── JSON tools
   ├── DTO generation
   ├── SOQL execution
   ├── Named Credentials
   ├── Platform Events
   └── Integration monitoring
```

Integration monitoring architecture:

```text
Salesforce UI
   │
   ▼
React Flow Visualizer
   │
   ▼
Apex REST API
   │
   ▼
Integration_Execution_Log__c
   │
   ▼
MuleSoft
   │
   ▼
Dolibarr ERP
```

---

## Technology stack

### Frontend

- React
- TypeScript
- React Flow / XYFlow
- Tailwind CSS
- Lucide React
- Salesforce Platform SDK

### Salesforce

- Apex
- Apex REST
- Queueable Apex
- SOQL
- Custom Objects
- Named Credentials
- Platform Events
- Salesforce CLI
- Salesforce UI Bundles

### Integration

- MuleSoft Anypoint Studio
- REST APIs
- JSON
- HTTP callouts
- Correlation IDs

### Demo ERP

- Dolibarr
- Docker
- MariaDB

---

## Installation

### Requirements

- Node.js
- npm
- Salesforce CLI
- a connected Salesforce org;
- a Salesforce DX project;
- MuleSoft Anypoint Studio for integration scenarios;
- Docker for local Dolibarr execution.

### Install dependencies

```powershell
npm install
```

### Build

```powershell
npm run build
```

---

## Deployment

### Deploy the React bundle

```powershell
sf project deploy start `
  --source-dir force-app/main/default/uiBundles/integrationStudio `
  --target-org vroomandgo-dev
```

### Deploy Apex classes

```powershell
sf project deploy start `
  --source-dir force-app/main/default/classes `
  --target-org vroomandgo-dev
```

---

## Runtime endpoint

```text
/services/apexrest/integration-studio/flows-runtime
```

This endpoint returns flow definitions enriched with the latest runtime execution data.

---

## Security

- no secret is stored in React;
- callouts are executed through Salesforce;
- Named Credentials protect sensitive configuration;
- Salesforce permissions remain enforced;
- Apex APIs control which data is exposed to the UI.

---

## Possible improvements

- execution history;
- visual replay mode;
- status and correlation filters;
- PNG or PDF export;
- run comparison;
- real-time alerts;
- Platform Event live refresh;
- fullscreen mode;
- graphical flow editor;
- saved API request collections;
- SOQL history;
- Apex test generation from DTOs.

---

## Auteur / Author

Projet conçu comme démonstration d’une plateforme Salesforce moderne orientée développement, intégration, sécurité et observabilité.
