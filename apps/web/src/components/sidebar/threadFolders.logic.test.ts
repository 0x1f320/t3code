import { EnvironmentId, ProjectId, ThreadId } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import { resolveGroupThreadFolders, splitThreadsIntoFolders } from "./threadFolders.logic";

const local = EnvironmentId.make("local");
const remote = EnvironmentId.make("remote");
const web = { environmentId: local, projectId: ProjectId.make("web") };
const webRemote = { environmentId: remote, projectId: ProjectId.make("web") };
const ids = (...values: string[]) => values.map((value) => ThreadId.make(value));
const folder = (id: string, name: string, threadIds: string[]) => ({
  id,
  name,
  threadIds: ids(...threadIds),
});

describe("thread folders", () => {
  it("merges a grouped project's folders by id and keeps thread order inside each", () => {
    const stored = new Map([
      [web, [folder("auth", "Auth", ["t1"]), folder("ui", "UI", [])]],
      [webRemote, [folder("auth", "Old name", ["t1", "t3"]), folder("infra", "Infra", ["t4"])]],
    ]);
    const { folders, folderIdByThreadKey } = resolveGroupThreadFolders(
      [web, webRemote],
      (member) => stored.get(member) ?? [],
    );
    expect(folders).toEqual([
      { id: "auth", name: "Auth" },
      { id: "ui", name: "UI" },
      { id: "infra", name: "Infra" },
    ]);

    const thread = (environmentId: EnvironmentId, id: string) => ({ environmentId, id });
    const { subfolders, looseThreads } = splitThreadsIntoFolders(
      [thread(remote, "t3"), thread(local, "t2"), thread(local, "t1"), thread(remote, "t4")],
      folders,
      folderIdByThreadKey,
    );
    expect(subfolders.map((subfolder) => subfolder.threads)).toEqual([
      [thread(remote, "t3"), thread(local, "t1")],
      [],
      [thread(remote, "t4")],
    ]);
    // t1 is stored under the remote member too, but only threads of that environment match.
    expect(looseThreads).toEqual([thread(local, "t2")]);
  });
});
