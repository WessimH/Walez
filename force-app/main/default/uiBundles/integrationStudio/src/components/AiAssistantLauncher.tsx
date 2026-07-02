import { useMemo, useState } from "react";
import {
  Bot,
  LoaderCircle,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  X
} from "lucide-react";
import { useLocation, useMatches } from "react-router";
import {
  askAssistant,
  type AssistantContext
} from "../services/assistantClient";

type ChatMessage = {
  id: number;
  role: "assistant" | "user";
  text: string;
};

type PageContextConfig = {
  capabilities: string[];
  page: string;
  tool: string;
};

const PAGE_CONTEXT: Record<string, PageContextConfig> = {
  "/": {
    capabilities: [
      "Présenter les outils disponibles",
      "Orienter vers le bon module"
    ],
    page: "Home",
    tool: "Accueil"
  },
  "/api-tester": {
    capabilities: [
      "Tester des endpoints REST",
      "Préparer headers et payloads",
      "Analyser un statut HTTP"
    ],
    page: "API Tester",
    tool: "Test API"
  },
  "/json-formatter": {
    capabilities: [
      "Formater du JSON",
      "Minifier du JSON",
      "Diagnostiquer une erreur de syntaxe"
    ],
    page: "JSON Formatter",
    tool: "JSON"
  },
  "/apex-dto": {
    capabilities: [
      "Générer des DTO Apex",
      "Expliquer le mapping JSON vers Apex",
      "Aider à nommer les classes"
    ],
    page: "Apex DTO Generator",
    tool: "DTO Apex"
  },
  "/soql-builder": {
    capabilities: [
      "Construire une requête SOQL",
      "Aider à choisir des filtres",
      "Expliquer les résultats d'une requête"
    ],
    page: "SOQL Builder",
    tool: "SOQL"
  },
  "/named-credentials": {
    capabilities: [
      "Expliquer une configuration Named Credential",
      "Aider au diagnostic de callout",
      "Rappeler les bonnes pratiques de sécurité"
    ],
    page: "Named Credentials",
    tool: "Named Credentials"
  },
  "/platform-events": {
    capabilities: [
      "Expliquer les champs d'un Platform Event",
      "Aider à préparer un payload",
      "Diagnostiquer une publication d'événement"
    ],
    page: "Platform Events",
    tool: "Platform Events"
  },
  "/integration-flows": {
    capabilities: [
      "Expliquer un flux d'intégration",
      "Analyser les statuts runtime",
      "Aider à diagnostiquer une étape en erreur"
    ],
    page: "Integration Flows",
    tool: "Flow Visualizer"
  },
  "/settings": {
    capabilities: [
      "Expliquer les préférences locales",
      "Aider à configurer l'interface"
    ],
    page: "Settings",
    tool: "Paramètres"
  }
};

function getRouteLabel(matches: ReturnType<typeof useMatches>) {
  const labeledMatch = [...matches].reverse().find((match) => {
    const handle = match.handle as
      | {
          label?: unknown;
        }
      | undefined;

    return typeof handle?.label === "string";
  });

  const handle = labeledMatch?.handle as
    | {
        label?: string;
      }
    | undefined;

  return handle?.label;
}

function buildAssistantContext(
  pathname: string,
  routeLabel?: string
): AssistantContext {
  const pageConfig =
    PAGE_CONTEXT[pathname] ??
    PAGE_CONTEXT[
      pathname.replace(/\/+$/, "") || "/"
    ] ??
    {
      capabilities: [
        "Aider à comprendre l'écran courant",
        "Proposer une prochaine action sûre"
      ],
      page: routeLabel ?? "Page inconnue",
      tool: "Integration Studio"
    };

  return {
    capabilities: pageConfig.capabilities,
    page: routeLabel ?? pageConfig.page,
    path: pathname,
    safety: [
      "Contexte limité à la route et aux capacités connues",
      "Aucun secret ni contenu DOM brut n'est envoyé",
      "Le backend traite le contexte comme non fiable"
    ],
    tool: pageConfig.tool
  };
}

export default function AiAssistantLauncher() {
  const location = useLocation();
  const matches = useMatches();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      text:
        "Salut, je suis l’assistant IA d’Integration Studio. Je prends en compte la page courante, sans envoyer de secrets ni le contenu complet de l’écran."
    }
  ]);

  const context = useMemo(
    () =>
      buildAssistantContext(
        location.pathname,
        getRouteLabel(matches)
      ),
    [location.pathname, matches]
  );

  async function sendQuestion() {
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || loading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      text: trimmedQuestion
    };

    setMessages((currentMessages) => [
      ...currentMessages,
      userMessage
    ]);
    setQuestion("");
    setError("");
    setLoading(true);

    try {
      const result = await askAssistant(
        trimmedQuestion,
        context
      );

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: Date.now() + 1,
          role: "assistant",
          text: result.answer
        }
      ]);
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : "Impossible de contacter l’assistant IA."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-white/70 bg-gradient-to-br from-blue-500 via-sky-400 to-amber-300 text-white shadow-2xl shadow-blue-500/30 transition duration-300 hover:-translate-y-1 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-200"
        aria-label="Ouvrir l'assistant IA"
      >
        <span className="absolute inset-0 rounded-full bg-white/20 blur-sm" />
        <Star
          size={25}
          className="relative fill-white drop-shadow"
        />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-slate-950/30 p-4 sm:p-6">
          <section className="flex h-[82vh] w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl shadow-slate-900/20">
            <header className="relative overflow-hidden border-b border-blue-100 bg-gradient-to-br from-white via-blue-50 to-amber-50 px-5 py-4">
              <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-amber-300/40 blur-3xl" />
              <div className="pointer-events-none absolute -left-16 bottom-0 h-40 w-40 rounded-full bg-blue-300/40 blur-3xl" />

              <div className="relative flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-amber-400 text-white shadow-lg shadow-blue-500/20">
                    <Sparkles size={22} />
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                      Claude Assistant
                    </p>

                    <h2 className="mt-1 text-xl font-bold text-slate-950">
                      Demande à l’IA
                    </h2>

                    <p className="mt-1 text-sm text-slate-600">
                      Contexte actif : {context.page}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full p-2 text-slate-500 transition hover:bg-white/70 hover:text-slate-900"
                  aria-label="Fermer l'assistant IA"
                >
                  <X size={19} />
                </button>
              </div>
            </header>

            <div className="border-b border-slate-100 px-5 py-3">
              <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                <ShieldCheck
                  size={16}
                  className="mt-0.5 shrink-0"
                />
                <p>
                  Protection anti prompt injection : le contexte est
                  limité, nettoyé côté Apex et traité comme une donnée
                  non fiable.
                </p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {context.tool}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {context.path}
                </span>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-auto bg-slate-50 px-5 py-4">
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === "user"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                      <Bot size={16} />
                    </div>
                  )}

                  <div
                    className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                      message.role === "user"
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {message.text}
                  </div>

                  {message.role === "user" && (
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
                      <UserRound size={16} />
                    </div>
                  )}
                </article>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <LoaderCircle
                    size={16}
                    className="animate-spin"
                  />
                  Claude réfléchit...
                </div>
              )}

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>

            <footer className="border-t border-slate-100 bg-white p-4">
              <div className="flex gap-2">
                <textarea
                  value={question}
                  onChange={(event) =>
                    setQuestion(event.target.value)
                  }
                  aria-label="Question pour l'assistant IA"
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      (event.metaKey || event.ctrlKey)
                    ) {
                      void sendQuestion();
                    }
                  }}
                  placeholder="Ex : explique cette page, aide-moi à diagnostiquer une erreur, propose la prochaine étape..."
                  className="min-h-20 flex-1 resize-none rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />

                <button
                  type="button"
                  onClick={() => void sendQuestion()}
                  disabled={!question.trim() || loading}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Envoyer la question à l'assistant IA"
                >
                  {loading ? (
                    <LoaderCircle
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>

              <p className="mt-2 text-xs text-slate-400">
                Raccourci : Cmd/Ctrl + Entrée pour envoyer.
              </p>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
