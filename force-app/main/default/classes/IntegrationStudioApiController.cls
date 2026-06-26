@RestResource(urlMapping='/integration-studio/api')
global with sharing class IntegrationStudioApiController {

    @HttpPost
    global static ApiResponse handleRequest() {
        RequestPayload payload;

        try {
            payload = (RequestPayload) JSON.deserialize(
                RestContext.request.requestBody.toString(),
                RequestPayload.class
            );
        } catch (Exception e) {
            throw new ApiException('Le contenu de la requête est invalide.');
        }

        return sendRequest(
            payload.method,
            payload.endpoint,
            payload.requestBody
        );
    }

    public static ApiResponse sendRequest(
        String method,
        String endpoint,
        String requestBody
    ) {
        if (String.isBlank(method)) {
            throw new ApiException('La méthode HTTP est obligatoire.');
        }

        if (String.isBlank(endpoint)) {
            throw new ApiException('Le endpoint est obligatoire.');
        }

        String normalizedMethod = method.trim().toUpperCase();
        String normalizedEndpoint = endpoint.trim();

        Set<String> allowedMethods = new Set<String>{
            'GET',
            'POST',
            'PUT',
            'PATCH',
            'DELETE'
        };

        if (!allowedMethods.contains(normalizedMethod)) {
            throw new ApiException('Méthode HTTP non autorisée.');
        }

        if (!normalizedEndpoint.startsWith('/')) {
            normalizedEndpoint = '/' + normalizedEndpoint;
        }

        HttpRequest request = new HttpRequest();
        request.setEndpoint(
            'callout:REST_Countries' + normalizedEndpoint
        );
        request.setMethod(normalizedMethod);
        request.setTimeout(30000);
        request.setHeader('Accept', 'application/json');

        if (
            !String.isBlank(requestBody) &&
            new Set<String>{ 'POST', 'PUT', 'PATCH' }
                .contains(normalizedMethod)
        ) {
            request.setHeader('Content-Type', 'application/json');
            request.setBody(requestBody);
        }

        try {
            HttpResponse response = new Http().send(request);

            ApiResponse result = new ApiResponse();
            result.statusCode = response.getStatusCode();
            result.status = response.getStatus();
            result.body = response.getBody();
            result.contentType = response.getHeader('Content-Type');

            return result;

        } catch (CalloutException e) {
            throw new ApiException(
                'Échec du callout : ' + e.getMessage()
            );
        }
    }

    global class RequestPayload {
        public String method;
        public String endpoint;
        public String requestBody;
    }

    global class ApiResponse {
        public Integer statusCode;
        public String status;
        public String body;
        public String contentType;
    }

    global class ApiException extends Exception {
    }
}