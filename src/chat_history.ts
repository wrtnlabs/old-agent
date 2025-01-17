export type AssistantName = string;

/**
 * Represents a subject of the dialog.
 */
export type Speaker =
  | { type: "user" }
  | { type: "assistant"; name: AssistantName };

export interface Dialog {
  id?: string;
  visible: boolean;
  speaker: Speaker;
  message: DialogMessage;
}

export type DialogMessage =
  | DialogTextMessage
  | DialogToolUseMessage
  | DialogToolResultMessage
  | DialogJsonMessage
  | DialogResultMessage;

export interface DialogTextMessage {
  type: "text";
  text: string;
}

export interface DialogToolUseMessage {
  type: "tool_use";
  tool_use_id: string;
  name: string;
  args: unknown;
}

export interface DialogToolResultMessage {
  type: "tool_result";
  is_error: boolean;
  tool_use_id: string;
  content: unknown;
}

export type DialogJsonMessage = { type: "json" } & Record<string, unknown>;

export type DialogResultMessage = { type: "result" } & (
  | { Ok: DialogMessage }
  | { Err: DialogMessage }
);
