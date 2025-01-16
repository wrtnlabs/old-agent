import { OpenApi } from "@samchon/openapi";
import { HttpOpenAi, IOpenAiSchema, OpenAiTypeChecker } from "@wrtnio/schema";
import {
  Dialog,
  MetaAgentSessionManager,
  Prerequisite,
  SessionStageContextWrapWrapper,
} from "@wrtn/studio-meta-agent";
import { FinishEvaluationResult } from "./client.agent";

export namespace BenchmarkEnvironment {
  export const get = (swagger: OpenApi.IDocument[]) => {
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
      xFeatureId: "benchmark",
      delegate: {
        findFunction: async (_, name) => {
          return (
            openaiPositional.functions.find((f) => f.name === name) ?? null
          );
        },
        queryFunctions: async () => {
          return openaiPositional.functions.map((f) => ({
            method: f.method,
            path: f.path,
            description: f.description ?? null,
            prerequisites: f.parameters.flatMap(extractPrerequisites),
          }));
        },
      },
    });
    return getAgentContext(manager);
  };

  const getAgentContext =
    (manager: MetaAgentSessionManager) =>
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
      let wrapper: SessionStageContextWrapWrapper;
      return await new Promise(
        async (resolve: (value: FinishEvaluationResult) => void) => {
          wrapper = await manager.start({
            llmBackendKind: props.model,
            llmApiKey: props.apiKey,
            sessionId: props.sessionId,
            platformInfo: {
              prompt: props.platformInfo,
            },
            initialInformation: props.initialInformation,
            dialogs,
            sessionStorage: {
              function_call_results: [],
            },
            delegate: {
              onCommit: async () => {},
              onError: async () => {},
              onStatistics: async () => {},
              onUpdateSessionStorage: async () => {},
              onMessage: async (event) => {
                console.log("onMessage", event);
                if (
                  event.dialog.message.type === "text" &&
                  event.dialog.speaker.type === "assistant"
                ) {
                  dialogs.push(event.dialog);
                }
                debugger;
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
                resolve(value.message);
                return "";
              },
              onConnectorCall: async (event) => {
                console.log(event);
                return "";
              },
            },
          });
          await wrapper.launch().catch((e) => {
            console.error(e);
            throw e;
          });
        }
      )
        .catch((e) => {
          console.error(e);
          throw e;
        })
        .finally(() => {
          console.log("free");
          wrapper.free();
          manager.free();
        });
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

const extractPrerequisites = (schema: IOpenAiSchema): Prerequisite[] => {
  const result: Prerequisite[] = [];

  OpenAiTypeChecker.visit(schema, (schema) => {
    const prerequisite = schema["x-wrtn-prerequisite"];
    if (prerequisite && "jmesPath" in prerequisite) {
      result.push({
        prerequisite,
      });
    }
  });

  return result;
};
