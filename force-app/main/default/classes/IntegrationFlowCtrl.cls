@RestResource(urlMapping='/integration-studio/flows/*')
global with sharing class IntegrationFlowCtrl {

    @HttpGet
    global static FlowListResponse getFlows() {
        try {
            List<Integration_Flow__c> flowRecords = [
                SELECT
                    Id,
                    Name,
                    Description__c,
                    Status__c,
                    Diagram_JSON__c,
                    Is_Active__c,
                    CreatedDate,
                    LastModifiedDate
                FROM Integration_Flow__c
                WITH USER_MODE
                ORDER BY Name
            ];

            FlowListResponse response = new FlowListResponse();
            response.totalSize = flowRecords.size();
            response.flows = new List<FlowDefinition>();

            for (Integration_Flow__c flowRecord : flowRecords) {
                FlowDefinition flowDefinition = new FlowDefinition();

                flowDefinition.id = flowRecord.Id;
                flowDefinition.name = flowRecord.Name;
                flowDefinition.description =
                    flowRecord.Description__c;
                flowDefinition.status =
                    flowRecord.Status__c;
                flowDefinition.diagramJson =
                    flowRecord.Diagram_JSON__c;
                flowDefinition.active =
                    flowRecord.Is_Active__c;
                flowDefinition.createdDate =
                    flowRecord.CreatedDate;
                flowDefinition.lastModifiedDate =
                    flowRecord.LastModifiedDate;

                response.flows.add(flowDefinition);
            }

            return response;
        } catch (QueryException e) {
            throw new IntegrationFlowException(
                'Impossible de récupérer les intégrations : ' +
                e.getMessage()
            );
        }
    }

    global class FlowListResponse {
        public Integer totalSize;
        public List<FlowDefinition> flows;
    }

    global class FlowDefinition {
        public Id id;
        public String name;
        public String description;
        public String status;
        public String diagramJson;
        public Boolean active;
        public Datetime createdDate;
        public Datetime lastModifiedDate;
    }

    global class IntegrationFlowException extends Exception {
    }
}