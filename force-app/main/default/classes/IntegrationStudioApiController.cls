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
            throw new ApiException(
                'Le contenu de la requête est invalide.'
            );
        }

        if (payload == null) {
            throw new ApiException(
                'Le contenu de la requête est vide.'
            );
        }

        return sendRequest(
            payload.method,
            payload.endpoint,
            payload.requestBody,
            payload.requestHeaders
        );
    }

    public static ApiResponse sendRequest(
        String method,
        String endpoint,
        String requestBody
    ) {
        return sendRequest(
            method,
            endpoint,
            requestBody,
            null
        );
    }

    public static ApiResponse sendRequest(
        String method,
        String endpoint,
        String requestBody,
        Map<String, String> requestHeaders
    ) {
        if (String.isBlank(method)) {
            throw new ApiException(
                'La méthode HTTP est obligatoire.'
            );
        }

        if (String.isBlank(endpoint)) {
            throw new ApiException(
                'Le endpoint est obligatoire.'
            );
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
            throw new ApiException(
                'Méthode HTTP non autorisée.'
            );
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

        applyRequestHeaders(
            request,
            requestHeaders
        );

        if (!containsHeader(requestHeaders, 'Accept')) {
            request.setHeader(
                'Accept',
                'application/json'
            );
        }

        if (
            !String.isBlank(requestBody) &&
            methodAllowsBody(normalizedMethod)
        ) {
            if (
                !containsHeader(
                    requestHeaders,
                    'Content-Type'
                )
            ) {
                request.setHeader(
                    'Content-Type',
                    'application/json'
                );
            }

            request.setBody(requestBody);
        }

        try {
            HttpResponse response = new Http().send(request);

            ApiResponse result = new ApiResponse();
            result.statusCode = response.getStatusCode();
            result.status = response.getStatus();
            result.body = response.getBody();
            result.contentType = response.getHeader(
                'Content-Type'
            );

            return result;
        } catch (CalloutException e) {
            throw new ApiException(
                'Échec du callout : ' + e.getMessage()
            );
        }
    }

    private static void applyRequestHeaders(
        HttpRequest request,
        Map<String, String> requestHeaders
    ) {
        if (requestHeaders == null) {
            return;
        }

        Set<String> protectedHeaders = new Set<String>{
            'authorization',
            'host',
            'content-length'
        };

        for (String headerName : requestHeaders.keySet()) {
            if (String.isBlank(headerName)) {
                continue;
            }

            String normalizedHeaderName =
                headerName.trim();

            String normalizedHeaderNameLower =
                normalizedHeaderName.toLowerCase();

            if (
                protectedHeaders.contains(
                    normalizedHeaderNameLower
                )
            ) {
                continue;
            }

            String headerValue =
                requestHeaders.get(headerName);

            if (headerValue == null) {
                continue;
            }

            request.setHeader(
                normalizedHeaderName,
                headerValue
            );
        }
    }

    private static Boolean containsHeader(
        Map<String, String> requestHeaders,
        String expectedHeaderName
    ) {
        if (
            requestHeaders == null ||
            String.isBlank(expectedHeaderName)
        ) {
            return false;
        }

        for (String headerName : requestHeaders.keySet()) {
            if (
                !String.isBlank(headerName) &&
                headerName.trim().equalsIgnoreCase(
                    expectedHeaderName
                )
            ) {
                return true;
            }
        }

        return false;
    }

    private static Boolean methodAllowsBody(
        String method
    ) {
        return new Set<String>{
            'POST',
            'PUT',
            'PATCH'
        }.contains(method);
    }

    global class RequestPayload {
        public String method;
        public String endpoint;
        public String requestBody;
        public Map<String, String> requestHeaders;
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