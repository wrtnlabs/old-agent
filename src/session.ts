import { Dialog } from "./chat_history";
import { CostDetail } from "./core/cost_detail";
import { MetaAgentSessionDelegate } from "./delegate";

export interface MetaAgentSessionManagerInit {
  signal: AbortSignal;
}

export interface MetaAgentSessionManagerStart {
  host?: string;
  llmBackendKind: string;
  llmApiKey: string;
  sessionId: string;
  platformInfo: PlatformInfo;
  initialInformation?: InitialInformation;
  dialogs: Dialog[];
  delegate: MetaAgentSessionDelegate;
}

export interface InitialInformation {
  email?: string;
  username?: string;
  job?: string;
  timezone?: string;
  datetime?: string;
  gender?: string;
  birth_year?: number;
  lang_code?: string;
}

/**
 * Platform Information
 */
export interface PlatformInfo {
  prompt: string;
}

export class MetaAgentSessionManager {
  constructor(options: MetaAgentSessionManagerInit) {
    options;
    throw new Error("Not implemented");
  }

  async start(
    options: MetaAgentSessionManagerStart
  ): Promise<SessionStageContextWrapWrapper> {
    options;
    return new SessionStageContextWrapWrapper();
  }
}

export class MetaAgentSession {
  constructor() {}

  // async launch(signal?: AbortSignal): Promise<void> {}

  async abort(): Promise<void> {}
}

export class SessionStageContextWrapWrapper {
  free(): void {
    return;
  }
  /**
   * @param {AbortSignal | undefined} [signal]
   * @returns {Promise<void>}
   */
  launch(signal?: AbortSignal): Promise<void> {
    signal;
    return Promise.resolve();
  }
  /**
   * @returns {CostDetail}
   */
  compute_cost(): CostDetail {
    return { total: { cost: 0, inputTokens: 0, outputTokens: 0 } };
  }
  /**
   * Abort the current speech.
   *
   * This will cause the read event to be emitted to resume from the user input.
   * @returns {Promise<void>}
   */
  abort(): Promise<void> {
    return Promise.resolve();
  }
}
