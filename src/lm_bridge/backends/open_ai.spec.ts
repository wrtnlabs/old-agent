import { describe, test } from "vitest";
import { LmBridge, LmBridgeInit } from "../lm_bridge";
import {
  testConsecutiveAssistantMessages,
  testNoSysNoJson,
  testNoSysWithJson,
  testParallelToolUse,
  testToolUse,
  testWithSysNoJson,
  testWithSysWithJson,
} from "./tests/common";
import { Connection, OpenAiModel } from "../backend";
import { ConsoleLogger } from "../../logger";

const OPENAI_API_KEY = process.env["OPENAI_API_KEY"];

function lmBridge(options: Pick<LmBridgeInit, "jsonMode" | "tools">) {
  return new LmBridge({ temperature: 0.8, logger: ConsoleLogger, ...options });
}

describe.runIf(OPENAI_API_KEY != null)("OpenAi", () => {
  describe.concurrent.for<[string, OpenAiModel]>([
    ["GPT4o", "gpt-4o-2024-11-20"],
    ["GPT4o-mini", "gpt-4o-mini-2024-07-18"],
  ])("%s", ([_, model]) => {
    const conn: Connection = {
      kind: { kind: "openai", model },
      apiKey: OPENAI_API_KEY!,
    };

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
