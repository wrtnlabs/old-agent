import { ChatHistory, Dialog } from "./chat_history";
import { CostDetail } from "./core/cost_detail";
import { MetaAgentSessionDelegate } from "./delegate";
import { BackendKind, Connection } from "./lm_bridge/backend";
import { PromptSet } from "./prompt_set";
import { SessionInput, StageGroup } from "./session_impl";

export interface MetaAgentSessionManagerInit {
  promptSet: PromptSet;
}

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
  private _stages = new StageGroup();
  private _promptSet: PromptSet;

  constructor(options: MetaAgentSessionManagerInit) {
    this._promptSet = options.promptSet;
  }

  start(options: MetaAgentSessionManagerStart): MetaAgentSession {
    const connection: Connection = (() => {
      switch (options.llmBackendKind) {
        case "openai":
          return {
            kind: { kind: "openai", model: "gpt-4o-2024-11-20" },
            apiKey: options.llmApiKey,
          };
        case "claude":
          return {
            kind: { kind: "claude", model: "claude-3-5-sonnet-20241022" },
            apiKey: options.llmApiKey,
          };
      }
    })();

    return new MetaAgentSessionImpl(
      this._stages,
      connection,
      this._promptSet,
      options.delegate,
      options.sessionId,
      options.platformInfo,
      options.initialInformation || {},
      new ChatHistory(options.dialogs)
    );
  }
}

export interface MetaAgentSession {
  launch(signal?: AbortSignal): Promise<void>;
  compute_cost(): CostDetail;
  abort(): Promise<void>;
}

class MetaAgentSessionImpl implements MetaAgentSession, SessionInput {
  constructor(
    private stages: StageGroup,
    public connection: Connection,
    public promptSet: PromptSet,
    public delegate: MetaAgentSessionDelegate,
    public sessionId: string,
    public platformInfo: PlatformInfo,
    public userContext: InitialInformation,
    public initialHistory: ChatHistory
  ) {}

  /**
   * @param {AbortSignal | undefined} [signal]
   * @returns {Promise<void>}
   */
  launch(signal?: AbortSignal): Promise<void> {
    return this.stages.run(this, signal);
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
