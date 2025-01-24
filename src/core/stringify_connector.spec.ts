import { describe, expect, it } from "vitest";
import { stringifyConnector } from "./stringify_connector";
import { OpenAiFunction } from "./connector";
import { random } from "typia";
import { stringify } from "typia/lib/json";

describe("stringifyConnector", () => {
  it("should stringify OpenAiFunction correctly", () => {
    const mockFunction = random<OpenAiFunction>();
    const result = stringifyConnector(mockFunction);
    expect(result).toBe(stringify(mockFunction));
  });
});
