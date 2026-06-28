@IsTest
private class IntegrationStudioFlowRuntimeCtrlTest {

    @IsTest
    static void shouldReturnFlowsWithRuntimeData() {
        Map<String, Object> diagram = new Map<String, Object>{
            'nodes' => new List<Object>(),
            'edges' => new List<Object>{
                new Map<String, Object>{
                    'id' => 'salesforce-apex',
                    'source' => 'salesforce',
                    'target' => 'apex',
                    'data' => new Map<String, Object>{
                        'exchangeType' => 'requestResponse',
                        'protocol' => 'Salesforce internal'
                    }
                }
            }
        };

        Integration_Flow__c flowRecord =
            new Integration_Flow__c(
                Name = 'Controller Runtime Test',
                Status__c = 'Active',
                Is_Active__c = true,
                Diagram_JSON__c = JSON.serialize(diagram)
            );
        insert flowRecord;

        insert new Integration_Execution_Log__c(
            Integration_Flow__c = flowRecord.Id,
            Edge_Id__c = 'salesforce-apex',
            Status__c = 'Running',
            Started_At__c = System.now(),
            Correlation_Id__c = 'CORR-RUNNING'
        );

        RestRequest request = new RestRequest();
        request.requestUri =
            '/services/apexrest/integration-studio/flows-runtime';
        request.httpMethod = 'GET';
        RestContext.request = request;
        RestContext.response = new RestResponse();

        Test.startTest();
        IntegrationStudioFlowRuntimeCtrl.FlowListResponse response =
            IntegrationStudioFlowRuntimeCtrl.getFlows();
        Test.stopTest();

        System.assert(response.totalSize >= 1);

        Boolean found = false;

        for (
            IntegrationStudioFlowRuntimeCtrl.FlowDefinition definition :
            response.flows
        ) {
            if (definition.id == flowRecord.Id) {
                found = true;
                System.assert(
                    definition.diagramJson.contains(
                        '"status":"running"'
                    )
                );
                System.assert(
                    definition.diagramJson.contains(
                        'CORR-RUNNING'
                    )
                );
            }
        }

        System.assertEquals(true, found);
    }

    @IsTest
    static void shouldSaveNodePosition() {
        Map<String, Object> diagram = new Map<String, Object>{
            'nodes' => new List<Object>{
                new Map<String, Object>{
                    'id' => 'salesforce',
                    'position' => new Map<String, Object>{
                        'x' => 40,
                        'y' => 180
                    },
                    'data' => new Map<String, Object>{
                        'label' => 'Salesforce'
                    }
                },
                new Map<String, Object>{
                    'id' => 'apex',
                    'position' => new Map<String, Object>{
                        'x' => 380,
                        'y' => 180
                    },
                    'data' => new Map<String, Object>{
                        'label' => 'Apex'
                    }
                }
            },
            'edges' => new List<Object>{
                new Map<String, Object>{
                    'id' => 'salesforce-apex',
                    'source' => 'salesforce',
                    'target' => 'apex'
                }
            }
        };

        Integration_Flow__c flowRecord =
            new Integration_Flow__c(
                Name = 'Layout Persistence Test',
                Status__c = 'Active',
                Is_Active__c = true,
                Diagram_JSON__c = JSON.serialize(diagram)
            );
        insert flowRecord;

        RestRequest request = new RestRequest();
        request.requestUri =
            '/services/apexrest/integration-studio/flows-runtime';
        request.httpMethod = 'PATCH';
        request.requestBody = Blob.valueOf(
            JSON.serialize(
                new Map<String, Object>{
                    'flowId' => flowRecord.Id,
                    'nodes' => new List<Object>{
                        new Map<String, Object>{
                            'id' => 'apex',
                            'x' => 720,
                            'y' => 360
                        }
                    }
                }
            )
        );

        RestContext.request = request;
        RestContext.response = new RestResponse();

        Test.startTest();
        IntegrationStudioFlowRuntimeCtrl.LayoutUpdateResponse response =
            IntegrationStudioFlowRuntimeCtrl.updateLayout();
        Test.stopTest();

        System.assertEquals(true, response.success);
        System.assertEquals(1, response.updatedNodes);

        Integration_Flow__c updatedFlow = [
            SELECT Diagram_JSON__c
            FROM Integration_Flow__c
            WHERE Id = :flowRecord.Id
        ];

        Map<String, Object> updatedDiagram =
            (Map<String, Object>) JSON.deserializeUntyped(
                updatedFlow.Diagram_JSON__c
            );

        List<Object> updatedNodes =
            (List<Object>) updatedDiagram.get('nodes');

        Map<String, Object> apexNode;

        for (Object nodeObject : updatedNodes) {
            Map<String, Object> currentNode =
                (Map<String, Object>) nodeObject;

            if ((String) currentNode.get('id') == 'apex') {
                apexNode = currentNode;
                break;
            }
        }

        System.assertNotEquals(null, apexNode);

        Map<String, Object> savedPosition =
            (Map<String, Object>) apexNode.get('position');

        System.assertEquals(
            Decimal.valueOf('720'),
            (Decimal) savedPosition.get('x')
        );

        System.assertEquals(
            Decimal.valueOf('360'),
            (Decimal) savedPosition.get('y')
        );
    }
}
