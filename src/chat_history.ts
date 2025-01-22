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
