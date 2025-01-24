import { randomInt } from "node:crypto";
import { setTimeout } from "node:timers/promises";
import { Backend, Connection } from "./backend";
import { Message } from "./inputs/message";
import { Tool, ToolChoice } from "./inputs/tool";
import { Completion } from "./outputs/completion";

export interface BackoffStrategy {
  maxRetries: number;
  backoffFactor: number;
  initialBackoffMilliseconds: number;
  maximumBackoffMilliSeconds: number;
}

const DEFAULT_BACKOFF_STRATEGY: BackoffStrategy = {
  maxRetries: 6,
  backoffFactor: 2.0,
  initialBackoffMilliseconds: 500,
  maximumBackoffMilliSeconds: 16000,
};

export class LmBridge {
  backendFactory: (connection: Connection) => Backend;

  // @TODO FIX it
  public continueBackend: Backend = undefined as unknown as Backend;
  public temperature: number;
  public jsonMode: boolean;
  public tools: readonly Tool[];

  constructor(temperature: number, jsonMode: boolean, tools: readonly Tool[]) {
    this.backendFactory = () => {
      // TODO: dummy impl
      throw new Error("Backend not set");
    };
    this.temperature = temperature;
    this.jsonMode = jsonMode;
    this.tools = tools;
  }

  async request(options: LmBridgeRequest): Promise<Completion> {
    const { connection, backoffStrategy = DEFAULT_BACKOFF_STRATEGY } = options;
    const backend = this.backendFactory(connection);
    console.debug("backoff strategy: %o", backoffStrategy);

    for (let retries = 0; retries < backoffStrategy.maxRetries; retries++) {
      console.debug("attempting run with retries: %i", retries);

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

      console.debug("failed, sleeping for %ims", backoff);
      await setTimeout(backoff);
    }

    console.error("giving up after %i retries", backoffStrategy.maxRetries);
    throw new BackoffError("Too many requests");
  }

  private async runOnce(
    backend: Backend,
    options: LmBridgeRequest
  ): Promise<Completion> {
    const {
      connection,
      sessionId,
      stageName,
      messages,
      frequencyPenalty,
      toolChoice,
      signal,
    } = options;
    const response = await backend.makeCompletion(
      connection,
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

          const response = await this.continueBackend.makeCompletion(
            connection,
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
    return response;
  }
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

class BackoffError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackoffError";
  }
}
