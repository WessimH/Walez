Integration_Flow__c flowRecord = [
    SELECT Id, Name
    FROM Integration_Flow__c
    WHERE Name = 'Aurelian Order Reservation'
    ORDER BY LastModifiedDate DESC
    LIMIT 1
];

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
                        'Interface utilisateur qui déclenche la réservation.'
                }
            },
            new Map<String, Object>{
                'id' => 'apex',
                'type' => 'default',
                'position' => new Map<String, Object>{
                    'x' => 420,
                    'y' => 180
                },
                'data' => new Map<String, Object>{
                    'label' => 'Apex Controller',
                    'systemType' => 'apex',
                    'description' =>
                        'Valide la demande et appelle l’API MuleSoft.'
                }
            },
            new Map<String, Object>{
                'id' => 'mulesoft',
                'type' => 'default',
                'position' => new Map<String, Object>{
                    'x' => 800,
                    'y' => 180
                },
                'data' => new Map<String, Object>{
                    'label' => 'MuleSoft',
                    'systemType' => 'middleware',
                    'description' =>
                        'Expose l’API de réservation et orchestre l’appel ERP.'
                }
            },
            new Map<String, Object>{
                'id' => 'erp',
                'type' => 'default',
                'position' => new Map<String, Object>{
                    'x' => 1180,
                    'y' => 180
                },
                'data' => new Map<String, Object>{
                    'label' => 'Aurelian ERP',
                    'systemType' => 'erp',
                    'description' =>
                        'Crée la réservation et met à jour le stock.'
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
                    'endpoint' =>
                        'AurelianAvailabilityController.createReservation',
                    'requestLabel' =>
                        'Account, SKU et quantité',
                    'responseLabel' =>
                        'Résultat et identifiant de réservation'
                }
            },
            new Map<String, Object>{
                'id' => 'apex-mulesoft',
                'source' => 'apex',
                'target' => 'mulesoft',
                'type' => 'bidirectional',
                'label' => 'API de réservation',
                'animated' => true,
                'data' => new Map<String, Object>{
                    'exchangeType' => 'requestResponse',
                    'protocol' => 'HTTPS / REST',
                    'method' => 'POST',
                    'endpoint' => '/stock-reservations',
                    'requestLabel' =>
                        'Buyer Code, SKU et quantité',
                    'responseLabel' =>
                        'Statut de réservation et stock restant'
                }
            },
            new Map<String, Object>{
                'id' => 'mulesoft-erp',
                'source' => 'mulesoft',
                'target' => 'erp',
                'type' => 'bidirectional',
                'label' => 'Création de la réservation ERP',
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

flowRecord.Description__c =
    'Flux synchrone réel de réservation entre Salesforce, Apex, MuleSoft et l’ERP Aurelian.';

flowRecord.Diagram_JSON__c = diagramJson;

update flowRecord;

// Suppression des anciens logs de démonstration pour repartir sur des données réelles.
List<Integration_Execution_Log__c> demoLogs = [
    SELECT Id
    FROM Integration_Execution_Log__c
    WHERE Integration_Flow__c = :flowRecord.Id
];

if (!demoLogs.isEmpty()) {
    delete demoLogs;
}

System.debug(
    'Diagramme réel mis à jour et anciens logs supprimés : ' +
    flowRecord.Id
);
