import { Dialog } from "../chat_history";
import { Stage, StageContext } from "../core/stage";
import { OpenAiFunction } from "../function";
import { LmBridge, LmBridgeRequest } from "../lm_bridge/lm_bridge";
import { CompletionToolUseMessage } from "../lm_bridge/outputs/completion";
import { PlatformInfo } from "../session";
import { TOOLS } from "./agent/tools";
import { buildLangCodePrompt } from "./lang_code_prompt";

const TEMPERATURE = 0.2;
const FREQUENCY_PENALTY = 0.0;

export namespace Agent {
  export interface Input {
    platformInfo: PlatformInfo;
    userQuery?: string;
    lastFailure?: string;
    histories: Dialog[];
  }

  export interface Output {
    actions: AgentAction[];
  }
}

export type AgentAction =
  | { type: "chat"; message: string }
  | {
      type: "lookup_functions";
      functionCall: CompletionToolUseMessage;
      thoughts: string;
      queries: { query: string; specifications?: string }[];
    }
  | {
      type: "run_functions";
      functionCall: CompletionToolUseMessage;
      thoughts: string;
      items: { purpose: string; function: OpenAiFunction }[];
    };

export class Agent implements Stage<Agent.Input, Agent.Output> {
  identifier: string = "agent";

  private lmBridge: LmBridge;

  constructor() {
    this.lmBridge = new LmBridge(TEMPERATURE, false, TOOLS);
  }

  async execute(
    input: Agent.Input,
    context: StageContext
  ): Promise<Agent.Output> {
    const systemPrompt = await context.getPrompt("v2-agent");
    const platformInfoPrompt = await context.getPrompt(
      "v2-agent-platform-info",
      {
        platform_info: JSON.stringify(input.platformInfo, undefined, 2),
      }
    );
    const langCodePrompt = buildLangCodePrompt(context.langCode);

    const actions = await callLlm(
      this,
      context,
      input,
      { systemPrompt, platformInfoPrompt, langCodePrompt },
      {
        connection: context.llmConnection,
        sessionId: context.sessionId,
        stageName: this.identifier,
        frequencyPenalty: FREQUENCY_PENALTY,
      }
    );

    throw new Error("Method not implemented.");
  }
}

// TODO: dummy interface
async function callLlm(
  stage: unknown,
  ctx: StageContext,
  input: Agent.Input,
  prompts: Record<string, string>,
  request: Omit<LmBridgeRequest, "messages">
): Promise<AgentAction[]> {
  return [];
}
