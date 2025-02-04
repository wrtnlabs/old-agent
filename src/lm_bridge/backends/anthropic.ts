import {
  Backend,
  BackendKind,
  ClaudeBackendKind,
  CompletionOptions,
  Connection,
} from "../backend";
import { Message } from "../inputs/message";
import { Completion, CompletionMessage } from "../outputs/completion";
import { Tool, ToolParameter } from "../inputs/tool";
import AnthropicSdk from "@anthropic-ai/sdk";
import {
  MessageCreateParams,
  MessageParam,
  TextBlockParam,
  Tool as AnthropicTool,
} from "@anthropic-ai/sdk/resources";
export class Anthropic implements Backend {
  kind(): BackendKind {
    throw new Error("Method not implemented.");
  }

  async makeCompletion(
    connection: Connection & { kind: ClaudeBackendKind },
    _sessionId: string,
    _stageName: string,
    messages: Message[],
    options: CompletionOptions
  ): Promise<Completion> {
    const client = new AnthropicSdk({
      apiKey: connection.apiKey,
    });

    const lmMessages = buildMessages(messages);
    const tools = buildTools(options.tools);

    const toolChoice = ((): Pick<MessageCreateParams, "tool_choice"> => {
      switch (options.toolChoice?.type) {
        case "any": {
          return {
            tool_choice: {
              type: "any",
              disable_parallel_tool_use: true,
            },
          };
        }
        case "one": {
          return {
            tool_choice: {
              type: "tool",
              name: options.toolChoice.name,
              disable_parallel_tool_use: true,
            },
          };
        }
        default: {
          return {};
        }
      }
    })();
    const startTime = performance.now();
    const response = await client.messages.create(
      {
        max_tokens: 4096,
        messages: lmMessages.messages,
        model: connection.kind.model,
        system: lmMessages.systemPrompt,
        temperature: options.temperature,
        ...toolChoice,
        tools,
      },
      {
        signal: options.signal,
      }
    );
    const endTime = performance.now();
    const { id, content, model, usage, stop_reason } = response;

    return {
      completionId: id,
      model,
      messages: buildCompletionMessages(content),
      modelResponseTime: endTime - startTime,
      usage: {
        inputTokens: usage?.input_tokens ?? 0,
        outputTokens: usage?.output_tokens ?? 0,
        // cacheCreationInputTokens: usage?.cache_creation_input_tokens ?? 0,
        // cacheReadInputTokens: usage?.cache_read_input_tokens ?? 0,
      },
      isTruncated: stop_reason === "max_tokens",
    };
  }
}

function buildMessages(messages: Message[]): {
  messages: MessageParam[];
  systemPrompt: TextBlockParam[];
} {
  return messages.reduce<ReturnType<typeof buildMessages>>(
    (acc, cur) => {
      const { role, name, content } = cur;
      if (role === "system" && content.type === "text") {
        return {
          ...acc,
          systemPrompt: [
            ...acc.systemPrompt,
            { type: "text", text: content.text },
          ],
        };
      }
      if (role === "system") {
        return acc;
      }

      switch (content.type) {
        case "text": {
          return {
            ...acc,
            messages: [
              ...acc.messages,
              { role, name, content: [{ type: "text", text: content.text }] },
            ],
          };
        }
        case "tool_use": {
          return {
            ...acc,
            messages: [
              ...acc.messages,
              {
                role,
                content: [
                  {
                    type: "tool_use",
                    id: content.toolUseId,
                    name: content.name,
                    input: content.arguments,
                  },
                ],
              },
            ],
          };
        }
        case "tool_result": {
          return {
            ...acc,
            messages: [
              ...acc.messages,
              {
                role,
                content: [
                  {
                    type: "tool_result",
                    tool_use_id: content.toolUseId,
                    content: JSON.stringify(content.content),
                    is_error: content.isError,
                  },
                ],
              },
            ],
          };
        }
      }
    },
    {
      messages: [],
      systemPrompt: [],
    }
  );
}

function buildTools(tools: Iterable<Tool>): AnthropicTool[] {
  return Iterator.from(tools)
    .map(({ name, description, parameters }) => ({
      name,
      description,
      input_schema: buildInputSchema(parameters),
    }))
    .toArray();
}

function buildInputSchema(
  parameters: ToolParameter[]
): AnthropicTool.InputSchema {
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
  content: AnthropicSdk.Messages.ContentBlock[]
) {
  return content.map((v): CompletionMessage => {
    switch (v.type) {
      case "text": {
        return {
          type: "text",
          role: "assistant",
          text: v.text,
        };
      }
      case "tool_use": {
        return {
          type: "tool_use",
          toolUseId: v.id,
          toolName: v.name,
          arguments:
            typeof v.input === "string" ? JSON.parse(v.input) : v.input,
        };
      }
    }
  });
}
