import { JsonValue } from "./core/types";
import { Message, MessageContent } from "./lm_bridge/inputs/message";

export type AssistantName = string;

/**
 * Represents a subject of the dialog.
 */
export type Speaker =
  | { type: "user" }
  | { type: "assistant"; name: AssistantName };

export interface Dialog {
  readonly id?: string;
  readonly visible: boolean;
  readonly speaker: Speaker;
  readonly message: DialogMessage;
}

export const dialogToInputMessage = (dialog: Dialog): Message => {
  return {
    ...(dialog.speaker.type === "assistant"
      ? { name: dialog.speaker.name }
      : {}),
    role: dialog.speaker.type === "assistant" ? "assistant" : "user",
    content: dialogMessageToInputMessage(dialog.message),
  };
};

const dialogMessageToInputMessage = (
  message: DialogMessage
): MessageContent => {
  switch (message.type) {
    case "text":
      return { type: "text", text: message.text };
    case "tool_result":
      return {
        type: "tool_result",
        isError: message.is_error,
        toolUseId: message.tool_use_id,
        content: message.content,
      };
    case "tool_use":
      return {
        type: "tool_use",
        toolUseId: message.tool_use_id,
        name: message.name,
        arguments: message.args,
      };
    case "json":
      return { type: "text", text: JSON.stringify(message) };
    case "result":
      return {
        type: "text",
        text: JSON.stringify(
          "Ok" in message
            ? dialogMessageToInputMessage(message.Ok)
            : dialogMessageToInputMessage(message.Err)
        ),
      };
  }
};
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
  args: JsonValue;
}

export interface DialogToolResultMessage {
  type: "tool_result";
  is_error: boolean;
  tool_use_id: string;
  content: unknown;
}

export type DialogJsonMessage = { type: "json" } & JsonValue;

export type DialogResultMessage = { type: "result" } & (
  | { Ok: DialogMessage }
  | { Err: DialogMessage }
);

export class ChatHistory {
  constructor(private dialogs: Dialog[] = []) {}

  clone(): ChatHistory {
    return new ChatHistory([...this.dialogs]);
  }

  isEmpty(): boolean {
    return this.dialogs.length === 0;
  }

  appendDialog(dialog: Dialog): void {
    this.dialogs.push(dialog);
  }

  lastDialog(): Dialog | undefined {
    return this.dialogs.at(-1);
  }

  [Symbol.iterator](): IteratorObject<Dialog> {
    return this.dialogs.values();
  }

  rollback(
    range: RollbackRange,
    predicate: (dialog: Readonly<Dialog>) => boolean
  ): void {
    for (let i = this.dialogs.length - 1; i >= 0; i--) {
      const dialog = this.dialogs[i];
      if (dialog != null && predicate(dialog)) {
        this.dialogs.splice(i + (range === RollbackRange.Inclusive ? 1 : 0));
        break;
      }
    }
  }

  rollbackToSafePoint(): void {
    this.rollback(
      RollbackRange.Inclusive,
      (dialog) =>
        dialog.message.type !== "tool_use" &&
        dialog.message.type !== "tool_result"
    );
  }
}

export const enum RollbackRange {
  Inclusive = "inclusive",
  Exclusive = "exclusive",
}
