import { OpenAiFunction, OpenAiFunctionSummary } from "../function";
import { LlmConnection } from "../lm-bridge/lm_bridge";

export interface StageInfo {
  identifier: string;
}

export interface Stage<I, O> extends StageInfo {
  execute(input: I, context: StageContext): Promise<O>;
}

export interface StageContext {
  llmConnection: LlmConnection;
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
