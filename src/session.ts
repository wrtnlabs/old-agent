import { Dialog } from "./chat_history";
import { MetaAgentSessionDelegate } from "./delegate";

export interface MetaAgentSessionManagerInit {}

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
  email?: string | undefined;
  username?: string | undefined;
  job?: string | undefined;
  timezone?: string | undefined;
  datetime?: string | undefined;
  gender?: string | undefined;
  birth_year?: number | undefined;
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
    // TODO
  }

  async start(
    options: MetaAgentSessionManagerStart
  ): Promise<MetaAgentSession> {
    // TODO
    return new MetaAgentSession();
  }
}

export class MetaAgentSession {
  constructor() {}

  async launch(signal?: AbortSignal): Promise<void> {}

  async abort(): Promise<void> {}
}
