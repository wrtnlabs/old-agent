import { IHttpResponse, OpenApi } from "@samchon/openapi";
import {
  HttpOpenAi,
  IHttpOpenAiApplication,
  IHttpOpenAiFunction,
} from "@wrtnio/schema";
import {
  AgentLogger,
  Dialog,
  JsonValue,
  MetaAgentSessionDelegate,
  MetaAgentSessionManager,
  NunjucksPromptSet,
} from "@wrtnio/agent-os";
import { FinishEvaluationResult } from "./client.agent";

import { SchemaProvider } from "./schema.provider";
import { ExceptionLogger } from "./exception.logger";
import { ReportExporter } from "./report.exporter";

export namespace BenchmarkEnvironment {
  const logger: AgentLogger = ExceptionLogger;

  const getDelegate = (props: {
    abortController: AbortController;
    sessionId: string;
    controllerMap: Map<
      string,
      {
        application: IHttpOpenAiApplication;
        swagger: OpenApi.IDocument;
      }
    >;
    dialogs: Dialog[];
    client: AsyncGenerator<ClientMessageType, ClientMessageType, void>;
    connectorBaseUrl: string;
    resolve: (props: ReportExporter.Props["result"]) => void;
  }): MetaAgentSessionDelegate =>
    (() => {
      const conversation: ReportExporter.ConversationLog[] = [];
      return {
        findFunction: async (_, name) => {
          const [method, address] = name.split(":");
          const [id, path] = [
            address.split("/")[0],
            address.split("/").slice(1).join("/"),
          ];
          const func = props.controllerMap
            .get(id)
            ?.application.functions.find(
              (f) => f.method === method && f.path === path
            );

          if (func === undefined)
            throw new Error("Unable to find the matched function");

          return {
            ...func,
            parameters: func.separated
              ? (func.separated.llm ?? []).map((p) => p.schema)
              : func.parameters,
            path: address,
            description: func.description,
          };
        },
        queryFunctions: async (_q) => {
          return Array.from(props.controllerMap)
            .map(([id, controller]) =>
              controller.application.functions.map((func) => ({
                method: func.method,
                path: `${id}/${func.path}`,
                description: func.description,
              }))
            )
            .flat();
        },
        onMessage: async (event) => {
          logger.verbose("onMessage", event);
          if (event.dialog.speaker.type === "user") {
            return;
          }

          props.dialogs.push({
            ...event.dialog,
            speaker: { type: "user" },
          });
          switch (event.dialog.message.type) {
            case "json":
              conversation.push({
                event: "onMessage_json",
                message: JSON.stringify(event.dialog.message),
              });
              break;
            case "result":
              conversation.push({
                event: "onMessage_result",
                message: JSON.stringify(event.dialog.message),
              });
              break;
            case "text":
              conversation.push({
                event: "onMessage_text",
                message: event.dialog.message.text,
              });
              break;
            case "tool_result":
              conversation.push({
                event: "onMessage_tool_result",
                id: event.dialog.message.tool_use_id,
                isError: event.dialog.message.is_error,
                message: JSON.stringify(event.dialog.message.content),
              });
              break;
            case "tool_use":
              conversation.push({
                event: "onMessage_tool_use",
                id: event.dialog.message.tool_use_id,
                name: event.dialog.message.name,
                message: JSON.stringify(event.dialog.message.args),
              });
              break;
          }
        },
        onRead: async () => {
          const { value } = await props.client.next().catch((e) => {
            logger.error(e);
            throw e;
          });

          if (value.type === "finish") {
            props.abortController.abort();
            props.resolve({
              message: value.message,
              conversation: conversation,
            });
            logger.verbose("evaluation finished", value.message);
            return "";
          }

          props.dialogs.push({
            speaker: { type: "assistant", name: "assistant" },
            message: { type: "text", text: value.message },
            visible: true,
          });
          conversation.push({
            event: "onRead",
            message: value.message,
          });
          logger.verbose("onRead", value.message);
          return value.message;
        },
        onConnectorCall: async (event) => {
          console.log("onConnectorCall", event);
          const { controller, func, separated, host } = (() => {
            const controllerId = event.function.path.split("/")[0];
            const localPath = event.function.path.split("/").slice(1).join("/");
            const controller = props.controllerMap.get(controllerId);

            if (controller === undefined)
              throw new Error("Target controller not found.");
            const func: IHttpOpenAiFunction | undefined =
              controller.application.functions.find(
                (f) =>
                  f.method === event.function.method && f.path === localPath
              );
            if (func === undefined)
              throw new Error("Target function not found.");
            else if (func.separated === undefined)
              throw new Error("Not separated."); // never be happened

            // GET HOST INFO
            const host: string | undefined = (() => {
              const servers: OpenApi.IServer[] = [
                { url: props.connectorBaseUrl },
              ];
              const at = (index: number): string | undefined =>
                servers.at(index)?.url;
              return at(1) ?? at(0);
            })();
            if (host === undefined)
              throw new Error("No host found in the Swagger document.");
            return {
              controller,
              func,
              separated: func.separated,
              host,
            };
          })();

          const humanArguments = (() => {
            (() => {
              const unique = new Set<string>();
              return separated.human.map((p) =>
                SchemaProvider.shrinkParameter(unique, p)
              );
            })();

            return [];
          })();

          const parameters: unknown[] = HttpOpenAi.mergeParameters({
            function: func,
            human: humanArguments,
            llm: event.args,
          });

          const result: IHttpResponse = await HttpOpenAi.propagate({
            application: controller.application,
            function: func,
            arguments: parameters,
            connection: {
              host,
              headers: {
                "x-wrtn-kind": "meta",
                "x-wrtn-meta-chat-session-id": props.sessionId,
                "x-wrtn-user-application": "wrtn" as const,
              },
              options: {
                signal: props.abortController.signal,
              },
            },
          });

          return result.body as JsonValue;
        },

        onCommit: async () => {},
        onError: async () => {},
        onStatistics: async () => {},
      };
    })();

  export const get = async (swagger: OpenApi.IDocument[]) => {
    // Intended deprecated method
    const controllerMap = new Map<
      string,
      { application: IHttpOpenAiApplication; swagger: OpenApi.IDocument }
    >(
      swagger.map((s, i) => [
        `s${i}`,
        { application: SchemaProvider.transform(s), swagger: s },
      ])
    );

    const manager = new MetaAgentSessionManager({
      logger: ExceptionLogger,
      promptSet: await NunjucksPromptSet.default(),
    });

    return getAgentContext(manager)(controllerMap);
  };

  const getAgentContext =
    (manager: MetaAgentSessionManager) =>
    (
      controllerMap: Map<
        string,
        { application: IHttpOpenAiApplication; swagger: OpenApi.IDocument }
      >
    ) =>
    (props: {
      model: "openai";
      apiKey: string;
      sessionId: string;
      platformInfo: string;
      initialInformation: InitialInformation;
      connectorBaseUrl: string;
    }) =>
    async (
      getClient: (
        sessionId: string,
        dialogs: Dialog[]
      ) => AsyncGenerator<ClientMessageType, ClientMessageType, void>
    ) => {
      const dialogs: Dialog[] = [];
      const client = getClient(props.sessionId, dialogs);
      return await new Promise(
        async (resolve: (value: ReportExporter.Props["result"]) => void) => {
          const abortController = new AbortController();
          const session = manager.start({
            llmBackendKind: props.model,
            llmApiKey: props.apiKey,
            sessionId: props.sessionId,
            platformInfo: {
              prompt: props.platformInfo,
            },
            initialInformation: props.initialInformation,
            dialogs,
            delegate: getDelegate({
              abortController,
              controllerMap,
              sessionId: props.sessionId,
              dialogs,
              client,
              resolve,
              connectorBaseUrl: props.connectorBaseUrl,
            }),
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
