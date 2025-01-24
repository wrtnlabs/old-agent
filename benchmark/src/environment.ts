import { OpenApi } from "@samchon/openapi";
import {
  HttpOpenAi,
  IHttpOpenAiApplication,
  IOpenAiSchema,
  ISwaggerSchemaCommonPlugin,
  OpenAiTypeChecker,
} from "@wrtnio/schema";
import {
  ConsoleLogger,
  Dialog,
  MetaAgentSession,
  MetaAgentSessionManager,
  NunjucksPromptSet,
} from "@wrtnio/agent-os";
import { FinishEvaluationResult } from "./client.agent";

export namespace BenchmarkEnvironment {
  export const get = async (swagger: OpenApi.IDocument[]) => {
    // Intended deprecated method
    const openaiPositional = HttpOpenAi.application({
      document: swagger as any,
      options: {
        keyword: false,
        separate: (schema) =>
          OpenAiTypeChecker.isString(schema) &&
          (!!schema["x-wrtn-secret-key"] || !!schema.contentMediaType),
      },
    });

    //   .functions.map((f) => ({
    //     ...f,
    //     parameters: f.separated?.llm.map((p) => p.schema),
    //   }));

    const manager = new MetaAgentSessionManager({
      logger: ConsoleLogger,
      promptSet: await NunjucksPromptSet.default(),
    });

    return getAgentContext(manager)(openaiPositional);
  };

  const getAgentContext =
    (manager: MetaAgentSessionManager) =>
    (openaiPositional: IHttpOpenAiApplication) =>
    (props: {
      model: "openai";
      apiKey: string;
      sessionId: string;
      platformInfo: string;
      initialInformation: InitialInformation;
    }) =>
    async (
      getClient: (
        sessionId: string,
        dialogs: Dialog[]
      ) => AsyncGenerator<ClientMessageType, ClientMessageType, void>
    ) => {
      const dialogs: Dialog[] = [];
      const client = getClient(props.sessionId, dialogs);
      let session: MetaAgentSession;
      return await new Promise(
        async (resolve: (value: FinishEvaluationResult) => void) => {
          const abortController = new AbortController();
          session = await manager.start({
            llmBackendKind: props.model,
            llmApiKey: props.apiKey,
            sessionId: props.sessionId,
            platformInfo: {
              prompt: props.platformInfo,
            },
            initialInformation: props.initialInformation,
            dialogs,
            delegate: {
              findFunction: async (_, name) => {
                return openaiPositional.functions.find((f) => f.name === name);
              },
              queryFunctions: async (_q) => {
                return openaiPositional.functions.map((f) => ({
                  method: f.method,
                  path: f.path,
                  description: f.description,
                  prerequisites: f.parameters.flatMap(extractPrerequisites),
                }));
              },
              onCommit: async () => {},
              onError: async () => {},
              onStatistics: async () => {},
              onMessage: async (event) => {
                console.log("onMessage", event);
                if (
                  event.dialog.message.type === "text" &&
                  event.dialog.speaker.type === "assistant"
                ) {
                  dialogs.push(event.dialog);
                }
              },
              onRead: async () => {
                const { value } = await client.next().catch((e) => {
                  console.error(e);
                  throw e;
                });

                if (value.type === "ask") {
                  console.log("clinet:", value.message);
                  return value.message;
                }
                console.log("value", value);
                abortController.abort();
                resolve(value.message);
                return "";
              },
              onConnectorCall: async (event) => {
                console.log(event);
                return "";
              },
            },
          });
          await session.launch(abortController.signal);
        }
      );
    };
  export type ClientMessageType =
    | {
        type: "ask";
        message: string;
      }
    | {
        type: "finish";
        message: FinishEvaluationResult;
      };

  export type InitialInformation = {
    email?: string | undefined;
    username?: string | undefined;
    job?: string | undefined;
    timezone?: string | undefined;
    datetime?: string | undefined;
    gender?: string | undefined;
    birth_year?: number | undefined;
    lang_code?: string;
  };
}

const extractPrerequisites = (
  schema: IOpenAiSchema
): ISwaggerSchemaCommonPlugin.IPrerequisite[] => {
  const result: ISwaggerSchemaCommonPlugin.IPrerequisite[] = [];

  OpenAiTypeChecker.visit(schema, (schema) => {
    const prerequisite = schema["x-wrtn-prerequisite"];
    if (prerequisite && "jmesPath" in prerequisite) {
      result.push(prerequisite);
    }
  });

  return result;
};
