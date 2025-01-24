import { ChatHistory, Dialog, RollbackRange } from "./chat_history";
import { MetaAgentSessionDelegate } from "./delegate";
import { AgentLogger } from "./logger";

export class DialogEmitter {
  constructor(
    private _history: ChatHistory,
    private delegate: MetaAgentSessionDelegate,
    private logger: AgentLogger
  ) {}

  history(): ChatHistory {
    return this._history.clone();
  }

  async rollbackUserInput() {
    this._history.rollback(
      RollbackRange.Exclusive,
      ({ message: { type } }) => type !== "tool_use" && type !== "tool_result"
    );
    await this.delegate.onRollback?.({});
  }

  async emit(dialog: Dialog) {
    this._history.appendDialog({ ...dialog });
    await this.delegate.onMessage?.({ dialog: { ...dialog } });
  }

  async commit() {
    this.logger.debug("Committing the chat history");
    await this.delegate.onCommit?.({});
  }
}
