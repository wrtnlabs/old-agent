import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletion,
} from "openai/resources/chat/completions";
import {
  Backend,
  BackendKind,
  CompletionOptions,
  Connection,
  OpenAiBackendKind,
} from "../backend";
import { Message } from "../inputs/message";
import { Completion, CompletionMessage } from "../outputs/completion";
import { OpenAI } from "openai";
import { Tool, ToolParameter } from "../inputs/tool";
import {
  ChatCompletionToolChoiceOption,
  FunctionParameters,
} from "openai/resources";
import { readEnv } from "openai/core";

export class OpenAi implements Backend {
  private client: OpenAI;
  public readonly baseUrl: string;
  constructor(
    private readonly connection: Connection & { kind: OpenAiBackendKind }
  ) {
    this.baseUrl =
      this.connection.baseUrl ??
      readEnv("OPENAI_BASE_URL") ??
      "https://api.openai.com/v1";
    this.client = new OpenAI({
      apiKey: connection.apiKey,
      baseURL: this.baseUrl,
    });
  }
  kind(): BackendKind {
    return this.connection.kind;
  }

  async makeCompletion(
    _sessionId: string,
    _stageName: string,
    messages: Message[],
    options: CompletionOptions
  ): Promise<Completion> {
    const openAiMessages = buildMessages(messages);
    const tools = buildTools(options.tools);
    let tool_choice: ChatCompletionToolChoiceOption | undefined;
    switch (options.toolChoice?.type) {
      case "any": {
        tool_choice = "required";
        break;
      }
      case "one": {
        tool_choice = {
          type: "function",
          function: { name: options.toolChoice.name },
        };
        break;
      }
    }

    const startTime = performance.now();
    const response = await this.client.chat.completions.create(
      {
        model: this.connection.kind.model,
        temperature: options.temperature,
        frequency_penalty: options.frequencyPenalty,
        messages: openAiMessages,
        ...(options.jsonMode && { response_format: { type: "json_object" } }),
        ...(tools.length > 0 && { tools, parallel_tool_calls: false }),
        tool_choice,
      },
      {
        signal: options.signal,
      }
    );
    const endTime = performance.now();
    const {
      id,
      choices: [choice],
      model,
      usage,
    } = response;
    if (choice == null) {
      throw new Error("no choices");
    }
    return {
      completionId: id,
      model,
      messages: buildCompletionMessages(choice),
      usage: {
        inputTokens: usage?.prompt_tokens ?? 0,
        outputTokens: usage?.completion_tokens ?? 0,
      },
      isTruncated: choice.finish_reason === "length",
      modelResponseMs: endTime - startTime,
    };
  }
}

function buildMessages(messages: Message[]): ChatCompletionMessageParam[] {
  const msgs: ChatCompletionMessageParam[] = [];

  for (const message of messages) {
    const { role, name, content } = message;
    switch (content.type) {
      case "text": {
        msgs.push({
          role,
          name,
          content: [{ type: "text", text: content.text }],
        });
        break;
      }
      case "tool_use": {
        let last = msgs.at(-1);
        if (last?.role !== "assistant") {
          last = {
            role: "assistant",
            name,
            tool_calls: [],
          };
          msgs.push(last);
        }
        if (last.tool_calls == null) {
          last.tool_calls = [];
        }
        last.tool_calls.push({
          id: content.toolUseId,
          type: "function",
          function: {
            name: content.name,
            arguments: JSON.stringify(content.arguments),
          },
        });
        break;
      }
      case "tool_result": {
        msgs.push({
          role: "tool",
          tool_call_id: content.toolUseId,
          content: [
            {
              type: "text",
              text: JSON.stringify({
                is_error: content.isError,
                content: content.content,
              }),
            },
          ],
        });
      }
    }
  }

  return msgs;
}

function buildTools(tools: Iterable<Tool>): ChatCompletionTool[] {
  return Iterator.from(tools)
    .map(
      ({ name, description, parameters }): ChatCompletionTool => ({
        type: "function",
        function: {
          name,
          description,
          parameters: buildInputSchema(parameters),
        },
      })
    )
    .toArray();
}

function buildInputSchema(parameters: ToolParameter[]): FunctionParameters {
  const properties = Object.fromEntries(
    Iterator.from(parameters).map((p) => [p.name, p.schema])
  );
  const required = Iterator.from(parameters)
    .filter((p) => p.isRequired)
    .map((p) => p.name)
    .toArray();
  return {
    type: "object",
    properties,
    required,
  };
}

function buildCompletionMessages(
  choice: ChatCompletion.Choice
): CompletionMessage[] {
  const msgs: CompletionMessage[] = [];

  const {
    message: { content, role, tool_calls },
  } = choice;

  if (content != null) {
    msgs.push({
      type: "text",
      role,
      text: content,
    });
  }

  try {
    for (const toolCall of tool_calls || []) {
      if (toolCall.type === "function") {
        msgs.push({
          type: "tool_use",
          toolUseId: toolCall.id,
          toolName: toolCall.function.name,
          arguments: JSON.parse(toolCall.function.arguments),
        });
      }
    }
  } catch (err) {
    throw new Error("Invalid response format", { cause: err });
  }

  return msgs;
}
