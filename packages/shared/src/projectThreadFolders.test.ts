import { ThreadId } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import { moveThreadsToFolder } from "./projectThreadFolders.ts";

const ids = (...values: string[]) => values.map((value) => ThreadId.make(value));
const folder = (id: string, name: string, threadIds: string[]) => ({
  id,
  name,
  threadIds: ids(...threadIds),
});

describe("project thread folders", () => {
  it("moves threads into one folder at a time, creating it in a member that lacked it", () => {
    const current = [folder("auth", "Auth", ["t1", "t2"]), folder("ui", "UI", ["t3"])];
    expect(moveThreadsToFolder(current, ids("t1", "t3"), { id: "ui", name: "UI" })).toEqual([
      folder("auth", "Auth", ["t2"]),
      folder("ui", "UI", ["t1", "t3"]),
    ]);
    expect(moveThreadsToFolder(current, ids("t2"), null)).toEqual([
      folder("auth", "Auth", ["t1"]),
      folder("ui", "UI", ["t3"]),
    ]);
    expect(moveThreadsToFolder([], ids("t9"), { id: "auth", name: "Auth" })).toEqual([
      folder("auth", "Auth", ["t9"]),
    ]);
  });
});
