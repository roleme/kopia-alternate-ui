import { describe, expect, it } from "vitest";
import type { NotificationProfile } from "../../src/core/types";
import {
  endpointHost,
  maskTail,
  notificationDestination,
  severityName
} from "../../src/preferences/notificationSummary";

const profile = (type: NotificationProfile["method"]["type"], config: object): NotificationProfile => ({
  profile: "p",
  minSeverity: 10,
  method: { type, config: config as NotificationProfile["method"]["config"] }
});

describe("severityName", () => {
  it("maps known severities", () => {
    expect(severityName(-100)).toBe("verbose");
    expect(severityName(-10)).toBe("success");
    expect(severityName(0)).toBe("report");
    expect(severityName(10)).toBe("warning");
    expect(severityName(20)).toBe("error");
  });
  it("returns undefined for unknown severities", () => {
    expect(severityName(5)).toBeUndefined();
  });
});

describe("endpointHost", () => {
  it("returns only the host of a URL, dropping path, query and credentials", () => {
    expect(endpointHost("https://hooks.example.invalid/kopia/secret-token?key=abc")).toBe("hooks.example.invalid");
    expect(endpointHost("http://example.invalid:8080/x")).toBe("example.invalid:8080");
  });
  it("falls back for values that are not valid URLs", () => {
    expect(endpointHost("hooks.example.invalid/path?x=1")).toBe("hooks.example.invalid");
  });
});

describe("maskTail", () => {
  it("shows only the last characters", () => {
    expect(maskTail("abcdefgh1234")).toBe("…1234");
  });
  it("hides short values entirely", () => {
    expect(maskTail("abc")).toBe("…");
  });
});

describe("notificationDestination", () => {
  it("uses the recipient for email", () => {
    expect(notificationDestination(profile("email", { to: " me@example.invalid ", smtpPassword: "secret" }))).toBe(
      "me@example.invalid"
    );
  });
  it("uses only the host for webhooks", () => {
    expect(notificationDestination(profile("webhook", { endpoint: "https://h.example.invalid/tok/en" }))).toBe(
      "h.example.invalid"
    );
  });
  it("masks the pushover user key and never exposes the app token", () => {
    const result = notificationDestination(
      profile("pushover", { userKey: "uQiRzpo4DXghDmr9QzzfQu27cmVRsG", appToken: "secret" })
    );
    expect(result).toBe("…VRsG");
    expect(result).not.toContain("secret");
  });
  it("is empty when nothing is configured", () => {
    expect(notificationDestination(profile("email", {}))).toBe("");
    expect(notificationDestination(profile("webhook", {}))).toBe("");
    expect(notificationDestination(profile("pushover", {}))).toBe("");
  });
});
