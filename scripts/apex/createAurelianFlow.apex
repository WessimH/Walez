String diagramJson = JSON.serialize(
    new Map<String, Object>{
        'nodes' => new List<Object>{
            new Map<String, Object>{
                'id' => 'salesforce',
                'type' => 'default',
                'position' => new Map<String, Object>{
                    'x' => 40,
                    'y' => 180
                },
                'data' => new Map<String, Object>{
                    'label' => 'Salesforce',
                    'systemType' => 'salesforce',
                    'description' =>
                        'Interface utilisateur qui déclenche la demande de réservation.'
                }
            },
            new Map<String, Object>{
                'id' => 'apex',
                'type' => 'default',
                'position' => new Map<String, Object>{
                    'x' => 380,
                    'y' => 180
                },
                'data' => new Map<String, Object>{
                    'label' => 'Apex Controller',
                    'systemType' => 'apex',
                    'description' =>
                        'Valide la demande, construit le message et publie le Platform Event.'
                }
            },
            new Map<String, Object>{
                'id' => 'platform-event',
                'type' => 'default',
                'position' => new Map<String, Object>{
                    'x' => 720,
                    'y' => 180
                },
                'data' => new Map<String, Object>{
                    'label' => 'Warehouse Order Event',
                    'systemType' => 'platformEvent',
                    'description' =>
                        'Message asynchrone Warehouse_Order_Request__e publié sur l’Event Bus Salesforce.'
                }
            },
            new Map<String, Object>{
                'id' => 'mulesoft',
                'type' => 'default',
                'position' => new Map<String, Object>{
                    'x' => 1060,
                    'y' => 180
                },
                'data' => new Map<String, Object>{
                    'label' => 'MuleSoft',
                    'systemType' => 'middleware',
                    'description' =>
                        'Consomme le Platform Event, valide les données et transforme le payload pour l’ERP.'
                }
            },
            new Map<String, Object>{
                'id' => 'erp',
                'type' => 'default',
                'position' => new Map<String, Object>{
                    'x' => 1400,
                    'y' => 180
                },
                'data' => new Map<String, Object>{
                    'label' => 'Aurelian ERP',
                    'systemType' => 'erp',
                    'description' =>
                        'Crée la commande, renvoie son identifiant et met à jour le stock.'
                }
            }
        },

        'edges' => new List<Object>{
            new Map<String, Object>{
                'id' => 'salesforce-apex',
                'source' => 'salesforce',
                'target' => 'apex',
                'type' => 'bidirectional',
                'label' => 'Demande de réservation',
                'animated' => true,
                'data' => new Map<String, Object>{
                    'exchangeType' => 'requestResponse',
                    'protocol' => 'Salesforce internal',
                    'method' => 'CALL',
                    'endpoint' => 'AurelianAvailabilityController',
                    'requestLabel' =>
                        'SKU, quantité, entrepôt et date de livraison',
                    'responseLabel' =>
                        'Validation de la demande et confirmation de publication'
                }
            },

            new Map<String, Object>{
                'id' => 'apex-platform-event',
                'source' => 'apex',
                'target' => 'platform-event',
                'type' => 'animated',
                'label' => 'Publication du Platform Event',
                'animated' => true,
                'data' => new Map<String, Object>{
                    'exchangeType' => 'event',
                    'protocol' => 'Salesforce Event Bus',
                    'method' => 'PUBLISH',
                    'endpoint' => 'Warehouse_Order_Request__e',
                    'requestLabel' =>
                        'Payload Warehouse_Order_Request__e'
                }
            },

            new Map<String, Object>{
                'id' => 'platform-event-mulesoft',
                'source' => 'platform-event',
                'target' => 'mulesoft',
                'type' => 'animated',
                'label' => 'Livraison asynchrone',
                'animated' => true,
                'data' => new Map<String, Object>{
                    'exchangeType' => 'event',
                    'protocol' =>
                        'Salesforce Streaming API - Replay Channel Listener',
                    'method' => 'SUBSCRIBE',
                    'endpoint' =>
                        '/event/Warehouse_Order_Request__e',
                    'requestLabel' =>
                        'Événement de demande de réservation'
                }
            },

            new Map<String, Object>{
                'id' => 'mulesoft-erp',
                'source' => 'mulesoft',
                'target' => 'erp',
                'type' => 'bidirectional',
                'label' => 'Création de la commande',
                'animated' => true,
                'data' => new Map<String, Object>{
                    'exchangeType' => 'requestResponse',
                    'protocol' => 'HTTPS / REST',
                    'method' => 'POST',
                    'endpoint' => '/api/index.php/orders',
                    'requestLabel' =>
                        'Commande client au format JSON',
                    'responseLabel' =>
                        'Identifiant et statut de la commande ERP'
                }
            }
        }
    }
);

List<Integration_Flow__c> existingFlows = [
    SELECT Id, Name
    FROM Integration_Flow__c
    WHERE Name = 'Aurelian Order Reservation'
    LIMIT 1
];

Integration_Flow__c flowRecord;

if (existingFlows.isEmpty()) {
    flowRecord = new Integration_Flow__c(
        Name = 'Aurelian Order Reservation'
    );
} else {
    flowRecord = existingFlows[0];
}

flowRecord.Description__c =
    'Flux asynchrone de réservation entre Salesforce, MuleSoft et l’ERP Aurelian.';

flowRecord.Status__c = 'Active';
flowRecord.Is_Active__c = true;
flowRecord.Diagram_JSON__c = diagramJson;

upsert flowRecord;

System.debug(
    'Integration Flow enregistré : ' + flowRecord.Id
);