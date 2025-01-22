import { Dialog } from "./chat_history";
import { OpenAiFunction } from "./function";

/**
 * Represents a read event.
 *
 * This event indicates that the agent is ready to receive a message.
 * Any [Request::Talk] request should be sent after receiving this event.
 * Requests sent before receiving this event will be silently ignored.
 */
export interface ReadEvent {}

/**
 * Represents a message event.
 */
export interface MessageEvent {
  /**
   *r" The dialog associated with the message event.
   *r
   *r" If you preserve the chat history, you can store this dialog somewhere,
   *r" and then use them later to initialize the session.
   */
  dialog: Dialog;
}

export interface CommitEvent {}

export interface RollbackEvent {}

export interface RollbackEvent {}

export interface ConnectorCallEvent {
  function: OpenAiFunction;
  args: unknown[];
}

export interface StatisticsEvent {
  stage?: string;
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
}
