import { OpenAiFunction, OpenAiFunctionSummary } from "./connector";
import { Connection } from "../lm_bridge/backend";
import { InitialInformation } from "../session";

export interface StageInfo {
  identifier: string;
}

export interface Stage<I, O> extends StageInfo {
  execute(input: I, context: StageContext): Promise<O>;
}

export interface StageContext {
  llmConnection: Connection;
  sessionId: string;
  langCode: string;
  userContext: InitialInformation;
  signal?: AbortSignal;

  getPrompt(name: string, context?: Record<string, unknown>): Promise<string>;
  allFunctions(): Promise<OpenAiFunctionSummary[]>;

  // QueryConnector
  findFunction(
    sessionId: string,
    name: string
  ): Promise<OpenAiFunction | undefined>;
}

export class StageError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "StageError";
  }
}
