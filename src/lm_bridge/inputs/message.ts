import { Role } from "../common_types";

export interface Message {
  name?: string;
  role: Role;
  content: MessageContent;
}

export type MessageContent =
  | MessageTextContent
  | MessageToolUseContent
  | MessageToolResultContent;

export interface MessageBaseContent<T extends string> {
  type: T;
}

export interface MessageTextContent extends MessageBaseContent<"text"> {
  text: string;
}

export interface MessageToolUseContent extends MessageBaseContent<"tool_use"> {
  toolUseId: string;
  name: string;
  arguments: unknown;
}

export interface MessageToolResultContent
  extends MessageBaseContent<"tool_result"> {
  isError: boolean;
  toolUseId: string;
  content: unknown;
}
