import { describe, expect, it, vi } from "vitest";
import { LmBridge } from "./lm_bridge";
import { Connection } from "./backend";
import { Completion } from "./outputs/completion";

const DUMMY_CONNECTION: Connection = {
  kind: { kind: "openai", model: "gpt-4o-2024-11-20" },
  apiKey: "foobar",
};

const DUMMY_SESSION_ID = "279a6fa0-35ad-4605-9916-d8ca074b4354";

describe("LmBridge.request", () => {
  it("should return a completion", async () => {
    const bridge = new LmBridge(0.2, false, []);
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
});
