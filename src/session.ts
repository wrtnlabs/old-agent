import { ChatHistory, Dialog } from "./chat_history";
import { CostDetail } from "./core/cost_detail";
import { MetaAgentSessionDelegate } from "./delegate";
import { BackendKind, Connection } from "./lm_bridge/backend";
import { AgentLogger } from "./logger";
import { PromptSet } from "./prompt_set";
import { SessionInput, StageGroup } from "./session_impl";

export interface MetaAgentSessionManagerInit {
  promptSet: PromptSet;
  logger: AgentLogger;
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
  private _logger: AgentLogger;

  constructor(readonly options: MetaAgentSessionManagerInit) {
    this._promptSet = options.promptSet;
    this._logger = options.logger;
  }

  /**
   * Make a new session.
   *
   * Until the session is launched, the conversation is not started.
   */
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
      new ChatHistory(options.dialogs),
      this._logger
    );
  }
}

export interface MetaAgentSession {
  /**
   * Launch the session to start the conversation.
   *
   * This method will be blocked until all the conversation is finished.
   * If you want to stop the conversation, you need to call the `AbortController.abort()` on the signal passed to this method.
   *
   * Please call this method only once.
   */
  launch(signal?: AbortSignal): Promise<void>;

  /**
   * Compute the consumed cost of the current session, from the time of the last launch.
   */
  compute_cost(): CostDetail;

  /**
   * Abort the current speech.
   *
   * This will cause the read event to be emitted to resume from the user input.
   *
   * Note that this method will not stop the launch method.
   * to stop it, you need to call `AbortController.abort()` on the signal passed to the launch method.
   */
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
    public initialHistory: ChatHistory,
    public logger: AgentLogger
  ) {}

  launch(signal?: AbortSignal): Promise<void> {
    return this.stages.run(this, signal);
  }

  compute_cost(): CostDetail {
    return { total: { cost: 0, inputTokens: 0, outputTokens: 0 } };
  }

  abort(): Promise<void> {
    return Promise.resolve();
  }
}
