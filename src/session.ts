import { Dialog } from "./chat_history";
import { CostDetail } from "./core/cost_detail";
import { MetaAgentSessionDelegate } from "./delegate";
import { BackendKind } from "./lm_bridge/backend";

export interface MetaAgentSessionManagerInit {}

export interface MetaAgentSessionManagerStart {
  host?: string;
  llmBackendKind: BackendKind["kind"];
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
  }

  async start(
    options: MetaAgentSessionManagerStart
  ): Promise<SessionStageContextWrapWrapper> {
    const connection: BackendKind = (() => {
      switch (options.llmBackendKind) {
        case "openai":
          return {
            kind: "openai",
            apiKey: options.llmApiKey,
            model: "gpt-4o-2024-11-20",
          };
        case "claude":
          return {
            kind: "claude",
            apiKey: options.llmApiKey,
            model: "claude-3-5-sonnet-20241022",
          };
      }
    })();

    const param = {
      connection,
      promptSet: [],
      connectorProvider: options.delegate,
      sessionId: options.sessionId,
      platformInfo: options.platformInfo,
      userContext: options.initialInformation,
      initialHistory: options.dialogs,
    };
    // ^?
    return new SessionStageContextWrapWrapper(param);
  }
}

export class MetaAgentSession {
  constructor() {}

  // async launch(signal?: AbortSignal): Promise<void> {}

  async abort(): Promise<void> {}
}

export interface SessionStageContextWrapWrapperOptions {
  connection: BackendKind;
  promptSet: never[];
  connectorProvider: MetaAgentSessionDelegate;
  sessionId: string;
  platformInfo: PlatformInfo;
  userContext: InitialInformation | undefined;

  initialHistory: Dialog[];
}

export class SessionStageContextWrapWrapper {
  constructor(
    private readonly options: SessionStageContextWrapWrapperOptions
  ) {}

  free(): void {
    this.options;
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
