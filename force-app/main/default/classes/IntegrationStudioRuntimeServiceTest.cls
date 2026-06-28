@IsTest
private class IntegrationStudioRuntimeServiceTest {

    @IsTest
    static void shouldEnrichDiagramWithLatestRuntimeLog() {
        Integration_Flow__c flowRecord = createFlow();
        Datetime startedAt = System.now().addSeconds(-2);
        Datetime endedAt = System.now();

        insert new Integration_Execution_Log__c(
            Integration_Flow__c = flowRecord.Id,
            Edge_Id__c = 'mulesoft-erp',
            Status__c = 'Success',
            Started_At__c = startedAt,
            Ended_At__c = endedAt,
            Duration_Ms__c = 2000,
            Correlation_Id__c = 'CORR-001'
        );

        String enrichedJson =
            IntegrationStudioRuntimeService.enrichDiagramJson(
                flowRecord.Id,
                flowRecord.Diagram_JSON__c
            );

        Map<String, Object> diagram =
            (Map<String, Object>) JSON.deserializeUntyped(
                enrichedJson
            );

        List<Object> edges = (List<Object>) diagram.get('edges');
        Map<String, Object> edge =
            (Map<String, Object>) edges[0];
        Map<String, Object> data =
            (Map<String, Object>) edge.get('data');

        System.assertEquals('success', data.get('status'));
        System.assertEquals('CORR-001', data.get('correlationId'));
        System.assertEquals(Decimal.valueOf('2000'), data.get('durationMs'));
        System.assertNotEquals(null, data.get('lastExecutionDate'));
    }

    @IsTest
    static void shouldRecordExecutionUsingFlowName() {
        Integration_Flow__c flowRecord = createFlow();

        IntegrationStudioRuntimeService.RuntimeInput input =
            new IntegrationStudioRuntimeService.RuntimeInput();
        input.flowName = flowRecord.Name;
        input.edgeId = 'salesforce-apex';
        input.status = 'error';
        input.startedAt = System.now().addSeconds(-1);
        input.endedAt = System.now();
        input.correlationId = 'CORR-ERROR';
        input.errorMessage = 'Test error';

        Test.startTest();
        Integration_Execution_Log__c result =
            IntegrationStudioRuntimeService.recordExecution(input);
        Test.stopTest();

        Integration_Execution_Log__c storedLog = [
            SELECT
                Integration_Flow__c,
                Edge_Id__c,
                Status__c,
                Duration_Ms__c,
                Error_Message__c
            FROM Integration_Execution_Log__c
            WHERE Id = :result.Id
        ];

        System.assertEquals(
            flowRecord.Id,
            storedLog.Integration_Flow__c
        );
        System.assertEquals('salesforce-apex', storedLog.Edge_Id__c);
        System.assertEquals('Error', storedLog.Status__c);
        System.assert(storedLog.Duration_Ms__c >= 0);
        System.assertEquals('Test error', storedLog.Error_Message__c);
    }

    @IsTest
    static void shouldReturnUnknownWhenNoLogExists() {
        Integration_Flow__c flowRecord = createFlow();

        String enrichedJson =
            IntegrationStudioRuntimeService.enrichDiagramJson(
                flowRecord.Id,
                flowRecord.Diagram_JSON__c
            );

        System.assert(enrichedJson.contains('"status":"unknown"'));
    }

    private static Integration_Flow__c createFlow() {
        Map<String, Object> diagram = new Map<String, Object>{
            'nodes' => new List<Object>(),
            'edges' => new List<Object>{
                new Map<String, Object>{
                    'id' => 'mulesoft-erp',
                    'source' => 'mulesoft',
                    'target' => 'erp',
                    'type' => 'bidirectional',
                    'data' => new Map<String, Object>{
                        'exchangeType' => 'requestResponse',
                        'protocol' => 'HTTPS / REST'
                    }
                }
            }
        };

        Integration_Flow__c flowRecord =
            new Integration_Flow__c(
                Name = 'Runtime Test ' + System.now().getTime(),
                Description__c = 'Runtime test',
                Status__c = 'Active',
                Is_Active__c = true,
                Diagram_JSON__c = JSON.serialize(diagram)
            );

        insert flowRecord;
        return flowRecord;
    }
}
