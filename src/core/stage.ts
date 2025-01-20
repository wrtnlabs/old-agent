import { OpenAiFunction, OpenAiFunctionSummary } from "../function";
import { Connection } from "../lm_bridge/backend";

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
  getPrompt(name: string, context?: Record<string, unknown>): Promise<string>;
  allFunctions(): Promise<OpenAiFunctionSummary[]>;

  // QueryConnector
  findFunction(
    sessionId: string,
    name: string
  ): Promise<OpenAiFunction | undefined>;
}
