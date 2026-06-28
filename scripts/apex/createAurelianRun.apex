Integration_Flow__c flowRecord = [
    SELECT Id
    FROM Integration_Flow__c
    WHERE Name = 'Aurelian Order Reservation'
    LIMIT 1
];

Datetime startedAt = Datetime.now().addSeconds(-5);
Datetime finishedAt = Datetime.now();

Integration_Run__c integrationRun = new Integration_Run__c(
    Integration_Flow__c = flowRecord.Id,
    Status__c = 'SUCCESS',
    Correlation_Id__c = 'AURELIAN-' + String.valueOf(Datetime.now().getTime()),
    Started_At__c = startedAt,
    Finished_At__c = finishedAt,
    Duration_Ms__c = 5000
);

insert integrationRun;

List<Integration_Run_Step__c> steps =
    new List<Integration_Run_Step__c>{
        new Integration_Run_Step__c(
            Integration_Run__c = integrationRun.Id,
            Node_Key__c = 'salesforce-apex',
            Status__c = 'SUCCESS',
            Sequence__c = 1,
            Started_At__c = startedAt,
            Finished_At__c = startedAt.addSeconds(1),
            Duration_Ms__c = 1000,
            Request_Payload__c =
                '{"action":"createReservation","sku":"AUR-001","quantity":1}',
            Response_Payload__c =
                '{"status":"VALIDATED"}'
        ),
        new Integration_Run_Step__c(
            Integration_Run__c = integrationRun.Id,
            Node_Key__c = 'apex-mulesoft',
            Status__c = 'SUCCESS',
            Sequence__c = 2,
            Started_At__c = startedAt.addSeconds(1),
            Finished_At__c = startedAt.addSeconds(2),
            Duration_Ms__c = 1000,
            Request_Payload__c =
                '{"event":"Warehouse_Order_Request__e"}',
            Response_Payload__c =
                '{"status":"RECEIVED"}'
        ),
        new Integration_Run_Step__c(
            Integration_Run__c = integrationRun.Id,
            Node_Key__c = 'mulesoft-erp',
            Status__c = 'SUCCESS',
            Sequence__c = 3,
            Started_At__c = startedAt.addSeconds(2),
            Finished_At__c = startedAt.addSeconds(3),
            Duration_Ms__c = 1000,
            Request_Payload__c =
                '{"order":"SO-AURELIAN","sku":"AUR-001","quantity":1}',
            Response_Payload__c =
                '{"orderCreated":true,"stockDecremented":true}'
        ),
        new Integration_Run_Step__c(
            Integration_Run__c = integrationRun.Id,
            Node_Key__c = 'erp-mulesoft',
            Status__c = 'SUCCESS',
            Sequence__c = 4,
            Started_At__c = startedAt.addSeconds(3),
            Finished_At__c = startedAt.addSeconds(4),
            Duration_Ms__c = 1000,
            Request_Payload__c =
                '{"orderStatus":"CONFIRMED"}',
            Response_Payload__c =
                '{"status":"PROCESSED"}'
        ),
        new Integration_Run_Step__c(
            Integration_Run__c = integrationRun.Id,
            Node_Key__c = 'mulesoft-salesforce',
            Status__c = 'SUCCESS',
            Sequence__c = 5,
            Started_At__c = startedAt.addSeconds(4),
            Finished_At__c = finishedAt,
            Duration_Ms__c = 1000,
            Request_Payload__c =
                '{"reservationStatus":"CONFIRMED"}',
            Response_Payload__c =
                '{"salesforceUpdated":true}'
        )
    };

insert steps;

System.debug(
    'Run créé : ' + integrationRun.Id +
    ' | Étapes créées : ' + steps.size()
);