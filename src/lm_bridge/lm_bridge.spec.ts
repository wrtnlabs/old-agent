import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { BackoffError, DEFAULT_BACKOFF_STRATEGY, LmBridge } from "./lm_bridge";
import { Backend, Connection } from "./backend";
import { Completion } from "./outputs/completion";
import { NoopLogger } from "../logger";

const DUMMY_CONNECTION: Connection = {
  kind: { kind: "openai", model: "gpt-4o-2024-11-20" },
  apiKey: "foobar",
};

const DUMMY_SESSION_ID = "279a6fa0-35ad-4605-9916-d8ca074b4354";

describe("LmBridge.request", () => {
  const mockMakeCompletion = vi.fn<() => Promise<Completion>>();
  const mockBackendFactory = vi.fn<() => Backend>(() => ({
    kind: () => DUMMY_CONNECTION.kind,
    baseUrl: "https://api.openai.com/v1",
    makeCompletion: mockMakeCompletion,
  }));
  const bridge = new LmBridge({ temperature: 0.2, logger: NoopLogger });

  beforeAll(() => {
    bridge.backendFactory = mockBackendFactory;
  });

  beforeEach(() => {
    mockMakeCompletion.mockResolvedValue({
      model: "gpt-4o-2024-11-20",
      completionId: "bazqux",
      messages: [],
      usage: {
        inputTokens: 42,
        outputTokens: 42,
      },
      isTruncated: false,
      modelResponseMs: 0,
    });
  });

  afterEach(() => {
    mockMakeCompletion.mockReset();
    mockBackendFactory.mockReset();
  });

  it("should return a completion", async () => {
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

  it("should retry on too many requests", async () => {
    mockMakeCompletion
      .mockRejectedValueOnce(new BackoffError())
      .mockRejectedValueOnce(new BackoffError());
    const completion = await bridge.request({
      connection: DUMMY_CONNECTION,
      sessionId: DUMMY_SESSION_ID,
      stageName: "test",
      messages: [],
    });
    expect(completion).toBeDefined();
    expect(mockBackendFactory).toHaveBeenCalledWith(DUMMY_CONNECTION);
  });

  it("should not retry if the backoff strategy describes no retries", async () => {
    mockMakeCompletion.mockRejectedValueOnce(new BackoffError());
    await expect(() =>
      bridge.request({
        connection: DUMMY_CONNECTION,
        sessionId: DUMMY_SESSION_ID,
        stageName: "test",
        messages: [],
        backoffStrategy: {
          ...DEFAULT_BACKOFF_STRATEGY,
          maxRetries: 1,
        },
      })
    ).rejects.toThrowError();
    expect(mockMakeCompletion).toHaveBeenCalledTimes(1);
  });
});
