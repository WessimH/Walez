import { Link } from "react-router";
import {
  ArrowRight,
  Braces,
  Database,
  FileCode2,
  KeyRound,
  RadioTower,
  Send,
  ShieldCheck,
  Sparkles,
  Workflow,
  Zap
} from "lucide-react";

type ToolCard = {
  title: string;
  description: string;
  path: string;
  icon: typeof Send;
  iconClasses: string;
  backgroundClasses: string;
  delay: number;
};

const tools: ToolCard[] = [
  {
    title: "API Tester",
    description:
      "Teste des APIs REST depuis Salesforce grâce à Apex, Data SDK et Named Credentials.",
    path: "/api-tester",
    icon: Send,
    iconClasses: "text-blue-700",
    backgroundClasses: "bg-blue-100",
    delay: 100
  },
  {
    title: "JSON Formatter",
    description:
      "Formate, minifie, valide et copie rapidement des payloads JSON.",
    path: "/json-formatter",
    icon: Braces,
    iconClasses: "text-purple-700",
    backgroundClasses: "bg-purple-100",
    delay: 180
  },
  {
    title: "Apex DTO Generator",
    description:
      "Transforme automatiquement un JSON en classes DTO Apex prêtes à utiliser.",
    path: "/apex-dto",
    icon: FileCode2,
    iconClasses: "text-orange-700",
    backgroundClasses: "bg-orange-100",
    delay: 260
  },
  {
    title: "SOQL Builder",
    description:
      "Construis et exécute des requêtes SOQL avec affichage tableau ou JSON.",
    path: "/soql-builder",
    icon: Database,
    iconClasses: "text-cyan-700",
    backgroundClasses: "bg-cyan-100",
    delay: 340
  },
  {
    title: "Named Credentials",
    description:
      "Explore les Named Credentials de l’org.",
    path: "/named-credentials",
    icon: KeyRound,
    iconClasses: "text-emerald-700",
    backgroundClasses: "bg-emerald-100",
    delay: 420
  },
  {
    title: "Platform Events",
    description:
      "Inspecte les Platform Events et publie des événements de test dynamiquement.",
    path: "/platform-events",
    icon: RadioTower,
    iconClasses: "text-indigo-700",
    backgroundClasses: "bg-indigo-100",
    delay: 500
  },
  {
  title: "Integration Flows",
  description:
    "Visualise et supervise les flux entre Salesforce, Apex, MuleSoft et les systèmes externes.",
  path: "/integration-flows",
  icon: Workflow,
  iconClasses: "text-violet-700",
  backgroundClasses: "bg-violet-100",
  delay: 580
}
];

const architectureSteps = [
  {
    title: "React UI Bundle",
    description: "Interface moderne exécutée directement dans Salesforce."
  },
  {
    title: "Platform SDK",
    description: "Communication sécurisée entre React et la plateforme."
  },
  {
    title: "Apex REST",
    description: "Contrôle des opérations sensibles et de la logique serveur."
  },
  {
    title: "Salesforce & APIs",
    description: "SOQL, Platform Events, Named Credentials et services externes."
  }
];

export default function Home() {
  return (
    <div className="space-y-8 pb-10">
      <section className="relative overflow-hidden rounded-3xl border border-gray-200 bg-gradient-to-br from-white via-blue-50 to-indigo-100 p-8 shadow-sm md:p-12">
        <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-blue-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-purple-300/30 blur-3xl" />

        <div className="pointer-events-none absolute right-10 top-10 hidden h-28 w-28 rounded-3xl border border-white/60 bg-white/40 shadow-lg backdrop-blur-md lg:block animate-float-soft">
          <div className="flex h-full items-center justify-center">
            <Zap size={42} className="text-blue-600" />
          </div>
        </div>

        <div className="relative z-10 max-w-4xl">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm backdrop-blur">
              <Sparkles size={16} />
              Salesforce Developer Toolkit
            </div>

            <h1 className="mt-6 text-4xl font-bold tracking-tight text-gray-950 md:text-6xl">
              Salesforce Integration
              <span className="block bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                Studio
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600">
              Une console développeur moderne pour tester, explorer et
              accélérer les intégrations Salesforce depuis une seule
              application.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/api-tester"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-medium text-white shadow-lg shadow-blue-600/20 transition duration-300 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl"
              >
                Ouvrir l’API Tester
                <ArrowRight size={17} />
              </Link>

              <Link
                to="/soql-builder"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white/80 px-5 py-3 font-medium text-gray-800 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
              >
                Exécuter une requête SOQL
              </Link>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-12 grid gap-4 sm:grid-cols-3">
          <div
            className="animate-fade-up rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur"
            style={{ animationDelay: "150ms" }}
          >
            <p className="text-3xl font-bold text-gray-950">
              {tools.length}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Outils fonctionnels
            </p>
          </div>

          <div
            className="animate-fade-up rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur"
            style={{ animationDelay: "250ms" }}
          >
            <p className="text-3xl font-bold text-gray-950">
              100 %
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Exécuté dans Salesforce
            </p>
          </div>

          <div
            className="animate-fade-up rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur"
            style={{ animationDelay: "350ms" }}
          >
            <div className="flex items-center gap-2">
              <ShieldCheck size={27} className="text-emerald-600" />
              <p className="text-xl font-bold text-gray-950">
                Secure
              </p>
            </div>

            <p className="mt-1 text-sm text-gray-500">
              Aucun secret exposé côté React
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
              Developer tools
            </p>

            <h2 className="mt-2 text-3xl font-bold text-gray-950">
              Tous les outils
            </h2>

            <p className="mt-2 text-gray-500">
              Sélectionne un module pour commencer à travailler.
            </p>
          </div>

          <p className="text-sm text-gray-400">
            {tools.length} modules disponibles
          </p>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {tools.map((tool) => {
            const Icon = tool.icon;

            return (
              <Link
                key={tool.title}
                to={tool.path}
                className="group animate-fade-up relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl"
                style={{
                  animationDelay: `${tool.delay}ms`
                }}
              >
                <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-blue-100/50 blur-3xl opacity-0 transition duration-300 group-hover:opacity-100" />

                <div className="relative z-10">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${tool.backgroundClasses} ${tool.iconClasses} transition duration-300 group-hover:scale-110`}
                  >
                    <Icon size={23} />
                  </div>

                  <h3 className="mt-5 text-lg font-semibold text-gray-950">
                    {tool.title}
                  </h3>

                  <p className="mt-2 min-h-16 text-sm leading-6 text-gray-500">
                    {tool.description}
                  </p>

                  <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-blue-600">
                    Ouvrir l’outil

                    <ArrowRight
                      size={16}
                      className="transition duration-300 group-hover:translate-x-1"
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-gray-200 bg-gray-950 p-7 text-white shadow-sm md:p-10">
        <div className="grid gap-10 xl:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
              Architecture
            </p>

            <h2 className="mt-3 text-3xl font-bold">
              Une application réellement connectée à Salesforce
            </h2>

            <p className="mt-4 leading-7 text-gray-400">
              Les modules ne sont pas de simples maquettes. Ils exécutent
              des opérations Salesforce via le Platform SDK,
              Apex REST, SOQL, ConnectApi et EventBus.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {architectureSteps.map((step, index) => (
              <div
                key={step.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur transition hover:border-blue-400/40 hover:bg-white/10"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20 text-sm font-bold text-blue-300">
                    {index + 1}
                  </div>

                  <h3 className="font-semibold">
                    {step.title}
                  </h3>
                </div>

                <p className="mt-3 text-sm leading-6 text-gray-400">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}