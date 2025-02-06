import { describe, expect, it } from "vitest";
import { DateTimeInformation } from "./session";
import { assertGuard } from "typia";

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
