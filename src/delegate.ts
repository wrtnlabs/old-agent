import {
  CommitEvent,
  ConnectorCallEvent,
  MessageEvent,
  ReadEvent,
  RollbackEvent,
  StatisticsEvent,
} from "./event";
import { OpenAiFunction, OpenAiFunctionSummary } from "./function";

export interface MetaAgentSessionDelegate {
  onError?(event: Error): void;
  onRead?(event: ReadEvent): Promise<string>;
  onMessage?(event: MessageEvent): Promise<void>;
  onCommit?(event: CommitEvent): Promise<void>;
  onRollback?(event: RollbackEvent): Promise<void>;
  onConnectorCall?(event: ConnectorCallEvent): Promise<unknown>;
  onStatistics?(event: StatisticsEvent): void;

  findFunction(
    sessionId: string,
    name: string
  ): Promise<OpenAiFunction | undefined>;
  queryFunctions(query: FunctionQuery): Promise<OpenAiFunctionSummary[]>;
}

export interface FunctionQuery {
  sessionId: string;
}
