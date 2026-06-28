@RestResource(urlMapping='/integration-studio/named-credentials')
global with sharing class IntegrationStudioNamedCredCtrl {

    @HttpGet
    global static String getNamedCredentials() {
        try {
            ConnectApi.NamedCredentialList credentialList =
                ConnectApi.NamedCredentials.getNamedCredentials();

            return JSON.serialize(
                credentialList.namedCredentials
            );
        } catch (Exception e) {
            throw new NamedCredentialApiException(
                'Impossible de récupérer les Named Credentials : ' +
                e.getMessage()
            );
        }
    }

    global class NamedCredentialApiException extends Exception {
    }
}