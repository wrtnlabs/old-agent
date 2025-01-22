import {
  type CommitEvent,
  type ConnectorCallEvent,
  type Dialog,
  type FunctionQuery,
  type InitialInformation,
  type JsonValue,
  type MessageEvent,
  MetaAgentSession,
  type MetaAgentSessionDelegate,
  MetaAgentSessionManager,
  type OpenAiFunction,
  type OpenAiFunctionSummary,
  type ReadEvent,
  type RollbackEvent,
  type StatisticsEvent,
} from "@wrtnio/agent-os";
import * as slint from "slint-ui";
import * as uuid from "uuid";

const sessionManager = new MetaAgentSessionManager({});

interface History {
  timestamp: string;
  dialog: Dialog;
}

interface DevTool extends slint.ComponentHandle {
  session_id: string;
  chat_history: slint.ArrayModel<History>;
  session_starting(userInformation: InitialInformation): void;
  message_accepted(message: string): void;
}

const ui: any = slint.loadFile(new URL("../ui/main.slint", import.meta.url));

class App implements MetaAgentSessionDelegate {
  tool: DevTool;
  session: MetaAgentSession | undefined;
  abortController = new AbortController();

  constructor() {
    this.tool = new ui.DevTool();
    this.tool.chat_history = new slint.ArrayModel<History>([]);
    this.tool.session_starting = async (userInformation) => {
      console.log("on-start-session %o", userInformation);
      const prompt = "Hello, how can I help you today?";
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
    await this.tool.run();
  }

  onError(event: Error): void {
    throw new Error("Method not implemented.");
  }

  onRead(event: ReadEvent): Promise<string> {
    throw new Error("Method not implemented.");
  }

  onMessage(event: MessageEvent): Promise<void> {
    throw new Error("Method not implemented.");
  }

  onCommit(event: CommitEvent): Promise<void> {
    throw new Error("Method not implemented.");
  }

  onRollback(event: RollbackEvent): Promise<void> {
    throw new Error("Method not implemented.");
  }

  onConnectorCall(event: ConnectorCallEvent): Promise<JsonValue> {
    throw new Error("Method not implemented.");
  }

  onStatistics(event: StatisticsEvent): void {
    throw new Error("Method not implemented.");
  }

  findFunction(
    sessionId: string,
    name: string
  ): Promise<OpenAiFunction | undefined> {
    throw new Error("Method not implemented.");
  }

  queryFunctions(query: FunctionQuery): Promise<OpenAiFunctionSummary[]> {
    throw new Error("Method not implemented.");
  }
}

const app = new App();
await app.run();
