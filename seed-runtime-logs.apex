Integration_Flow__c flowRecord = [
    SELECT Id
    FROM Integration_Flow__c
    WHERE Name = 'Aurelian Order Reservation'
    ORDER BY LastModifiedDate DESC
    LIMIT 1
];

Datetime nowValue = System.now();
String correlationId =
    'AUR-' + String.valueOf(nowValue.getTime());

insert new List<Integration_Execution_Log__c>{
    new Integration_Execution_Log__c(
        Integration_Flow__c = flowRecord.Id,
        Edge_Id__c = 'salesforce-apex',
        Status__c = 'Success',
        Started_At__c = nowValue.addSeconds(-1),
        Ended_At__c = nowValue,
        Duration_Ms__c = 125,
        Correlation_Id__c = correlationId
    ),
    new Integration_Execution_Log__c(
        Integration_Flow__c = flowRecord.Id,
        Edge_Id__c = 'apex-platform-event',
        Status__c = 'Success',
        Started_At__c = nowValue.addSeconds(-1),
        Ended_At__c = nowValue,
        Duration_Ms__c = 95,
        Correlation_Id__c = correlationId
    ),
    new Integration_Execution_Log__c(
        Integration_Flow__c = flowRecord.Id,
        Edge_Id__c = 'platform-event-mulesoft',
        Status__c = 'Success',
        Started_At__c = nowValue.addSeconds(-1),
        Ended_At__c = nowValue,
        Duration_Ms__c = 480,
        Correlation_Id__c = correlationId
    ),
    new Integration_Execution_Log__c(
        Integration_Flow__c = flowRecord.Id,
        Edge_Id__c = 'mulesoft-erp',
        Status__c = 'Success',
        Started_At__c = nowValue.addSeconds(-1),
        Ended_At__c = nowValue,
        Duration_Ms__c = 860,
        Correlation_Id__c = correlationId
    )
};

System.debug('Runtime logs créés : ' + correlationId);
