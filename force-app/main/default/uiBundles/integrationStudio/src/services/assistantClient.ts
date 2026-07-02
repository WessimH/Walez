import { createDataSDK } from "@salesforce/platform-sdk";

export type AssistantContext = {
  capabilities: string[];
  page: string;
  path: string;
  safety: string[];
  tool: string;
};

export type AssistantAnswer = {
  answer: string;
  model: string;
  requestId: string;
  stopReason: string;
};

export async function askAssistant(
  question: string,
  context: AssistantContext
): Promise<AssistantAnswer> {
  const dataSdk = await createDataSDK();

  if (!dataSdk.fetch) {
    throw new Error(
      "Le service Fetch du Salesforce Platform SDK n’est pas disponible."
    );
  }

  const response = await dataSdk.fetch(
    "/services/apexrest/integration-studio/assistant",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        question,
        context
      })
    }
  );

  const rawResponse = await response.text();

  if (!response.ok) {
    throw new Error(
      rawResponse ||
        `Assistant IA indisponible (${response.status}).`
    );
  }

  return JSON.parse(rawResponse) as AssistantAnswer;
}
