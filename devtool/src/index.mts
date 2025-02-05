import {
  ConsoleLogger,
  MetaAgentSessionManager,
  NunjucksPromptSet,
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
  type RequestOptions,
  type RollbackEvent,
  type StatisticsEvent,
} from "@wrtnio/agent-os";
import { type IHttpOpenAiApplication } from "@wrtnio/schema";
import * as slint from "slint-ui";
import * as uuid from "uuid";

const sessionManager = new MetaAgentSessionManager({
  promptSet: await NunjucksPromptSet.default(),
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
  platform_prompt: string;
  session_starting(userInformation: InitialInformation, prompt: string): void;
  message_accepted(message: string): void;
}

const ui: any = slint.loadFile(new URL("../ui/main.slint", import.meta.url));

class App implements MetaAgentSessionDelegate {
  tool: DevTool;
  session: MetaAgentSession | undefined;
  doc: IHttpOpenAiApplication | undefined;
  abortController = new AbortController();
  readResolver: ((value: string) => void) | undefined;

  constructor() {
    this.tool = new ui.DevTool();
    this.tool.chat_history = new slint.ArrayModel<History>([]);
    this.tool.platform_prompt = `\
Store Name: Samchon's Cloth Party

Store Description: Samchon's Cloth Party is a platform for buying clothes

Store Features:
- clothes recommendation
- searching clothes
- buy clothes

Support Guidelines:
- Request Type: recommend clothes
  Response Guide: ask user about their preferences, style, budget and other requirements, then recommend best a few clothes
- Request Type: buy clothes
  Response Guide: identify the product and size, then ask user for their address and payment method to perform the purchase
- Request Type: refund
  Response Guide: identify the order and reason, then refund the user
- Request Type: exchange
  Response Guide: identify the order and reason, then exchange the item
- Request Type: other
  Response Guide: identify the request and requirements, then provide the best solution, or escalate to a higher department

FAQ:
- Q: What is the return policy?
  A: We offer a 30-day return policy for all items purchased from our platform. If you are not satisfied with your purchase, please contact our customer service for assistance.
- Q: What is the shipping policy?
  A: We offer free shipping for all orders over $50. For orders under $50, we charge a flat rate of $5 for shipping. We currently only ship to the United States.
- Q: What is the payment method?
  A: We accept credit cards, PayPal, and Bitcoin. We also offer a 30-day money-back guarantee on all purchases.
- Q: The product is damaged or defective
  A: Please contact our customer service for assistance. We will provide a replacement or refund for the defective item.
- Q: The product I want to buy is out of stock, will it be restocked?
  A: We do not currently have a restocking policy. However, we are constantly updating our inventory to ensure that our customers have access to the latest styles and trends.
- Q: I ordered the wrong size, can I return it?
  A: You can return the item within 30 days of purchase for a full refund. Please contact our customer service for assistance.

Agent Rules:
- always respond politely
- do not ask for personal information unless necessary
- provide only accurate information based on the platform information or tool responses
- if unable to resolve, escalate to a higher department
`;
    this.tool.session_starting = async (userInformation, prompt) => {
      ConsoleLogger.log("on-start-session %o", userInformation);
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
    this.tool.message_accepted = (message) => {
      this.readResolver?.(message);
    };
  }

  async run() {
    const response = await fetch(
      "https://wrtnlabs.github.io/connectors/swagger/openai-positional.json"
    );
    this.doc = (await response.json()) as IHttpOpenAiApplication;

    await this.tool.run();
  }

  onError(error: Error): void {
    ConsoleLogger.error("Error occured: %o", error);
  }

  async onRead(event: ReadEvent): Promise<string> {
    event.signal?.throwIfAborted();
    return new Promise((resolve, reject) => {
      const signal = event.signal;
      const abortListener = () => {
        this.readResolver = undefined;
        signal?.removeEventListener("abort", abortListener);
        reject(new Error("Aborted"));
      };
      signal?.addEventListener("abort", abortListener);
      this.readResolver = resolve;
    });
  }

  async onMessage(event: MessageEvent): Promise<void> {
    let message: string;
    switch (event.dialog.message.type) {
      case "text":
        message = event.dialog.message.text;
        break;
      default:
        message = JSON.stringify(event.dialog.message, undefined, 2);
        break;
    }
    this.tool.chat_history.push({
      timestamp: new Date().toISOString(),
      dialog: {
        visible: event.dialog.visible,
        speaker: event.dialog.speaker.type,
        message,
      },
    });
  }

  async onCommit(event: CommitEvent): Promise<void> {
    ConsoleLogger.log("committed");
  }

  async onRollback(event: RollbackEvent): Promise<void> {
    ConsoleLogger.log("rolled back");
  }

  onConnectorCall(event: ConnectorCallEvent): Promise<JsonValue> {
    throw new Error("Method not implemented.");
  }

  onStatistics(event: StatisticsEvent): void {
    ConsoleLogger.log("Statistics: %o", event);
  }

  async findFunction(
    sessionId: string,
    name: string,
    options: RequestOptions
  ): Promise<OpenAiFunction | undefined> {
    options.signal?.throwIfAborted();
    return this.doc?.functions.find((f) => `${f.method}:${f.path}` === name);
  }

  async queryFunctions(
    query: FunctionQuery,
    options: RequestOptions
  ): Promise<OpenAiFunctionSummary[]> {
    options.signal?.throwIfAborted();
    return this.doc?.functions ?? [];
  }
}

const app = new App();
await app.run();
