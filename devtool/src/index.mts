import {
  ConsoleLogger,
  MetaAgentSessionManager,
  type CommitEvent,
  type ConnectorCallEvent,
  type FunctionQuery,
  type InitialInformation,
  type JsonValue,
  type MessageEvent,
  type MetaAgentSession,
  type MetaAgentSessionDelegate,
  type OpenAiFunction,
  type OpenAiFunctionSummary,
  type ReadEvent,
  type RollbackEvent,
  type StatisticsEvent,
} from "@wrtnio/agent-os";
import { type IHttpOpenAiApplication } from "@wrtnio/schema";
import * as slint from "slint-ui";
import * as uuid from "uuid";
import { NunjucksPromptSet } from "./prompt_set.mts";

const sessionManager = new MetaAgentSessionManager({
  promptSet: new NunjucksPromptSet(),
  logger: ConsoleLogger,
});

interface Dialog {
  visible: boolean;
  speaker: string;
  message: string;
}

interface History {
  timestamp: string;
  dialog: Dialog;
}

interface DevTool extends slint.ComponentHandle {
  session_id: string;
  chat_history: slint.ArrayModel<History>;
  session_starting(userInformation: InitialInformation, prompt: string): void;
  message_accepted(message: string): void;
}

const ui: any = slint.loadFile(new URL("../ui/main.slint", import.meta.url));

class App implements MetaAgentSessionDelegate {
  tool: DevTool;
  session: MetaAgentSession | undefined;
  doc: IHttpOpenAiApplication | undefined;
  abortController = new AbortController();

  constructor() {
    this.tool = new ui.DevTool();
    this.tool.chat_history = new slint.ArrayModel<History>([]);
    this.tool.session_starting = async (userInformation, prompt) => {
      console.log("on-start-session %o", userInformation);
      this.session = await sessionManager.start({
        llmBackendKind: "openai",
        llmApiKey: process.env["OPENAI_API_KEY"]!,
        platformInfo: {
          prompt,
        },
        sessionId: uuid.v4(),
        initialInformation: userInformation,
        dialogs: [],
        delegate: this,
      });
      this.session.launch(this.abortController.signal);
    };
  }

  async run() {
    const response = await fetch(
      "https://wrtnio.github.io/connectors/swagger/openai-positional.json"
    );
    this.doc = (await response.json()) as IHttpOpenAiApplication;

    await this.tool.run();
  }

  onError(error: Error): void {
    console.error("Error occured: %o", error);
  }

  onRead(event: ReadEvent): Promise<string> {
    throw new Error("Method not implemented.");
  }

  async onMessage(event: MessageEvent): Promise<void> {
    this.tool.chat_history.push({
      timestamp: new Date().toISOString(),
      dialog: {
        visible: event.dialog.visible,
        speaker: event.dialog.speaker.type,
        message: JSON.stringify(event.dialog.message),
      },
    });
  }

  async onCommit(event: CommitEvent): Promise<void> {
    console.log("committed");
  }

  async onRollback(event: RollbackEvent): Promise<void> {
    console.log("rolled back");
  }

  onConnectorCall(event: ConnectorCallEvent): Promise<JsonValue> {
    throw new Error("Method not implemented.");
  }

  onStatistics(event: StatisticsEvent): void {
    console.info("Statistics: %o", event);
  }

  async findFunction(
    sessionId: string,
    name: string
  ): Promise<OpenAiFunction | undefined> {
    return this.doc?.functions.find((f) => `${f.method}:${f.path}` === name);
  }

  async queryFunctions(query: FunctionQuery): Promise<OpenAiFunctionSummary[]> {
    return this.doc?.functions ?? [];
  }
}

const app = new App();
await app.run();
