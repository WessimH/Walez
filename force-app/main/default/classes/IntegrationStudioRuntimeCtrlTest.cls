@IsTest
private class IntegrationStudioRuntimeCtrlTest {

    @IsTest
    static void shouldCreateRuntimeLogFromRestPayload() {
        Integration_Flow__c flowRecord =
            new Integration_Flow__c(
                Name = 'Runtime REST Test',
                Status__c = 'Active',
                Is_Active__c = true,
                Diagram_JSON__c = '{"nodes":[],"edges":[]}'
            );
        insert flowRecord;

        Map<String, Object> payload = new Map<String, Object>{
            'flowId' => flowRecord.Id,
            'edgeId' => 'mulesoft-erp',
            'status' => 'success',
            'durationMs' => 450,
            'correlationId' => 'CORR-REST-001'
        };

        RestRequest request = new RestRequest();
        request.requestUri =
            '/services/apexrest/integration-studio/runtime';
        request.httpMethod = 'POST';
        request.requestBody = Blob.valueOf(
            JSON.serialize(payload)
        );

        RestContext.request = request;
        RestContext.response = new RestResponse();

        Test.startTest();
        IntegrationStudioRuntimeCtrl.RuntimeResponse response =
            IntegrationStudioRuntimeCtrl.createLog();
        Test.stopTest();

        System.assertEquals(201, RestContext.response.statusCode);
        System.assertEquals(flowRecord.Id, response.flowId);
        System.assertEquals('mulesoft-erp', response.edgeId);
        System.assertEquals('Success', response.status);

        Integration_Execution_Log__c storedLog = [
            SELECT
                Status__c,
                Duration_Ms__c,
                Correlation_Id__c
            FROM Integration_Execution_Log__c
            WHERE Id = :response.id
        ];

        System.assertEquals('Success', storedLog.Status__c);
        System.assertEquals(450, storedLog.Duration_Ms__c);
        System.assertEquals(
            'CORR-REST-001',
            storedLog.Correlation_Id__c
        );
    }
}
