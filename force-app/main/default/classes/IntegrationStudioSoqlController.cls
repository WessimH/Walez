@RestResource(urlMapping='/integration-studio/soql')
global with sharing class IntegrationStudioSoqlController {

    @HttpPost
    global static QueryResponse executeQuery() {
        QueryRequest payload;

        try {
            String rawBody = RestContext.request.requestBody.toString();

            if (
                !String.isBlank(rawBody) &&
                rawBody.startsWith('\uFEFF')
            ) {
                rawBody = rawBody.substring(1);
            }

            payload = (QueryRequest) JSON.deserialize(
                rawBody,
                QueryRequest.class
            );
        } catch (Exception e) {
            throw new QueryApiException(
                'Le contenu de la requête est invalide : ' +
                e.getMessage()
            );
        }

        if (
            payload == null ||
            String.isBlank(payload.query)
        ) {
            throw new QueryApiException(
                'La requête SOQL est obligatoire.'
            );
        }

        String normalizedQuery = payload.query.trim();

        if (
            !normalizedQuery
                .toUpperCase()
                .startsWith('SELECT ')
        ) {
            throw new QueryApiException(
                'Seules les requêtes SELECT sont autorisées.'
            );
        }

        try {
            List<SObject> records = Database.query(
                normalizedQuery,
                AccessLevel.USER_MODE
            );

            QueryResponse result = new QueryResponse();
            result.totalSize = records.size();
            result.done = true;
            result.records = records;

            return result;
        } catch (QueryException e) {
            throw new QueryApiException(
                'Erreur SOQL : ' + e.getMessage()
            );
        }
    }

    global class QueryRequest {
        public String query;
    }

    global class QueryResponse {
        public Integer totalSize;
        public Boolean done;
        public List<SObject> records;
    }

    global class QueryApiException extends Exception {
    }
}
