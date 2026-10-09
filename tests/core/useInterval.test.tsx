import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { useInterval } from "../../src/core/hooks/useInterval";

let visibility: DocumentVisibilityState = "visible";

function setVisibility(next: DocumentVisibilityState) {
  visibility = next;
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

describe("useInterval", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    visibility = "visible";
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("calls the callback on every tick while visible", () => {
    const callback = vi.fn();
    renderHook(() => useInterval(callback, 1000));

    vi.advanceTimersByTime(3000);

    expect(callback).toHaveBeenCalledTimes(3);
  });

  test("does not tick while the tab is hidden", () => {
    const callback = vi.fn();
    renderHook(() => useInterval(callback, 1000));

    setVisibility("hidden");
    vi.advanceTimersByTime(10000);

    expect(callback).not.toHaveBeenCalled();
  });

  test("fires once when the tab becomes visible again and resumes ticking", () => {
    const callback = vi.fn();
    renderHook(() => useInterval(callback, 1000));

    setVisibility("hidden");
    vi.advanceTimersByTime(10000);
    setVisibility("visible");

    expect(callback).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2000);

    expect(callback).toHaveBeenCalledTimes(3);
  });

  test("a null delay never ticks and does not fire on return", () => {
    const callback = vi.fn();
    renderHook(() => useInterval(callback, null));

    vi.advanceTimersByTime(5000);
    setVisibility("hidden");
    setVisibility("visible");

    expect(callback).not.toHaveBeenCalled();
  });
});
