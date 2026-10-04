import { describe, expect, it } from "vitest";
import type { PolicyDefinition, SourceInfo } from "../../src/core/types";
import {
  describeField,
  findOptionLabel,
  formatValueSummary,
  getDefinitionAt,
  getRowSummary,
  getValueAt,
  getValueOrigin,
  hasValue,
  isSourceInfo
} from "../../src/policies/modals/PolicyModal/utils/policyDefinition";

const GLOBAL: SourceInfo = { host: "", userName: "", path: "" };
const HOST: SourceInfo = { host: "mininas", userName: "", path: "" };
const DIR: SourceInfo = { host: "mininas", userName: "root", path: "/volume1/photo/immich" };
const labels = { yes: "Yes", no: "No" };

const effective = {
  retention: { keepHourly: 8, keepDaily: 7, keepLatest: 0 },
  files: { ignoreDotFiles: [".kopiaignore"], ignoreCacheDirs: false, ignore: [] },
  actions: { beforeSnapshotRoot: { script: "#!/bin/sh\ndocker exec x\n", timeout: 600 } },
  logging: { directories: { snapshotted: 5 } }
};

const definition = {
  retention: { keepHourly: DIR, keepDaily: GLOBAL, keepLatest: GLOBAL },
  files: { ignoreDotFiles: GLOBAL, ignoreCacheDirs: HOST },
  actions: { beforeSnapshotRoot: DIR },
  logging: { directories: GLOBAL }
} as unknown as PolicyDefinition;

describe("isSourceInfo", () => {
  it("recognises a source info and rejects other shapes", () => {
    expect(isSourceInfo(DIR)).toBe(true);
    expect(isSourceInfo(GLOBAL)).toBe(true);
    expect(isSourceInfo({ snapshotted: GLOBAL })).toBe(false);
    expect(isSourceInfo(undefined)).toBe(false);
    expect(isSourceInfo("x")).toBe(false);
  });
});

describe("hasValue", () => {
  it("treats empty values as missing but keeps 0 and false", () => {
    expect(hasValue(undefined)).toBe(false);
    expect(hasValue(null)).toBe(false);
    expect(hasValue("")).toBe(false);
    expect(hasValue([])).toBe(false);
    expect(hasValue(0)).toBe(true);
    expect(hasValue(false)).toBe(true);
    expect(hasValue(["a"])).toBe(true);
  });
});

describe("getValueAt and getDefinitionAt", () => {
  it("walks a dotted path", () => {
    expect(getValueAt(effective, "retention.keepHourly")).toBe(8);
    expect(getValueAt(effective, "files.nope.deeper")).toBeUndefined();
    expect(getValueAt(undefined, "files.ignore")).toBeUndefined();
  });

  it("returns the source info at a leaf", () => {
    expect(getDefinitionAt(definition, "retention.keepHourly")).toEqual(DIR);
    expect(getDefinitionAt(definition, "files.ignoreDotFiles")).toEqual(GLOBAL);
  });

  it("stops at a source info that sits above the leaf", () => {
    expect(getDefinitionAt(definition, "actions.beforeSnapshotRoot.script")).toEqual(DIR);
    expect(getDefinitionAt(definition, "logging.directories.snapshotted")).toEqual(GLOBAL);
  });

  it("returns undefined for unknown paths and missing definition", () => {
    expect(getDefinitionAt(definition, "files.maxFileSize")).toBeUndefined();
    expect(getDefinitionAt(undefined, "files.ignore")).toBeUndefined();
  });
});

describe("getValueOrigin", () => {
  it("is here when the policy itself defines the value", () => {
    expect(getValueOrigin(true, DIR, DIR)).toBe("here");
    expect(getValueOrigin(true, undefined, GLOBAL)).toBe("here");
  });

  it("is inherited when a parent level defines it", () => {
    expect(getValueOrigin(false, GLOBAL, DIR)).toBe("inherited");
    expect(getValueOrigin(false, HOST, DIR)).toBe("inherited");
  });

  it("is default when the global policy itself does not define it", () => {
    expect(getValueOrigin(false, GLOBAL, GLOBAL)).toBe("default");
  });
});

describe("describeField", () => {
  const base = { effective, definition };

  it("reports an inherited value with where it comes from", () => {
    expect(describeField({ ...base, path: "files.ignoreDotFiles", target: DIR })).toEqual({
      value: [".kopiaignore"],
      origin: "inherited",
      definedIn: GLOBAL
    });
  });

  it("reports a value set on this policy", () => {
    expect(describeField({ ...base, path: "retention.keepHourly", target: DIR, definedValue: 8 })?.origin).toBe("here");
  });

  it("prefers the form value over the loaded effective value", () => {
    expect(describeField({ ...base, path: "retention.keepHourly", target: DIR, definedValue: 12 })?.value).toBe(12);
  });

  it("keeps a falsy but real inherited value", () => {
    expect(describeField({ ...base, path: "retention.keepLatest", target: DIR })?.value).toBe(0);
    expect(describeField({ ...base, path: "files.ignoreCacheDirs", target: DIR })?.value).toBe(false);
  });

  it("returns undefined when no value applies", () => {
    expect(describeField({ ...base, path: "files.ignore", target: DIR })).toBeUndefined();
    expect(describeField({ ...base, path: "files.maxFileSize", target: DIR })).toBeUndefined();
    expect(describeField({ path: "files.maxFileSize", target: DIR })).toBeUndefined();
  });

  it("labels defaults on the global policy", () => {
    expect(describeField({ ...base, path: "retention.keepDaily", target: GLOBAL })?.origin).toBe("default");
  });

  it("resolves action scripts through the action level definition", () => {
    const result = describeField({ ...base, path: "actions.beforeSnapshotRoot.script", target: DIR });
    expect(result?.origin).toBe("inherited");
    expect(result?.definedIn).toEqual(DIR);
  });
});

describe("formatValueSummary", () => {
  it("formats scalars, booleans and lists", () => {
    expect(formatValueSummary(8, labels)).toBe("8");
    expect(formatValueSummary(0, labels)).toBe("0");
    expect(formatValueSummary(true, labels)).toBe("Yes");
    expect(formatValueSummary(false, labels)).toBe("No");
    expect(formatValueSummary([".a", ".b"], labels)).toBe(".a, .b");
    expect(formatValueSummary([{ hour: 3, min: 5 }], labels)).toBe("03:05");
  });

  it("shows only the first line of a multi-line script", () => {
    expect(formatValueSummary("#!/bin/sh\ndocker exec x\n", labels)).toBe("#!/bin/sh …");
    expect(formatValueSummary("single\n", labels)).toBe("single");
  });
});

describe("findOptionLabel", () => {
  const data = [
    { label: "Must Succeed", value: "essential" },
    { group: "Active", items: [{ label: "None", value: "none" }] }
  ];

  it("finds flat and grouped options", () => {
    expect(findOptionLabel(data, "essential")).toBe("Must Succeed");
    expect(findOptionLabel(data, "none")).toBe("None");
  });

  it("matches numbers against string option values", () => {
    expect(findOptionLabel([{ label: "5 - normal", value: "5" }], 5)).toBe("5 - normal");
  });

  it("returns undefined when absent", () => {
    expect(findOptionLabel(data, "x")).toBeUndefined();
    expect(findOptionLabel(undefined, "x")).toBeUndefined();
  });
});

describe("getRowSummary", () => {
  it("shows the formatted value when asked", () => {
    expect(getRowSummary([".a", ".b"], true, labels)).toBe(".a, .b");
    expect(getRowSummary(8, true, labels)).toBe("8");
  });

  it("hides the value for rows that show only the tag", () => {
    expect(getRowSummary([".a", ".b"], false, labels)).toBeUndefined();
  });

  it("uses an option label when one matches", () => {
    expect(getRowSummary("essential", true, labels, [{ label: "Must Succeed", value: "essential" }])).toBe(
      "Must Succeed"
    );
  });
});
