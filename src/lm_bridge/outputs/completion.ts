import { JsonValue } from "../../core/types";
import { Role } from "../common_types";
import { Usage } from "./usage";

export interface Completion {
  model: string;
  completionId: String;
  messages: CompletionMessage[];
  usage: Usage;
  isTruncated: boolean;
  modelResponseTime: number;
}

export type CompletionMessage =
  | CompletionTextMessage
  | CompletionToolUseMessage;

export interface CompletionBaseMessage<T extends string> {
  type: T;
}

export interface CompletionTextMessage extends CompletionBaseMessage<"text"> {
  role: Role;
  text: string;
}

export interface CompletionToolUseMessage
  extends CompletionBaseMessage<"tool_use"> {
  toolUseId: string;
  toolName: string;
  arguments: JsonValue;
}
