import { JsonValue } from "./core/types";
import {
  CommitEvent,
  ConnectorCallEvent,
  MessageEvent,
  ReadEvent,
  RollbackEvent,
  StatisticsEvent,
} from "./event";
import { OpenAiFunction, OpenAiFunctionSummary } from "./core/connector";

export interface MetaAgentSessionDelegate {
  onError?(event: Error): void;
  onRead(event: ReadEvent): Promise<string>;
  onMessage?(event: MessageEvent): Promise<void>;
  onCommit?(event: CommitEvent): Promise<void>;
  onRollback?(event: RollbackEvent): Promise<void>;
  onConnectorCall(event: ConnectorCallEvent): Promise<JsonValue>;
  onStatistics?(event: StatisticsEvent): void;

  findFunction(
    sessionId: string,
    name: string,
    options: RequestOptions
  ): Promise<OpenAiFunction | undefined>;
  queryFunctions(
    query: FunctionQuery,
    options: RequestOptions
  ): Promise<OpenAiFunctionSummary[]>;
}

export interface FunctionQuery {
  sessionId: string;
}

export interface RequestOptions {
  /**
   * A signal that allows you to communicate with an asynchronous operation and abort it if desired.
   *
   * Please use this signal to a fetch request, so that the agent can cancel the request if needed.
   */
  signal?: AbortSignal;
}
