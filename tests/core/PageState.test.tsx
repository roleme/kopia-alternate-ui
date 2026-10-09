import { describe, expect, test } from "vitest";
import { PageState } from "../../src/core/PageState/PageState";
import { render } from "../testing-utils";

const error = { title: "Boom", message: "It broke" };

type Case = {
  name: string;
  props: { loading?: boolean; error?: typeof error; empty?: boolean };
  visible: "loading" | "error" | "empty" | "content";
};

const cases: Case[] = [
  { name: "content", props: {}, visible: "content" },
  { name: "loading", props: { loading: true }, visible: "loading" },
  { name: "error", props: { error }, visible: "error" },
  { name: "empty", props: { empty: true }, visible: "empty" },
  { name: "loading beats error", props: { loading: true, error }, visible: "loading" },
  { name: "loading beats empty", props: { loading: true, empty: true }, visible: "loading" },
  { name: "error beats empty", props: { error, empty: true }, visible: "error" },
  { name: "all three", props: { loading: true, error, empty: true }, visible: "loading" }
];

describe("PageState", () => {
  test.each(cases)("$name renders exactly one branch", ({ props, visible }) => {
    const { queryByText, queryByRole } = render(
      <PageState {...props} emptyText="Nothing here">
        <div>content</div>
      </PageState>
    );

    const shown = {
      loading: queryByRole("status") !== null,
      error: queryByText("Boom") !== null,
      empty: queryByText("Nothing here") !== null,
      content: queryByText("content") !== null
    };

    expect(Object.entries(shown).filter(([, on]) => on)).toEqual([[visible, true]]);
  });

  test("empty state falls back to a default message", () => {
    const { getByText } = render(<PageState empty />);

    expect(getByText("Nothing to show")).toBeTruthy();
  });

  test("loading state is announced", () => {
    const { getByRole } = render(<PageState loading />);

    expect(getByRole("status").textContent).toContain("Loading");
  });
});
