@RestResource(urlMapping='/integration-studio/runtime/*')
global with sharing class IntegrationStudioRuntimeCtrl {

    global class RuntimeResponse {
        public Id id;
        public Id flowId;
        public String edgeId;
        public String status;
        public Datetime createdDate;
    }

    @HttpPost
    global static RuntimeResponse createLog() {
        try {
            String requestBody =
                RestContext.request.requestBody == null
                    ? null
                    : RestContext.request.requestBody.toString();

            IntegrationStudioRuntimeService.RuntimeInput input =
                (IntegrationStudioRuntimeService.RuntimeInput)
                    JSON.deserialize(
                        requestBody,
                        IntegrationStudioRuntimeService.RuntimeInput.class
                    );

            Integration_Execution_Log__c executionLog =
                IntegrationStudioRuntimeService.recordExecution(input);

            RuntimeResponse response = new RuntimeResponse();
            response.id = executionLog.Id;
            response.flowId = executionLog.Integration_Flow__c;
            response.edgeId = executionLog.Edge_Id__c;
            response.status = executionLog.Status__c;
            response.createdDate = System.now();

            RestContext.response.statusCode = 201;
            return response;
        } catch (Exception currentError) {
            RestContext.response.statusCode = 400;
            throw new IntegrationStudioRuntimeException(
                currentError.getMessage()
            );
        }
    }

    global class IntegrationStudioRuntimeException
        extends Exception {
    }
}
