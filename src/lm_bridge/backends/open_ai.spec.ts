import { describe, test } from "vitest";
import { LmBridge } from "../lm_bridge";
import { Tool } from "../inputs/tool";
import {
  testConsecutiveAssistantMessages,
  testNoSysNoJson,
  testNoSysWithJson,
  testParallelToolUse,
  testToolUse,
  testWithSysNoJson,
  testWithSysWithJson,
} from "./common.spec";
import { Connection, OpenAiModel } from "../backend";

function connection(modelKind: OpenAiModel): Connection {
  return {
    kind: { kind: "openai", model: modelKind },
    apiKey: process.env["OPENAI_API_KEY"]!,
  };
}

function lmBridge(jsonMode: boolean, tools: readonly Tool[]) {
  return new LmBridge(0.8, jsonMode, tools);
}

describe("OpenAi", () => {
  describe.for<[string, OpenAiModel]>([
    ["GPT4o", "gpt-4o-2024-11-20"],
    ["GPT4o-mini", "gpt-4o-mini-2024-07-18"],
  ])("%s", ([_, modelKind]) => {
    const conn = connection(modelKind);

    test.concurrent("no sys, no json", async () => {
      await testNoSysNoJson(conn, lmBridge);
    });

    test.concurrent("no sys, with json", async () => {
      await testNoSysWithJson(conn, lmBridge);
    });

    test.concurrent("with sys, no json", async () => {
      await testWithSysNoJson(conn, lmBridge);
    });

    test.concurrent("with sys, with json", async () => {
      await testWithSysWithJson(conn, lmBridge);
    });

    test.concurrent("tool use", async () => {
      await testToolUse(conn, lmBridge);
    });

    test.concurrent("parallel tool use", async () => {
      await testParallelToolUse(conn, lmBridge);
    });

    test.concurrent("consecutive assistant messages", async () => {
      await testConsecutiveAssistantMessages(conn, lmBridge);
    });
  });
});
