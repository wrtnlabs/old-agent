import { expect } from "vitest";
import { Connection } from "../../backend";
import { LmBridge } from "../../lm_bridge";
import { Tool } from "../../inputs/tool";
import { Message } from "../../inputs/message";

function assertIsDefined<T>(value: T): asserts value is NonNullable<T> {
  expect(value).toBeDefined();
}

export async function testNoSysNoJson(
  connection: Connection,
  f: (jsonMode: boolean, tools: Tool[]) => LmBridge
): Promise<void> {
  const lmBridge = f(false, []);
  const response = await lmBridge.request({
    connection,
    sessionId: "test_no_sys_no_json",
    stageName: "first",
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: "Hello! I'm calling you for testing my LLM wrapping library. Could you tell me something?",
        },
      },
    ],
  });
  expect(response.messages).toHaveLength(1);

  const message = response.messages[0];
  assertIsDefined(message);
  if (message.type !== "text") {
    expect.fail("text", message.type);
  }
  expect(message.text).not.toHaveLength(0);
}

export async function testNoSysWithJson(
  connection: Connection,
  f: (jsonMode: boolean, tools: Tool[]) => LmBridge
): Promise<void> {
  const lmBridge = f(true, []);
  const response = await lmBridge.request({
    connection,
    sessionId: "test_no_sys_with_json",
    stageName: "first",
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: "Hello! I'm calling you for testing my LLM wrapping library. Could you tell me something? Please respond in JSON.",
        },
      },
    ],
  });
  expect(response.messages).toHaveLength(1);

  const message = response.messages[0];
  assertIsDefined(message);
  if (message.type !== "text") {
    expect.fail("text", message.type);
  }
  expect(message.text).not.toHaveLength(0);

  const result = JSON.parse(message.text);
  expect(result).not.toBeNull();
}

export async function testWithSysNoJson(
  connection: Connection,
  f: (jsonMode: boolean, tools: Tool[]) => LmBridge
): Promise<void> {
  const lmBridge = f(false, []);
  const response = await lmBridge.request({
    connection,
    sessionId: "test_with_sys_no_json",
    stageName: "first",
    messages: [
      {
        role: "system",
        content: {
          type: "text",
          text: "Your tone must be rougher than the user.",
        },
      },
      {
        role: "user",
        content: {
          type: "text",
          text: "Hello! I'm calling you for testing my LLM wrapping library. Could you tell me something?",
        },
      },
    ],
  });
  expect(response.messages).toHaveLength(1);

  const message = response.messages[0];
  assertIsDefined(message);
  if (message.type !== "text") {
    expect.fail("text", message.type);
  }
  expect(message.text).not.toHaveLength(0);
}

export async function testWithSysWithJson(
  connection: Connection,
  f: (jsonMode: boolean, tools: Tool[]) => LmBridge
): Promise<void> {
  const lmBridge = f(true, []);
  const response = await lmBridge.request({
    connection,
    sessionId: "test_with_sys_with_json",
    stageName: "first",
    messages: [
      {
        role: "system",
        content: {
          type: "text",
          text: "Your tone must be rougher than the user. Respond in JSON.",
        },
      },
      {
        role: "user",
        content: {
          type: "text",
          text: "Hello! I'm calling you for testing my LLM wrapping library. Could you tell me something? Please respond in JSON.",
        },
      },
    ],
  });
  expect(response.messages).toHaveLength(1);

  const message = response.messages[0];
  assertIsDefined(message);
  if (message.type !== "text") {
    expect.fail("text", message.type);
  }
  expect(message.text).not.toHaveLength(0);

  const result = JSON.parse(message.text);
  expect(result).not.toBeNull();
}

export async function testToolUse(
  connection: Connection,
  f: (jsonMode: boolean, tools: Tool[]) => LmBridge
): Promise<void> {
  const lmBridge = f(false, [
    {
      name: "add",
      description: "Add two numbers",
      parameters: [
        { name: "a", schema: { type: "number" }, isRequired: true },
        { name: "b", schema: { type: "number" }, isRequired: true },
      ],
    },
  ]);
  const response = await lmBridge.request({
    connection,
    sessionId: "test_tool_use",
    stageName: "first",
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: "Hello! I'm calling you for testing my LLM wrapping library. Could you execute any of function (tool use) do you have?",
        },
      },
    ],
    toolChoice: { type: "any" },
  });
  expect(response.messages).toHaveLength(1);

  const message = response.messages[0];
  assertIsDefined(message);
  if (message.type !== "tool_use") {
    expect.fail("tool_use", message.type);
  }

  expect(message.toolName).not.toHaveLength(0);
  expect(message.arguments).toHaveProperty("a");
  expect(message.arguments).toHaveProperty("b");
  const { a: lhs, b: rhs } = message.arguments as { a: number; b: number };
  const result = lhs + rhs;

  const messages: Message[] = [
    {
      role: "user",
      content: {
        type: "text",
        text: "Hello! I'm calling you for testing my LLM wrapping library. Could you execute any of function (tool use) do you have?",
      },
    },
    {
      role: "assistant",
      content: {
        type: "tool_use",
        toolUseId: message.toolUseId,
        name: message.toolName,
        arguments: message.arguments,
      },
    },
    {
      role: "user",
      content: {
        type: "tool_result",
        isError: false,
        toolUseId: message.toolUseId,
        content: result,
      },
    },
  ];
  const response2 = await lmBridge.request({
    connection,
    sessionId: "test_tool_use",
    stageName: "second",
    messages,
  });
  expect(response2.messages).toHaveLength(1);
}

export async function testParallelToolUse(
  connection: Connection,
  f: (jsonMode: boolean, tools: Tool[]) => LmBridge
): Promise<void> {
  const lmBridge = f(false, [
    {
      name: "add",
      description: "Add two numbers",
      parameters: [
        { name: "a", schema: { type: "number" }, isRequired: true },
        { name: "b", schema: { type: "number" }, isRequired: true },
      ],
    },
    {
      name: "subtract",
      description: "Subtract two numbers",
      parameters: [
        { name: "a", schema: { type: "number" }, isRequired: true },
        { name: "b", schema: { type: "number" }, isRequired: true },
      ],
    },
  ]);
  const response = await lmBridge.request({
    connection,
    sessionId: "test_parallel_tool_use",
    stageName: "first",
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: "Hello! I'm calling you for testing my LLM wrapping library. Could you execute all of functions (tool use) do you have?",
        },
      },
    ],
    toolChoice: { type: "any" },
  });
  expect(response.messages).toHaveLength(1);

  const message = response.messages[0];
  assertIsDefined(message);
  if (message.type !== "tool_use") {
    expect.fail("tool_use", message.type);
  }

  expect(message.toolName).not.toHaveLength(0);
  const { a: lhs, b: rhs } = message.arguments as { a: number; b: number };
  let result: number;
  switch (message.toolName) {
    case "add":
      result = lhs + rhs;
      break;
    case "subtract":
      result = lhs - rhs;
      break;
    default:
      expect.fail("add or subtract", message.toolName);
  }

  const messages: Message[] = [
    {
      role: "user",
      content: {
        type: "text",
        text: "Hello! I'm calling you for testing my LLM wrapping library. Could you execute all of functions (tool use) do you have?",
      },
    },
    {
      role: "assistant",
      content: {
        type: "tool_use",
        toolUseId: message.toolUseId,
        name: message.toolName,
        arguments: message.arguments,
      },
    },
    {
      role: "user",
      content: {
        type: "tool_result",
        isError: false,
        toolUseId: message.toolUseId,
        content: result,
      },
    },
  ];
  const response2 = await lmBridge.request({
    connection,
    sessionId: "test_parallel_tool_use",
    stageName: "second",
    messages,
  });
  expect(response2.messages).toHaveLength(1);
}

export async function testConsecutiveAssistantMessages(
  connection: Connection,
  f: (jsonMode: boolean, tools: Tool[]) => LmBridge
): Promise<void> {
  const lmBridge = f(false, []);
  const response = await lmBridge.request({
    connection,
    sessionId: "test_consecutive_assistant_messages",
    stageName: "first",
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: "Hello! I'm calling you for testing my LLM wrapping library. Could you tell me something?",
        },
      },
      {
        role: "assistant",
        content: {
          type: "text",
          text: "Sure! I'm here to help you with that.",
        },
      },
      {
        role: "assistant",
        content: {
          type: "text",
          text: "Ok, it seems it is working!",
        },
      },
      {
        role: "user",
        content: {
          type: "text",
          text: "I'm glad to hear that!",
        },
      },
    ],
  });
  expect(response.messages).toHaveLength(1);

  const message = response.messages[0];
  assertIsDefined(message);
  if (message.type !== "text") {
    expect.fail("text", message.type);
  }
  expect(message.text).not.toHaveLength(0);
}
