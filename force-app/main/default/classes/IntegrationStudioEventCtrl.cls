@RestResource(urlMapping='/integration-studio/events/*')
global with sharing class IntegrationStudioEventCtrl {

    @HttpGet
    global static EventListResponse getEvents() {
        EventListResponse response = new EventListResponse();
        response.events = new List<EventDefinition>();

        Map<String, Schema.SObjectType> globalDescribe =
            Schema.getGlobalDescribe();

        for (String objectName : globalDescribe.keySet()) {
            if (!objectName.endsWith('__e')) {
                continue;
            }

            Schema.DescribeSObjectResult objectDescribe =
                globalDescribe.get(objectName).getDescribe();

            if (!objectDescribe.isAccessible()) {
                continue;
            }

            EventDefinition eventDefinition =
                new EventDefinition();

            eventDefinition.apiName = objectName;
            eventDefinition.label = objectDescribe.getLabel();
            eventDefinition.labelPlural =
                objectDescribe.getLabelPlural();
            eventDefinition.fields =
                new List<EventFieldDefinition>();

            Map<String, Schema.SObjectField> fields =
                objectDescribe.fields.getMap();

            for (String fieldName : fields.keySet()) {
                Schema.DescribeFieldResult fieldDescribe =
                    fields.get(fieldName).getDescribe();

                if (!fieldDescribe.isAccessible()) {
                    continue;
                }

                EventFieldDefinition fieldDefinition =
                    new EventFieldDefinition();

                fieldDefinition.apiName = fieldName;
                fieldDefinition.label =
                    fieldDescribe.getLabel();
                fieldDefinition.type =
                    String.valueOf(fieldDescribe.getType());
                fieldDefinition.required =
                    !fieldDescribe.isNillable() &&
                    !fieldDescribe.isDefaultedOnCreate();
                fieldDefinition.createable =
                    fieldDescribe.isCreateable();
                fieldDefinition.length =
                    fieldDescribe.getLength();

                eventDefinition.fields.add(
                    fieldDefinition
                );
            }

            eventDefinition.fields.sort();

            response.events.add(eventDefinition);
        }

        response.events.sort();
        response.totalSize = response.events.size();

        return response;
    }

    @HttpPost
global static PublishResponse publishEvent() {
    String eventApiName;
    Map<String, Object> values = new Map<String, Object>();

    try {
        String rawBody =
            RestContext.request.requestBody == null
                ? null
                : RestContext.request.requestBody.toString();

        if (String.isBlank(rawBody)) {
            throw new EventApiException(
                'Le contenu de la requête est vide.'
            );
        }

        if (rawBody.startsWith('\uFEFF')) {
            rawBody = rawBody.substring(1);
        }

        Map<String, Object> payload =
            (Map<String, Object>) JSON.deserializeUntyped(
                rawBody
            );

        eventApiName =
            payload.get('eventApiName') == null
                ? null
                : String.valueOf(
                    payload.get('eventApiName')
                );

        Object rawValues = payload.get('values');

        if (rawValues instanceof Map<String, Object>) {
            values =
                (Map<String, Object>) rawValues;
        }
    } catch (EventApiException e) {
        throw e;
    } catch (Exception e) {
        throw new EventApiException(
            'Le contenu de la requête est invalide : ' +
            e.getMessage()
        );
    }

    if (String.isBlank(eventApiName)) {
        throw new EventApiException(
            'Le nom API du Platform Event est obligatoire.'
        );
    }

    eventApiName = eventApiName.trim();

        if (!eventApiName.endsWith('__e')) {
            throw new EventApiException(
                'L’objet sélectionné n’est pas un Platform Event.'
            );
        }

        Map<String, Schema.SObjectType> globalDescribe =
            Schema.getGlobalDescribe();

        if (!globalDescribe.containsKey(eventApiName)) {
            throw new EventApiException(
                'Platform Event introuvable : ' +
                eventApiName
            );
        }

        Schema.SObjectType eventType =
            globalDescribe.get(eventApiName);

        Schema.DescribeSObjectResult eventDescribe =
            eventType.getDescribe();

        if (!eventDescribe.isCreateable()) {
            throw new EventApiException(
                'Vous ne disposez pas des droits nécessaires pour publier cet événement.'
            );
        }

        SObject eventRecord =
            eventType.newSObject();

        Map<String, Schema.SObjectField> fields =
            eventDescribe.fields.getMap();

        if (!values.isEmpty()) {
            for (String fieldName : values.keySet()) {
                if (!fields.containsKey(fieldName)) {
                    throw new EventApiException(
                        'Champ inconnu : ' + fieldName
                    );
                }

                Schema.DescribeFieldResult fieldDescribe =
                    fields.get(fieldName).getDescribe();

                if (!fieldDescribe.isCreateable()) {
                    continue;
                }

                Object rawValue =
                    values.get(fieldName);

                if (rawValue == null) {
                    continue;
                }

                try {
                    eventRecord.put(
                        fieldName,
                        convertValue(
                            rawValue,
                            fieldDescribe.getType()
                        )
                    );
                } catch (Exception e) {
                    throw new EventApiException(
                        'Valeur invalide pour le champ ' +
                        fieldName +
                        ' : ' +
                        e.getMessage()
                    );
                }
            }
        }

        Database.SaveResult publishResult =
            EventBus.publish(eventRecord);

        PublishResponse response =
            new PublishResponse();

        response.eventApiName = eventApiName;
        response.accepted = publishResult.isSuccess();
        response.recordId =
            publishResult.getId();
        response.errors = new List<String>();

        if (!publishResult.isSuccess()) {
            for (
                Database.Error publishError :
                publishResult.getErrors()
            ) {
                response.errors.add(
                    publishError.getStatusCode() +
                    ' - ' +
                    publishError.getMessage()
                );
            }
        }

        return response;
    }

    private static Object convertValue(
        Object rawValue,
        Schema.DisplayType fieldType
    ) {
        String value = String.valueOf(rawValue);

        if (String.isBlank(value)) {
            return null;
        }

        if (fieldType == Schema.DisplayType.Boolean) {
            return Boolean.valueOf(value);
        }

        if (fieldType == Schema.DisplayType.Integer) {
            return Integer.valueOf(value);
        }

        if (fieldType == Schema.DisplayType.Long) {
            return Long.valueOf(value);
        }

        if (
            fieldType == Schema.DisplayType.Double ||
            fieldType == Schema.DisplayType.Currency ||
            fieldType == Schema.DisplayType.Percent
        ) {
            return Decimal.valueOf(value);
        }

        if (fieldType == Schema.DisplayType.Date) {
            return Date.valueOf(value);
        }

        if (fieldType == Schema.DisplayType.DateTime) {
            return Datetime.valueOf(value);
        }

        return value;
    }

    global class PublishRequest {
        public String eventApiName;
        public Map<String, Object> values;
    }

    global class PublishResponse {
        public String eventApiName;
        public Boolean accepted;
        public Id recordId;
        public List<String> errors;
    }

    global class EventListResponse {
        public Integer totalSize;
        public List<EventDefinition> events;
    }

    global class EventDefinition
        implements Comparable {

        public String apiName;
        public String label;
        public String labelPlural;
        public List<EventFieldDefinition> fields;

        global Integer compareTo(Object otherValue) {
            EventDefinition otherEvent =
                (EventDefinition) otherValue;

            return apiName.compareTo(
                otherEvent.apiName
            );
        }
    }

    global class EventFieldDefinition
        implements Comparable {

        public String apiName;
        public String label;
        public String type;
        public Boolean required;
        public Boolean createable;
        public Integer length;

        global Integer compareTo(Object otherValue) {
            EventFieldDefinition otherField =
                (EventFieldDefinition) otherValue;

            return apiName.compareTo(
                otherField.apiName
            );
        }
    }

    global class EventApiException extends Exception {
    }
}