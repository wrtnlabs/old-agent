import { IHttpResponse, OpenApi } from "@samchon/openapi";
import {
  HttpOpenAi,
  IHttpOpenAiApplication,
  IHttpOpenAiFunction,
} from "@wrtnio/schema";
import {
  ConsoleLogger,
  Dialog,
  JsonValue,
  MetaAgentSessionDelegate,
  MetaAgentSessionManager,
  NunjucksPromptSet,
} from "@wrtnio/agent-os";
import { FinishEvaluationResult } from "./client.agent";
import { app } from "./server";
import { SchemaProvider } from "./schema.provider";

export namespace BenchmarkEnvironment {
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
    resolve: (value: FinishEvaluationResult) => void;
  }): MetaAgentSessionDelegate => ({
    findFunction: async (_, name) => {
      const [method, address] = name.split("/");
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
    queryFunctions: async (_q) =>
      Array.from(props.controllerMap)
        .map(([id, controller]) =>
          controller.application.functions.map((func) => ({
            ...func,
            path: `${id}/${func.path}`,
          }))
        )
        .flat(),
    onMessage: async (event) => {
      console.log("onMessage", event);
      props.dialogs.push(event.dialog);
    },
    onRead: async () => {
      const { value } = await props.client.next().catch((e) => {
        console.error(e);
        throw e;
      });

      if (value.type === "ask") {
        return value.message;
      }

      props.abortController.abort();
      props.resolve(value.message);
      return "";
    },
    onConnectorCall: async (event) => {
      const { controller, func, separated, host } = (() => {
        const controllerId = event.function.path.split("/")[0];
        const localPath = event.function.path.split("/").slice(1).join("/");
        const controller = props.controllerMap.get(controllerId);

        if (controller === undefined)
          throw new Error("Target controller not found.");
        const func: IHttpOpenAiFunction | undefined =
          controller.application.functions.find(
            (f) => f.method === event.function.method && f.path === localPath
          );
        if (func === undefined) throw new Error("Target function not found.");
        else if (func.separated === undefined)
          throw new Error("Not separated."); // never be happened

        // GET HOST INFO
        const host: string | undefined = (() => {
          const servers: OpenApi.IServer[] =
            func.operation().servers ?? controller.swagger.servers ?? [];
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
  });

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
    //   .functions.map((f) => ({
    //     ...f,
    //     parameters: f.separated?.llm.map((p) => p.schema),
    //   }));

    const manager = new MetaAgentSessionManager({
      logger: ConsoleLogger,
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
    }) =>
    async (
      getClient: (
        sessionId: string,
        dialogs: Dialog[]
      ) => AsyncGenerator<ClientMessageType, ClientMessageType, void>
    ) => {
      app.listen(3000);
      const dialogs: Dialog[] = [];
      const client = getClient(props.sessionId, dialogs);
      return await new Promise(
        async (resolve: (value: FinishEvaluationResult) => void) => {
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
