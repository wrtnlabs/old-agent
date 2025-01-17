import { Message } from "./inputs/message";
import { Tool, ToolChoice } from "./inputs/tool";
import { Completion } from "./outputs/completion";

export interface Backend {
  kind(): BackendKind;

  makeCompletion(
    connection: Connection,
    sessionId: string,
    stageName: string,
    messages: Message[],
    options: CompletionOptions
  ): Promise<Completion>;
}

export type BackendKind = OpenAiBackendKind | ClaudeBackendKind;

export interface BaseBackendKind<T extends string> {
  kind: T;
}

export interface OpenAiBackendKind extends BaseBackendKind<"openai"> {
  model: OpenAiModel;
}

export type OpenAiModel = "gpt-4o-2024-11-20" | "gpt-4o-mini-2024-07-18";

export interface ClaudeBackendKind extends BaseBackendKind<"claude"> {
  model: ClaudeModel;
}

export type ClaudeModel =
  | "claude-3-5-sonnet-20241022"
  | "claude-3-5-haiku-20241022";

export interface Connection {
  kind: BackendKind;
  apiKey: string;
}

export interface CompletionOptions {
  temperature: number;
  jsonMode: boolean;
  frequencyPenalty?: number;
  tools: Tool[];
  toolChoice?: ToolChoice;
}
