import { beforeAll, afterEach, describe, expect, it, test, vi } from "vitest";
import { DateTimeInformation, MetaAgentSessionManager } from "./session";
import { assertGuard } from "typia";
import { NoopLogger } from "./logger";
import { NunjucksPromptSet } from "./prompt_set";
import { MetaAgentSessionDelegate } from "./delegate";
import { Dialog } from "./chat_history";

describe("DateTimeInformation", () => {
  describe("toZonedDateTime", () => {
    it("should return a valid zoned date time", () => {
      const info: DateTimeInformation = {
        datetime: "2022-01-23T12:34:56+00:00",
      };
      const result = DateTimeInformation.toZonedDateTime(info);
      assertGuard<DateTimeInformation>(result);

      expect(result.year).toBe(2022);
      expect(result.month).toBe(1);
      expect(result.day).toBe(23);
      expect(result.hour).toBe(12);
      expect(result.minute).toBe(34);
      expect(result.second).toBe(56);
    });

    it("should be assumed to be UTC if no timezone is provided", () => {
      const info: DateTimeInformation = {
        datetime: "2022-01-23T12:34:56",
      };
      const result = DateTimeInformation.toZonedDateTime(info);
      assertGuard<DateTimeInformation>(result);

      expect(result.hour).toBe(12);
      expect(result.timeZoneId).toBe("UTC");
    });

    it("should respect the provided timezone", () => {
      const info: DateTimeInformation = {
        datetime: "2022-01-23T12:34:56",
        timezone: "America/New_York",
      };
      const result = DateTimeInformation.toZonedDateTime(info);
      assertGuard<DateTimeInformation>(result);

      expect(result.hour).toBe(12);
      expect(result.timeZoneId).toBe("America/New_York");
    });

    it("should throw on invalid datetime", () => {
      const info: DateTimeInformation = {
        datetime: "invalid_datetime",
      };
      expect(() => DateTimeInformation.toZonedDateTime(info)).toThrow();
    });

    it("should return nothing if no datetime is provided", () => {
      const info: DateTimeInformation = {};
      const result = DateTimeInformation.toZonedDateTime(info);
      expect(result).toBeUndefined();
    });
  });

  describe("rewrite", () => {
    it("should rewrite as Asia/Seoul timezone if not provided", () => {
      const info: DateTimeInformation = {
        datetime: "2022-01-23T12:34:56+00:00",
      };
      DateTimeInformation.rewrite(info);
      expect(info.timezone).toBe("Asia/Seoul");
      expect(info.datetime).toBe("2022-01-23T12:34:56+09:00");
    });

    it.for([
      { timezone: "America/New_York", expected: "2022-01-23T07:34:56-05:00" },
      { timezone: "Europe/London", expected: "2022-01-23T12:34:56+00:00" },
      { timezone: "Asia/Tokyo", expected: "2022-01-23T21:34:56+09:00" },
      { timezone: "Australia/Sydney", expected: "2022-01-23T23:34:56+11:00" },
      // { timezone: "invalid", expected: "2022-01-23T21:34:56+09:00" },
    ])(
      "should rewrite the datetime to the $timezone",
      ({ timezone, expected }) => {
        const info: DateTimeInformation = {
          datetime: "2022-01-23T12:34:56+00:00",
          timezone,
        };
        DateTimeInformation.rewrite(info);
        expect(info.datetime).toBe(expected);
      }
    );
  });
});

describe("MetaAgentSessionManager", () => {
  let sessionManager: MetaAgentSessionManager;
  const abortController = new AbortController();
  const OPENAI_API_KEY = process.env["OPENAI_API_KEY"];

  beforeAll(async () => {
    sessionManager = new MetaAgentSessionManager({
      promptSet: await NunjucksPromptSet.default(),
      logger: NoopLogger,
    });
  });

  afterEach(() => {
    abortController.abort();
  });

  test.runIf(OPENAI_API_KEY != null)(
    "MetaAgentSession",
    { timeout: 60_000 },
    async () => {
      const delegate = {
        onError: vi.fn(),
        onRead: vi
          .fn<MetaAgentSessionDelegate["onRead"]>()
          .mockResolvedValue("Hello?"),
        onMessage: vi.fn<NonNullable<MetaAgentSessionDelegate["onMessage"]>>(),
        onConnectorCall: vi.fn().mockImplementation(async () => ({})),

        async findFunction(sessionId, name, options) {
          if (name === "post:/foo/bar") {
            return {
              method: "post",
              path: "/foo/bar",
              name: "post:/foo/bar",
              description: "Lorem ipsum",
              parameters: [],
            };
          } else {
            return undefined;
          }
        },
        async queryFunctions(query) {
          return [
            { method: "post", path: "/foo/bar", description: "Lorem ipsum" },
          ];
        },
      } satisfies MetaAgentSessionDelegate;
      const dialogs: Dialog[] = [];
      const s = sessionManager.start({
        llmBackendKind: "openai",
        llmApiKey: OPENAI_API_KEY!,
        sessionId: crypto.randomUUID(),
        initialInformation: {
          email: "gracie@wrtn.io",
          username: "Gracie Yu",
          job: "Developer",
          timezone: "Asia/Seoul",
          datetime: new Date().toISOString(),
        },
        platformInfo: {
          prompt: "You are a helpful agent.",
        },
        dialogs,
        delegate,
      });
      s.launch(abortController.signal).catch((error) => {
        console.error(error);
      });

      await vi.waitUntil(() => delegate.onMessage.mock.calls.length >= 2, {
        timeout: 30_000,
        interval: 1_000,
      });

      const [event1] = delegate.onRead.mock.calls[0]!;
      const [event2] = delegate.onMessage.mock.calls[0]!;
      const [event3] = delegate.onMessage.mock.calls[1]!;

      console.log(event1);
      expect.soft(event1).toBeDefined();

      console.log(event2);
      expect.soft(event2).toHaveProperty("dialog");
      expect.soft(event2).toHaveProperty("dialog.speaker.type", "user");
      expect.soft(event2).toHaveProperty("dialog.visible", true);
      expect.soft(event2).toHaveProperty("dialog.message.type", "text");
      expect.soft(event2).toHaveProperty("dialog.message.text");

      console.log(event3);
      expect.soft(event3).toHaveProperty("dialog");
      expect.soft(event3).toHaveProperty("dialog.speaker.type", "assistant");
      expect.soft(event3).toHaveProperty("dialog.visible", true);
      expect.soft(event3).toHaveProperty("dialog.message.type", "text");
      expect.soft(event3).toHaveProperty("dialog.message.text");
    }
  );
});
