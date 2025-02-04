import { describe, expect, it, vi } from "vitest";
import { LmBridge } from "./lm_bridge";
import { Connection } from "./backend";
import { Completion } from "./outputs/completion";
import { ConsoleLogger } from "../logger";

const DUMMY_CONNECTION: Connection = {
  kind: { kind: "openai", model: "gpt-4o-2024-11-20" },
  apiKey: "foobar",
};

const DUMMY_SESSION_ID = "279a6fa0-35ad-4605-9916-d8ca074b4354";

describe("LmBridge.request", () => {
  it("should return a completion", async () => {
    const bridge = new LmBridge({ temperature: 0.2, logger: ConsoleLogger });
    const mockBackendFactory = vi.fn(() => ({
      kind: () => DUMMY_CONNECTION.kind,
      makeCompletion: vi.fn(
        async (): Promise<Completion> => ({
          model: "gpt-4o-2024-11-20",
          completionId: "bazqux",
          messages: [
            {
              type: "text",
              role: "assistant",
              text: "Hello, world!",
            },
          ],
          usage: {
            inputTokens: 42,
            outputTokens: 42,
          },
          isTruncated: false,
          modelResponseMs: 0,
        })
      ),
    }));
    bridge.backendFactory = mockBackendFactory;
    const completion = await bridge.request({
      connection: DUMMY_CONNECTION,
      sessionId: DUMMY_SESSION_ID,
      stageName: "test",
      messages: [],
    });
    expect(completion).toBeDefined();
    expect(mockBackendFactory).toHaveBeenCalledWith(DUMMY_CONNECTION);
  });

  it("should log cost", async () => {
    let costLog = "";
    const mockLogger = {
      log: (message: string) => {
        costLog = message;
      },
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      verbose: vi.fn(),
      fatal: vi.fn(),
    };
    const bridge = new LmBridge({
      temperature: 0.2,
      logger: mockLogger,
      hasCostLog: true,
    });
    const mockBackendFactory = vi.fn(() => ({
      kind: () => DUMMY_CONNECTION.kind,
      makeCompletion: vi.fn(
        async (): Promise<Completion> => ({
          model: "gpt-4o-2024-11-20",
          completionId: "bazqux",
          messages: [],
          usage: {
            inputTokens: 42,
            outputTokens: 42,
          },
          isTruncated: false,
          modelResponseMs: 0,
        })
      ),
    }));
    bridge.backendFactory = mockBackendFactory;
    await bridge.request({
      connection: DUMMY_CONNECTION,
      sessionId: DUMMY_SESSION_ID,
      stageName: "test",
      messages: [],
    });
    expect(costLog).not.toBe("");
    const json = JSON.parse(costLog);
    expect(json.model_name).toBe("gpt-4o-2024-11-20");
    expect(json.input_tokens).toBe(42);
    expect(json.output_tokens).toBe(42);
    expect(json.created_at).toBeDefined();
    expect(json.model_response_ms).toBeDefined();
  });
});
