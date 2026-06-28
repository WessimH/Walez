@RestResource(
    urlMapping='/integration-studio/flows/latest-run/*'
)
global with sharing class IntegrationRunCtrl {

    @HttpGet
    global static RunResponse getLatestRun() {
        String flowIdValue =
            RestContext.request.params.get('flowId');

        if (String.isBlank(flowIdValue)) {
            throw new IntegrationRunException(
                'Le paramètre flowId est obligatoire.'
            );
        }

        Id flowId;

        try {
            flowId = (Id) flowIdValue;
        } catch (Exception exceptionValue) {
            throw new IntegrationRunException(
                'Le paramètre flowId est invalide.'
            );
        }

        List<Integration_Run__c> runs = [
            SELECT
                Id,
                Name,
                Integration_Flow__c,
                Status__c,
                Correlation_Id__c,
                Started_At__c,
                Finished_At__c,
                Duration_Ms__c,
                Error_Message__c,
                CreatedDate
            FROM Integration_Run__c
            WHERE Integration_Flow__c = :flowId
            WITH USER_MODE
            ORDER BY CreatedDate DESC
            LIMIT 1
        ];

        RunResponse response = new RunResponse();
        response.found = !runs.isEmpty();
        response.steps = new List<StepDefinition>();

        if (runs.isEmpty()) {
            return response;
        }

        Integration_Run__c latestRun = runs[0];

        response.run = new RunDefinition();
        response.run.id = latestRun.Id;
        response.run.name = latestRun.Name;
        response.run.flowId =
            latestRun.Integration_Flow__c;
        response.run.status =
            latestRun.Status__c;
        response.run.correlationId =
            latestRun.Correlation_Id__c;
        response.run.startedAt =
            latestRun.Started_At__c;
        response.run.finishedAt =
            latestRun.Finished_At__c;
        response.run.durationMs =
            latestRun.Duration_Ms__c;
        response.run.errorMessage =
            latestRun.Error_Message__c;

        List<Integration_Run_Step__c> stepRecords = [
            SELECT
                Id,
                Name,
                Integration_Run__c,
                Node_Key__c,
                Status__c,
                Sequence__c,
                Started_At__c,
                Finished_At__c,
                Duration_Ms__c,
                Request_Payload__c,
                Response_Payload__c,
                Error_Message__c
            FROM Integration_Run_Step__c
            WHERE Integration_Run__c = :latestRun.Id
            WITH USER_MODE
            ORDER BY Sequence__c ASC
        ];

        for (
            Integration_Run_Step__c stepRecord :
            stepRecords
        ) {
            StepDefinition step =
                new StepDefinition();

            step.id = stepRecord.Id;
            step.name = stepRecord.Name;
            step.nodeKey =
                stepRecord.Node_Key__c;
            step.status =
                stepRecord.Status__c;
            step.sequence =
                stepRecord.Sequence__c;
            step.startedAt =
                stepRecord.Started_At__c;
            step.finishedAt =
                stepRecord.Finished_At__c;
            step.durationMs =
                stepRecord.Duration_Ms__c;
            step.requestPayload =
                stepRecord.Request_Payload__c;
            step.responsePayload =
                stepRecord.Response_Payload__c;
            step.errorMessage =
                stepRecord.Error_Message__c;

            response.steps.add(step);
        }

        return response;
    }

    global class RunResponse {
        public Boolean found;
        public RunDefinition run;
        public List<StepDefinition> steps;
    }

    global class RunDefinition {
        public Id id;
        public String name;
        public Id flowId;
        public String status;
        public String correlationId;
        public Datetime startedAt;
        public Datetime finishedAt;
        public Decimal durationMs;
        public String errorMessage;
    }

    global class StepDefinition {
        public Id id;
        public String name;
        public String nodeKey;
        public String status;
        public Decimal sequence;
        public Datetime startedAt;
        public Datetime finishedAt;
        public Decimal durationMs;
        public String requestPayload;
        public String responsePayload;
        public String errorMessage;
    }

    global class IntegrationRunException
        extends Exception {
    }
}