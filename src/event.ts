import { Dialog } from "./chat_history";
import { JsonValue } from "./core/types";
import { OpenAiFunction } from "./core/connector";

/**
 * Represents a read event.
 *
 * This event indicates that the agent is ready to receive a message.
 * Any [Request::Talk] request should be sent after receiving this event.
 * Requests sent before receiving this event will be silently ignored.
 */
export interface ReadEvent {
  /**
   * A signal that allows you to communicate with an asynchronous operation and abort it if desired.
   *
   * Please use this signal to a fetch request, so that the agent can cancel the request if needed.
   */
  signal?: AbortSignal;
}

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
  args: JsonValue[];
  /**
   * A signal that allows you to communicate with an asynchronous operation and abort it if desired.
   *
   * Please use this signal to a fetch request, so that the agent can cancel the request if needed.
   */
  signal?: AbortSignal;
}

export interface StatisticsEvent {
  stage?: string;
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
}
