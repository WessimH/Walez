public without sharing class IntegrationStudioRuntimeService {

    private static final Set<String> ALLOWED_STATUSES =
        new Set<String>{'running', 'success', 'error', 'unknown'};

    public class RuntimeInput {
        public Id flowId;
        public String flowName;
        public String edgeId;
        public String status;
        public Datetime startedAt;
        public Datetime endedAt;
        public Long durationMs;
        public String correlationId;
        public String errorMessage;
        public String detailsJson;
    }

    public static String enrichDiagramJson(
        Id flowId,
        String diagramJson
    ) {
        if (flowId == null || String.isBlank(diagramJson)) {
            return diagramJson;
        }

        Map<String, Object> diagram;

        try {
            diagram = (Map<String, Object>) JSON.deserializeUntyped(
                diagramJson
            );
        } catch (Exception ignored) {
            return diagramJson;
        }

        List<Object> edges = (List<Object>) diagram.get('edges');

        if (edges == null || edges.isEmpty()) {
            return diagramJson;
        }

        Set<String> edgeIds = new Set<String>();

        for (Object edgeObject : edges) {
            Map<String, Object> edge =
                (Map<String, Object>) edgeObject;

            String edgeId = (String) edge.get('id');

            if (String.isNotBlank(edgeId)) {
                edgeIds.add(edgeId);
            }
        }

        if (edgeIds.isEmpty()) {
            return diagramJson;
        }

        Map<String, Integration_Execution_Log__c> latestLogByEdge =
            getLatestLogs(flowId, edgeIds);

        for (Object edgeObject : edges) {
            Map<String, Object> edge =
                (Map<String, Object>) edgeObject;

            String edgeId = (String) edge.get('id');
            Map<String, Object> data = getOrCreateData(edge);

            clearRuntimeFields(data);

            Integration_Execution_Log__c runtimeLog =
                latestLogByEdge.get(edgeId);

            if (runtimeLog == null) {
                data.put('status', 'unknown');
                edge.put('data', data);
                continue;
            }

            data.put(
                'status',
                normalizeStatus(runtimeLog.Status__c)
            );

            Datetime lastExecutionDate =
                runtimeLog.Ended_At__c != null
                    ? runtimeLog.Ended_At__c
                    : runtimeLog.Started_At__c;

            if (lastExecutionDate == null) {
                lastExecutionDate = runtimeLog.CreatedDate;
            }

            if (lastExecutionDate != null) {
                data.put(
                    'lastExecutionDate',
                    formatIso(lastExecutionDate)
                );
            }

            Long durationMs = calculateDuration(runtimeLog);

            if (durationMs != null) {
                data.put('durationMs', durationMs);
            }

            if (String.isNotBlank(runtimeLog.Correlation_Id__c)) {
                data.put(
                    'correlationId',
                    runtimeLog.Correlation_Id__c
                );
            }

            if (String.isNotBlank(runtimeLog.Error_Message__c)) {
                data.put(
                    'errorMessage',
                    runtimeLog.Error_Message__c
                );
            }

            edge.put('data', data);
        }

        return JSON.serialize(diagram);
    }

    public static Integration_Execution_Log__c recordExecution(
        RuntimeInput input
    ) {
        validateInput(input);

        Id resolvedFlowId = resolveFlowId(input);
        Datetime startedAt =
            input.startedAt == null
                ? System.now()
                : input.startedAt;

        Integration_Execution_Log__c executionLog =
            new Integration_Execution_Log__c(
                Integration_Flow__c = resolvedFlowId,
                Edge_Id__c = input.edgeId.trim(),
                Status__c = toPicklistStatus(input.status),
                Started_At__c = startedAt,
                Ended_At__c = input.endedAt,
                Duration_Ms__c = input.durationMs,
                Correlation_Id__c = input.correlationId,
                Error_Message__c = input.errorMessage,
                Details_JSON__c = input.detailsJson
            );

        if (
            executionLog.Duration_Ms__c == null &&
            executionLog.Started_At__c != null &&
            executionLog.Ended_At__c != null
        ) {
            executionLog.Duration_Ms__c =
                executionLog.Ended_At__c.getTime() -
                executionLog.Started_At__c.getTime();
        }

        insert executionLog;
        return executionLog;
    }

    private static Map<String, Integration_Execution_Log__c>
        getLatestLogs(
            Id flowId,
            Set<String> edgeIds
        ) {
        Map<String, Integration_Execution_Log__c> result =
            new Map<String, Integration_Execution_Log__c>();

        for (Integration_Execution_Log__c currentLog : [
            SELECT
                Id,
                Edge_Id__c,
                Status__c,
                Started_At__c,
                Ended_At__c,
                Duration_Ms__c,
                Correlation_Id__c,
                Error_Message__c,
                CreatedDate
            FROM Integration_Execution_Log__c
            WHERE
                Integration_Flow__c = :flowId
                AND Edge_Id__c IN :edgeIds
            ORDER BY CreatedDate DESC
            LIMIT 2000
        ]) {
            if (!result.containsKey(currentLog.Edge_Id__c)) {
                result.put(currentLog.Edge_Id__c, currentLog);
            }
        }

        return result;
    }

    private static Map<String, Object> getOrCreateData(
        Map<String, Object> edge
    ) {
        Object rawData = edge.get('data');

        if (rawData instanceof Map<String, Object>) {
            return (Map<String, Object>) rawData;
        }

        return new Map<String, Object>();
    }

    private static void clearRuntimeFields(
        Map<String, Object> data
    ) {
        data.remove('status');
        data.remove('lastExecutionDate');
        data.remove('durationMs');
        data.remove('correlationId');
        data.remove('errorMessage');
    }

    private static Long calculateDuration(
        Integration_Execution_Log__c runtimeLog
    ) {
        if (runtimeLog.Duration_Ms__c != null) {
            return runtimeLog.Duration_Ms__c.longValue();
        }

        if (
            runtimeLog.Started_At__c != null &&
            runtimeLog.Ended_At__c != null
        ) {
            return runtimeLog.Ended_At__c.getTime() -
                runtimeLog.Started_At__c.getTime();
        }

        return null;
    }

    private static String normalizeStatus(String status) {
        String normalized = String.isBlank(status)
            ? 'unknown'
            : status.trim().toLowerCase();

        return ALLOWED_STATUSES.contains(normalized)
            ? normalized
            : 'unknown';
    }

    private static String toPicklistStatus(String status) {
        String normalized = normalizeStatus(status);

        if (normalized == 'success') {
            return 'Success';
        }

        if (normalized == 'error') {
            return 'Error';
        }

        if (normalized == 'unknown') {
            return 'Unknown';
        }

        return 'Running';
    }

    private static String formatIso(Datetime value) {
        return value.formatGmt(
            'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\''
        );
    }

    private static Id resolveFlowId(RuntimeInput input) {
        if (input.flowId != null) {
            return input.flowId;
        }

        if (String.isBlank(input.flowName)) {
            throw new IllegalArgumentException(
                'flowId ou flowName est obligatoire.'
            );
        }

        String normalizedFlowName = input.flowName.trim();

        System.debug(
            '### FLOW NAME RECEIVED => [' +
            input.flowName +
            '] length=' +
            input.flowName.length()
        );

        List<Integration_Flow__c> availableFlows = [
            SELECT
                Id,
                Name,
                Is_Active__c,
                Status__c,
                LastModifiedDate
            FROM Integration_Flow__c
            ORDER BY LastModifiedDate DESC
        ];

        for (Integration_Flow__c currentFlow : availableFlows) {
            if (
                String.isNotBlank(currentFlow.Name) &&
                currentFlow.Name
                    .trim()
                    .equalsIgnoreCase(normalizedFlowName)
            ) {
                return currentFlow.Id;
            }
        }

        throw new IllegalArgumentException(
            'Aucun flux trouvé pour : [' +
            input.flowName +
            '] longueur=' +
            String.valueOf(input.flowName.length())
        );
    }

    private static void validateInput(RuntimeInput input) {
        if (input == null) {
            throw new IllegalArgumentException(
                'Le payload est obligatoire.'
            );
        }

        if (String.isBlank(input.edgeId)) {
            throw new IllegalArgumentException(
                'edgeId est obligatoire.'
            );
        }

        if (
            input.flowId == null &&
            String.isBlank(input.flowName)
        ) {
            throw new IllegalArgumentException(
                'flowId ou flowName est obligatoire.'
            );
        }

        if (
            input.durationMs != null &&
            input.durationMs < 0
        ) {
            throw new IllegalArgumentException(
                'durationMs ne peut pas être négatif.'
            );
        }
    }
}
