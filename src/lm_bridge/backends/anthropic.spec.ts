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
import { Connection, ClaudeModel } from "../backend";
import { ConsoleLogger } from "../../logger";

const ANTHROPIC_API_KEY = process.env["ANTHROPIC_API_KEY"];

function lmBridge(options: Pick<LmBridgeInit, "jsonMode" | "tools">) {
  return new LmBridge({ temperature: 0.8, logger: ConsoleLogger, ...options });
}

describe.runIf(ANTHROPIC_API_KEY != null)(
  "Anthropic",
  { timeout: 1000 * 30 },
  () => {
    describe.concurrent.for<[string, ClaudeModel]>([
      ["Claude 3.5 Haiku", "claude-3-5-haiku-20241022"],
      ["Claude 3.5 Sonnet", "claude-3-5-sonnet-20241022"],
    ])("%s", ([_, model]) => {
      const conn: Connection = {
        kind: { kind: "claude", model },
        apiKey: ANTHROPIC_API_KEY!,
      };

      test("no sys, no json", async () => {
        await testNoSysNoJson(conn, lmBridge);
      });

      test("no sys, with json", async () => {
        await testNoSysWithJson(conn, lmBridge);
      });

      test("with sys, no json", async () => {
        await testWithSysNoJson(conn, lmBridge);
      });

      test("with sys, with json", async () => {
        await testWithSysWithJson(conn, lmBridge);
      });

      test("tool use", async () => {
        await testToolUse(conn, lmBridge);
      });

      test("parallel tool use", async () => {
        await testParallelToolUse(conn, lmBridge);
      });

      test("consecutive assistant messages", async () => {
        await testConsecutiveAssistantMessages(conn, lmBridge);
      });
    });
  }
);
