String responseBody = JSON.serialize(
    new Map<String, Object>{
        'status' => 'CONFIRMED',
        'correlationId' => 'TEST-APEX-RUNTIME-001',
        'runtimeSteps' => new List<Object>{
            new Map<String, Object>{
                'edgeId' => 'mulesoft-erp',
                'status' => 'Success',
                'durationMs' => 118
            },
            new Map<String, Object>{
                'edgeId' => 'erp-mulesoft',
                'status' => 'Success',
                'durationMs' => 118
            }
        }
    }
);

AurelianAvailabilityService.testRecordRuntimeSteps(
    responseBody,
    'TEST-APEX-RUNTIME-001'
);