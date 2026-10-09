import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { OneLine } from "../../src/core/OneLine";
import { render } from "../testing-utils";

const items = [
  { key: "a", node: <span>alpha</span> },
  { key: "b", node: <span>beta</span> },
  { key: "c", node: <span>gamma</span> }
];

describe("OneLine", () => {
  const proto = HTMLElement.prototype;
  const originalOffset = Object.getOwnPropertyDescriptor(proto, "offsetWidth");
  const originalClient = Object.getOwnPropertyDescriptor(proto, "clientWidth");

  beforeEach(() => {
    Object.defineProperty(proto, "offsetWidth", {
      configurable: true,
      get() {
        return this.hasAttribute("data-fit-item") ? 50 : 20;
      }
    });
  });

  afterEach(() => {
    if (originalOffset) Object.defineProperty(proto, "offsetWidth", originalOffset);
    if (originalClient) Object.defineProperty(proto, "clientWidth", originalClient);
  });

  const setContainerWidth = (width: number) => {
    Object.defineProperty(proto, "clientWidth", { configurable: true, get: () => width });
  };

  const visibleItems = (container: HTMLElement) =>
    Array.from(container.querySelectorAll<HTMLElement>("[data-fit-item]")).filter(
      (el) => el.style.visibility !== "hidden"
    );

  test("shows every item when they fit", () => {
    setContainerWidth(400);
    const { container, queryByText } = render(<OneLine items={items} />);

    expect(visibleItems(container)).toHaveLength(3);
    expect(queryByText(/^\+\d/)).toBeNull();
  });

  test("hides the items that do not fit and says how many are left", () => {
    setContainerWidth(120);
    const { container, getByText } = render(<OneLine items={items} />);

    expect(visibleItems(container)).toHaveLength(1);
    expect(getByText("+2")).toBeTruthy();
  });

  test("keeps the pinned content visible and counts its width", () => {
    setContainerWidth(150);
    const { container, getByText } = render(<OneLine items={items} keep={<b>pinned</b>} />);

    expect(getByText("pinned")).toBeTruthy();
    expect(visibleItems(container).length).toBeLessThan(3);
  });
});
