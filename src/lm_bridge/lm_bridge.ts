import { randomInt } from "node:crypto";
import { setTimeout } from "node:timers/promises";
import {
  Backend,
  ClaudeBackendKind,
  Connection,
  OpenAiBackendKind,
} from "./backend";
import { Message } from "./inputs/message";
import { Tool, ToolChoice } from "./inputs/tool";
import { Completion } from "./outputs/completion";
import { OpenAi } from "./backends/open_ai";
import { Anthropic } from "./backends/anthropic";
import { AgentLogger, NoopLogger } from "../logger";
import { stringify } from "typia/lib/json";

export interface BackoffStrategy {
  readonly maxRetries: number;
  readonly backoffFactor: number;
  readonly initialBackoffMilliseconds: number;
  readonly maximumBackoffMilliSeconds: number;
}

export const DEFAULT_BACKOFF_STRATEGY: BackoffStrategy = {
  maxRetries: 6,
  backoffFactor: 2.0,
  initialBackoffMilliseconds: 500,
  maximumBackoffMilliSeconds: 16000,
};

export class LmBridge {
  backendFactory: (connection: Connection) => Backend;

  public temperature: number;
  public jsonMode: boolean;
  public tools: readonly Tool[];
  public logger: AgentLogger;
  public hasCostLog: boolean;

  constructor(options: LmBridgeInit) {
    this.backendFactory = (connection) => {
      switch (connection.kind.kind) {
        case "openai": {
          return new OpenAi(
            connection as Connection & { kind: OpenAiBackendKind }
          );
        }
        case "claude": {
          return new Anthropic(
            connection as Connection & { kind: ClaudeBackendKind }
          );
        }
        default: {
          throw new Error("unsupported backend kind");
        }
      }
    };
    const {
      temperature,
      jsonMode = false,
      tools = [],
      logger = NoopLogger,
    } = options;
    this.temperature = temperature;
    this.jsonMode = jsonMode;
    this.tools = tools;
    this.logger = logger;
    this.hasCostLog = !!options.hasCostLog;
  }

  async request(options: LmBridgeRequest): Promise<Completion> {
    const { connection, backoffStrategy = DEFAULT_BACKOFF_STRATEGY } = options;
    const backend = this.backendFactory(connection);
    this.logger.debug("backoff strategy: %o", backoffStrategy);

    for (let retries = 0; retries < backoffStrategy.maxRetries; retries++) {
      this.logger.debug("attempting run with retries: %i", retries);

      try {
        const output = await this.runOnce(backend, options);
        return output;
      } catch (err) {
        if (!(err instanceof BackoffError)) {
          throw err;
        }
      }

      const backoffBase = Math.min(
        Math.ceil(
          backoffStrategy.initialBackoffMilliseconds *
            backoffStrategy.backoffFactor ** retries
        ),
        backoffStrategy.maximumBackoffMilliSeconds
      );

      const backoffHalf = backoffBase / 2;
      const jitter = randomInt(backoffHalf);
      const backoff = backoffHalf + jitter;

      this.logger.debug("failed, sleeping for %ims", backoff);
      await setTimeout(backoff);
    }

    this.logger.error("giving up after %i retries", backoffStrategy.maxRetries);
    throw new BackoffError("Too many requests");
  }

  private async runOnce(
    backend: Backend,
    options: LmBridgeRequest
  ): Promise<Completion> {
    const {
      sessionId,
      stageName,
      messages,
      frequencyPenalty,
      toolChoice,
      signal,
    } = options;

    const response = await backend.makeCompletion(
      sessionId,
      stageName,
      messages,
      {
        temperature: this.temperature,
        jsonMode: this.jsonMode,
        frequencyPenalty,
        tools: this.tools,
        toolChoice,
        signal,
      }
    );

    // TODO: handle HTTP 429 Too Many Requests

    if (response.isTruncated) {
      const last = response.messages.at(-1);
      if (last?.type === "text") {
        let acc = last.text.trim();
        let { inputTokens: accInputTokens, outputTokens: accOutputTokens } =
          response.usage;

        while (true) {
          const continuedMessages: Message[] = [
            ...messages,
            {
              role: "assistant",
              content: { type: "text", text: acc },
            },
          ];

          const response = await backend.makeCompletion(
            sessionId,
            stageName,
            continuedMessages,
            {
              temperature: this.temperature,
              jsonMode: this.jsonMode,
              frequencyPenalty,
              tools: this.tools,
              toolChoice,
              signal,
            }
          );
          // TODO: handle HTTP 429 Too Many Requests

          const last2 = response.messages.at(-1);
          if (last2?.type === "text") {
            acc += last2.text.trim();
            accInputTokens += response.usage.inputTokens;
            accOutputTokens += response.usage.outputTokens;
          }

          if (!response.isTruncated) {
            const last = response.messages.at(-1);
            if (last?.type === "text") {
              last.text = acc;
            }
            response.usage.inputTokens = accInputTokens;
            response.usage.outputTokens = accOutputTokens;
            return response;
          }
        }
      }
    }

    if (this.hasCostLog) {
      this.logger.log(
        stringify({
          region: "",
          origin: "",
          model_name: backend.kind().model,
          input_tokens: response.usage.inputTokens,
          output_tokens: response.usage.outputTokens,
          created_at: new Date().toISOString(),
          model_response_ms: response.modelResponseMs,
          model_origin: backend.kind().kind,
          origin_resource: backend.baseUrl,
        })
      );
    }

    return response;
  }
}

export interface LmBridgeInit {
  temperature: number;
  jsonMode?: boolean;
  tools?: readonly Tool[];
  logger: AgentLogger;
  hasCostLog?: boolean;
}

export interface LmBridgeRequest {
  connection: Connection;
  sessionId: string;
  stageName: string;
  messages: Message[];
  frequencyPenalty?: number;
  toolChoice?: ToolChoice;
  backoffStrategy?: BackoffStrategy;
  stream?: boolean;
  signal?: AbortSignal;
}

export class BackoffError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "BackoffError";
  }
}
