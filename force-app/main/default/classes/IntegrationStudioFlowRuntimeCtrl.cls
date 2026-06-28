@RestResource(urlMapping='/integration-studio/flows-runtime/*')
global with sharing class IntegrationStudioFlowRuntimeCtrl {

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

    global class NodePositionInput {
        public String id;
        public Decimal x;
        public Decimal y;
    }

    global class LayoutUpdateRequest {
        public Id flowId;
        public List<NodePositionInput> nodes;
    }

    global class LayoutUpdateResponse {
        public Boolean success;
        public Integer updatedNodes;
        public Datetime savedAt;
    }

    @HttpGet
    global static FlowListResponse getFlows() {
        List<Integration_Flow__c> records = [
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
            ORDER BY Name
        ];

        FlowListResponse response = new FlowListResponse();
        response.totalSize = records.size();
        response.flows = new List<FlowDefinition>();

        for (Integration_Flow__c currentFlow : records) {
            FlowDefinition definition = new FlowDefinition();
            definition.id = currentFlow.Id;
            definition.name = currentFlow.Name;
            definition.description = currentFlow.Description__c;
            definition.status = currentFlow.Status__c;
            definition.diagramJson =
                IntegrationStudioRuntimeService.enrichDiagramJson(
                    currentFlow.Id,
                    currentFlow.Diagram_JSON__c
                );
            definition.active = currentFlow.Is_Active__c;
            definition.createdDate = currentFlow.CreatedDate;
            definition.lastModifiedDate =
                currentFlow.LastModifiedDate;

            response.flows.add(definition);
        }

        return response;
    }

    @HttpPatch
    global static LayoutUpdateResponse updateLayout() {
        RestRequest restRequest = RestContext.request;

        if (
            restRequest == null ||
            restRequest.requestBody == null ||
            String.isBlank(restRequest.requestBody.toString())
        ) {
            throw new IllegalArgumentException(
                'Le payload de disposition est obligatoire.'
            );
        }

        LayoutUpdateRequest layoutRequest =
            (LayoutUpdateRequest) JSON.deserialize(
                restRequest.requestBody.toString(),
                LayoutUpdateRequest.class
            );

        validateLayoutRequest(layoutRequest);

        Integration_Flow__c flowRecord = [
            SELECT Id, Diagram_JSON__c
            FROM Integration_Flow__c
            WHERE Id = :layoutRequest.flowId
            LIMIT 1
        ];

        if (String.isBlank(flowRecord.Diagram_JSON__c)) {
            throw new IllegalArgumentException(
                'Le diagramme du flux est vide.'
            );
        }

        Map<String, Object> diagram;

        try {
            diagram =
                (Map<String, Object>) JSON.deserializeUntyped(
                    flowRecord.Diagram_JSON__c
                );
        } catch (Exception parsingException) {
            throw new IllegalArgumentException(
                'Le Diagram JSON enregistré est invalide.'
            );
        }

        List<Object> diagramNodes =
            (List<Object>) diagram.get('nodes');

        if (diagramNodes == null || diagramNodes.isEmpty()) {
            throw new IllegalArgumentException(
                'Le diagramme ne contient aucun nœud.'
            );
        }

        Map<String, NodePositionInput> positionByNodeId =
            new Map<String, NodePositionInput>();

        for (NodePositionInput nodePosition : layoutRequest.nodes) {
            positionByNodeId.put(
                nodePosition.id.trim(),
                nodePosition
            );
        }

        Integer updatedNodes = 0;

        for (Object nodeObject : diagramNodes) {
            Map<String, Object> diagramNode =
                (Map<String, Object>) nodeObject;

            String nodeId = (String) diagramNode.get('id');

            if (
                String.isBlank(nodeId) ||
                !positionByNodeId.containsKey(nodeId)
            ) {
                continue;
            }

            NodePositionInput requestedPosition =
                positionByNodeId.get(nodeId);

            Map<String, Object> position =
                new Map<String, Object>{
                    'x' => requestedPosition.x,
                    'y' => requestedPosition.y
                };

            diagramNode.put('position', position);
            updatedNodes++;
        }

        if (updatedNodes == 0) {
            throw new IllegalArgumentException(
                'Aucun nœud correspondant n’a été trouvé.'
            );
        }

        flowRecord.Diagram_JSON__c = JSON.serialize(diagram);
        update flowRecord;

        LayoutUpdateResponse response =
            new LayoutUpdateResponse();

        response.success = true;
        response.updatedNodes = updatedNodes;
        response.savedAt = System.now();

        return response;
    }

    private static void validateLayoutRequest(
        LayoutUpdateRequest layoutRequest
    ) {
        if (layoutRequest == null) {
            throw new IllegalArgumentException(
                'Le payload de disposition est invalide.'
            );
        }

        if (layoutRequest.flowId == null) {
            throw new IllegalArgumentException(
                'flowId est obligatoire.'
            );
        }

        if (
            layoutRequest.nodes == null ||
            layoutRequest.nodes.isEmpty()
        ) {
            throw new IllegalArgumentException(
                'Au moins une position de nœud est obligatoire.'
            );
        }

        Set<String> receivedNodeIds = new Set<String>();

        for (NodePositionInput nodePosition : layoutRequest.nodes) {
            if (
                nodePosition == null ||
                String.isBlank(nodePosition.id)
            ) {
                throw new IllegalArgumentException(
                    'Chaque position doit contenir un identifiant de nœud.'
                );
            }

            if (
                nodePosition.x == null ||
                nodePosition.y == null
            ) {
                throw new IllegalArgumentException(
                    'Les coordonnées x et y sont obligatoires.'
                );
            }

            String normalizedNodeId =
                nodePosition.id.trim();

            if (receivedNodeIds.contains(normalizedNodeId)) {
                throw new IllegalArgumentException(
                    'Position dupliquée pour le nœud : ' +
                    normalizedNodeId
                );
            }

            receivedNodeIds.add(normalizedNodeId);
        }
    }
}
