import { Dialog, dialogToInputMessage } from "../chat_history";
import { Stage, StageContext, StageError } from "../core/stage";
import { OpenAiFunction } from "../core/connector";
import { LmBridge } from "../lm_bridge/lm_bridge";
import {
  Completion,
  CompletionMessage,
  CompletionTextMessage,
  CompletionToolUseMessage,
} from "../lm_bridge/outputs/completion";
import { PlatformInfo } from "../session";
import { TOOLS } from "./agent/tools";
import { buildLangCodePrompt } from "./lang_code_prompt";
import { Message } from "../lm_bridge/inputs/message";
import typia, { validate } from "typia";
import { buildUserContextPrompt } from "./user_context_prompt";
import { IHttpLlmFunction, ILlmSchema } from "@samchon/openapi";

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

  constructor() {}

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
    const lmBridge = new LmBridge({
      temperature: TEMPERATURE,
      jsonMode: false,
      tools: TOOLS,
      logger: ctx.logger,
    });
    const MAX_RETRY = 5;

    let validationFailure: null | {
      assistantResponse: CompletionMessage;
      feedback: string;
    } = null;

    outer: for (let retryIndex = 0; retryIndex < MAX_RETRY; retryIndex++) {
      const messages = this.buildMessage(ctx, input, prompt, validationFailure);
      const response: Completion = await lmBridge.request({
        connection: ctx.llmConnection,
        sessionId: ctx.sessionId,
        stageName: this.identifier,
        messages,
        frequencyPenalty: FREQUENCY_PENALTY,
        signal: ctx.signal,
      });

      if (response.messages.length <= 0) {
        ctx.logger.warn("agent response is empty; retrying");
        validationFailure = {
          assistantResponse: {
            role: "assistant",
            type: "text",
            text: "<empty response>",
          },
          feedback: "you did not provide a valid response",
        };
        continue outer;
      }

      const responseList: AgentAction[] = [];

      for (const message of response.messages) {
        try {
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
        } catch (err) {
          if (err instanceof Error) {
            ctx.logger.warn(
              "agent returned invalid response with %s message; retrying; error=%o",
              message.type,
              err
            );
            validationFailure = {
              assistantResponse: message,
              feedback: err.message,
            };
            continue outer;
          } else {
            throw new Error("unexpected error", { cause: err });
          }
        }
      }

      return responseList;
    }
    throw new StageError("max retry count reached");
  }

  private buildMessage(
    ctx: StageContext,
    input: Agent.Input,
    prompt: AgentPrompt,
    validationFailure: null | {
      assistantResponse: CompletionMessage;
      feedback: string;
    }
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
        ? (() => {
            switch (validationFailure.assistantResponse.type) {
              case "text":
                return [
                  {
                    role: "assistant",
                    content: {
                      type: "text",
                      text: validationFailure.assistantResponse.text,
                    },
                  },
                  {
                    role: "user",
                    content: {
                      type: "text",
                      text: validationFailure.feedback,
                    },
                  },
                ] satisfies Message[];
              case "tool_use":
                return [
                  {
                    role: "assistant",
                    content: {
                      type: "tool_use",
                      toolUseId: validationFailure.assistantResponse.toolUseId,
                      name: validationFailure.assistantResponse.toolName,
                      arguments: validationFailure.assistantResponse.arguments,
                    },
                  },
                  {
                    role: "user",
                    content: {
                      type: "tool_result",
                      toolUseId: validationFailure.assistantResponse.toolUseId,
                      isError: true,
                      content: validationFailure.feedback,
                    },
                  },
                ] satisfies Message[];
            }
          })()
        : []
    ) satisfies Message[];

    return [
      ...prevMessages,
      ...baseMessage,
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
            `[parsing JSON] your response contains invalid syntax:\n${typia.json.stringify(validatedArguments.errors)}`
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
            function_id: string;
          }[];
        }>(toolUse.arguments);
        if (!validatedArguments.success) {
          throw new Error(
            `[parsing JSON] your response contains invalid syntax:\n${typia.json.stringify(validatedArguments.errors)}`
          );
        }
        const { thoughts, items } = validatedArguments.data;
        const validateFunctionId = (
          id: string
        ):
          | { success: true; data: string }
          | { success: false; reason: string } => {
          const m = id.match(/^(get|post|patch|put|delete)(:|\/)(.*)$/i);
          if (m === undefined || m === null) {
            return {
              success: false,
              reason: `invalid function id: ${id}; function id must be in the format of /^(get|post|patch|put|delete)(:)(.*)$/`,
            };
          }
          const [, method, sep, rest] = m;
          if (sep === ":") {
            return {
              success: true,
              data: id,
            };
          }
          return {
            success: true,
            data: `${method}:${rest}`,
          };
        };
        const functions = await Promise.all(
          items.map(async (v) => {
            const validatedFunctionId = (() => {
              const validated = validateFunctionId(v.function_id);

              if (validated.success) {
                return validated.data;
              }

              if (
                typia.is<`${IHttpLlmFunction<ILlmSchema.Model>["method"]}/${string}`>(
                  v.function_id
                )
              ) {
                const splited = v.function_id.split("/");
                return `${splited[0]}:${splited.slice(1).join("/")}`;
              }

              throw new Error(
                `your response contains an invalid function id \`${v.function_id}\`; reason: \n${typia.json.stringify(validated.reason)}`
              );
            })();

            const func = await ctx.findFunction(
              ctx.sessionId,
              validatedFunctionId
            );
            if (!func) {
              throw new Error(
                `your response contains an invalid function id \`${v.function_id}\`; which does not exist in the list of available functions`
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
        throw new StageError(
          `invalid tool name: ${toolUse.toolName}; it is not supported`
        );
    }
  }
}
