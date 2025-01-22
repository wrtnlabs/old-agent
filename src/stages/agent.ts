import { Dialog, dialogToInputMessage } from "../chat_history";
import { Stage, StageContext } from "../core/stage";
import { OpenAiFunction } from "../core/connector";
import { LmBridge } from "../lm_bridge/lm_bridge";
import {
  Completion,
  CompletionTextMessage,
  CompletionToolUseMessage,
} from "../lm_bridge/outputs/completion";
import { PlatformInfo } from "../session";
import { TOOLS } from "./agent/tools";
import { buildLangCodePrompt } from "./lang_code_prompt";
import { Message } from "../lm_bridge/inputs/message";
import { validate } from "typia";

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

type AgentPrompt = {
  systemPrompt: string;
  platformInfoPrompt: string;
  langCodePrompt: string;
};

export type AgentAction =
  | AgentChatAction
  | AgentLookupFunctionsAction
  | AgentRunFunctionsAction;

export interface AgentBaseAction<T extends string> {
  type: T;
}

export interface AgentChatAction extends AgentBaseAction<"chat"> {
  message: string;
}

export interface AgentLookupFunctionsAction
  extends AgentBaseAction<"lookup_functions"> {
  functionCall: CompletionToolUseMessage;
  thoughts: string;
  queries: { query: string; specifications?: string }[];
}

export interface AgentRunFunctionsAction
  extends AgentBaseAction<"run_functions"> {
  functionCall: CompletionToolUseMessage;
  thoughts: string;
  items: { purpose: string; function: OpenAiFunction }[];
}

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
    const actions = await this.callLm(
      input,
      context,
      await this.buildPrompt(context, input)
    );

    return {
      actions,
    };
  }

  private async buildPrompt(ctx: StageContext, input: Agent.Input) {
    return {
      systemPrompt: await ctx.getPrompt("v2-agent"),
      platformInfoPrompt: await ctx.getPrompt("v2-agent-platform-info", {
        platform_info: JSON.stringify(input.platformInfo, undefined, 2),
      }),
      langCodePrompt: buildLangCodePrompt(ctx.langCode),
    };
  }

  private async callLm(
    input: Agent.Input,
    ctx: StageContext,
    prompt: AgentPrompt
  ): Promise<AgentAction[]> {
    const MAX_RETRY = 5;

    let validationFailure: null | {
      assistantResponse: CompletionMessage;
      feedback: string;
    } = null;

    outer: for (let retryIndex = 0; retryIndex < MAX_RETRY; retryIndex++) {
      const messages = this.buildMessage(ctx, input, prompt);
      const response: Completion = await this.lmBridge.request({
        connection: ctx.llmConnection,
        sessionId: ctx.sessionId,
        stageName: this.identifier,
        messages,
        frequencyPenalty: FREQUENCY_PENALTY,
      });

      const message = response.messages.at(0);
      if (message == null) {
        console.warn("agent response is empty; retrying");
        validationFailure = {
          assistantResponse: {
            role: "assistant",
            content: {
              type: "text",
              text: "<empty response>",
            },
          },
          feedback: "you did not provide a valid response",
        };
        continue outer;
      }

      if (message.type !== "text") {
        console.warn("connector finder response is not text; retrying");

        validationFailure = {
          assistantResponse: {
            role: "assistant",
            content: {
              type: "text",
              text: "<non-text response>",
            },
          },
          feedback: "expected text message; got something else",
        };
        continue outer;
      }
      if (message.text.includes("\n")) {
        console.warn("connector finder response contains newline; retrying");

        validationFailure = {
          assistantResponse: {
            role: "assistant",
            content: {
              type: "text",
              text: message.text,
            },
          },
          feedback:
            "you didn't escape the response correctly; please correctly escape all strings in the response",
        };
        continue outer;
      }
      let output;
      try {
        output = JSON.parse(message.text);
      } catch (err) {
        validationFailure = {
          assistantResponse: {
            role: "assistant",
            content: {
              type: "text",
              text: message.text,
            },
          },
          feedback: `"your response is invalid JSON: ${err}"`,
        };
        continue outer;
      }

      console.info("connector finder output=%o", output);

      const responseList: AgentAction[] = [];

      for (const message of response.messages) {
        switch (message.type) {
          case "text": {
            const action = await this.onText(message);
            responseList.push(action);
            break;
          }
          case "tool_use": {
            const action = await this.onToolUse(ctx, message);
            responseList.push(action);
            break;
          }
        }
      }

      return responseList;
    }
    throw new Error(
      `LLM returned invalid response: ${validationFailure?.feedback ?? ""}`
    );
  }

  private buildMessage(
    ctx: StageContext,
    input: Agent.Input,
    prompt: AgentPrompt,
    validationFailure: null | {
      assistantResponse: Message;
      feedback: string;
    } = null
  ): Message[] {
    const prevMessages = input.histories.map((dialog) =>
      dialogToInputMessage(dialog)
    );
    const baseMessage = [
      {
        role: "system",
        content: {
          type: "text",
          text: prompt.systemPrompt,
        },
      },
      {
        role: "user",
        content: {
          type: "text",
          text: prompt.platformInfoPrompt,
        },
      },
      {
        role: "system",
        content: {
          type: "text",
          text: buildUserContextPrompt(ctx.userContext),
        },
      },
      {
        role: "system",
        content: {
          type: "text",
          text: prompt.langCodePrompt,
        },
      },
    ] satisfies Message[];

    const queryMessage = (
      input.userQuery
        ? [
            {
              role: "user",
              content: {
                type: "text",
                text: input.userQuery,
              },
            },
          ]
        : []
    ) satisfies Message[];

    const validationPrompt = (
      validationFailure
        ? [
            {
              role: "assistant",
              content: validationFailure.assistantResponse.content,
            },
            {
              role: "user",
              content: {
                type: "text",
                text: validationFailure.feedback,
              },
            },
          ]
        : []
    ) satisfies Message[];

    return [
      ...baseMessage,
      ...prevMessages,
      ...queryMessage,
      ...validationPrompt,
    ];
  }

  private onText(text: CompletionTextMessage): AgentAction {
    return {
      type: "chat",
      message: text.text,
    };
  }

  private async onToolUse(
    ctx: StageContext,
    toolUse: CompletionToolUseMessage
  ): Promise<AgentAction> {
    switch (toolUse.toolName) {
      case "lookup_functions": {
        const validatedArguments = validate<{
          thoughts: string;
          queries: {
            query: string;
            specifications?: string;
          }[];
        }>(toolUse.arguments);
        if (!validatedArguments.success) {
          throw new Error(
            `[parsing JSON] your response contains invalid syntax:\n${validatedArguments.errors}`
          );
        }

        const { thoughts, queries } = validatedArguments.data;
        return {
          type: "lookup_functions",
          functionCall: toolUse,
          thoughts,
          queries: queries.map((v) => {
            return {
              query: v.query,
              specifications: v.specifications,
            };
          }),
        };
      }
      case "run_functions": {
        const validatedArguments = validate<{
          thoughts: string;
          items: {
            purpose: string;
            functionId: string;
          }[];
        }>(toolUse.arguments);
        if (!validatedArguments.success) {
          throw new Error(
            `[parsing JSON] your response contains invalid syntax:\n${validatedArguments.errors}`
          );
        }
        const { thoughts, items } = validatedArguments.data;
        const functions = await Promise.all(
          items.map(async (v) => {
            const func = await ctx.findFunction(ctx.sessionId, v.functionId);
            if (!func) {
              throw new Error(
                `your response contains an invalid function id \`${v.functionId}\`; which does not exist in the list of available functions`
              );
            }
            return {
              purpose: v.purpose,
              function: func,
            };
          })
        );

        return {
          type: "run_functions",
          functionCall: toolUse,
          thoughts,
          items: functions,
        };
      }

      default:
        throw new Error(
          `invalid tool name: ${toolUse.toolName}; it is not supported`
        );
    }
  }
}
