import type { ProjectThreadFolder, ThreadId } from "@t3tools/contracts";

export type ThreadFolderSummary = Pick<ProjectThreadFolder, "id" | "name">;

export function threadFolderOf(
  folders: readonly ProjectThreadFolder[],
  threadId: ThreadId,
): ThreadFolderSummary | null {
  const folder = folders.find((candidate) => candidate.threadIds.includes(threadId));
  return folder === undefined ? null : { id: folder.id, name: folder.name };
}

/** Takes the threads out of every folder, then adds them to `target`, creating it if missing. */
export function moveThreadsToFolder(
  folders: readonly ProjectThreadFolder[],
  threadIds: readonly ThreadId[],
  target: ThreadFolderSummary | null,
): ProjectThreadFolder[] {
  const moving = new Set<string>(threadIds);
  const next = folders.map((folder) => ({
    ...folder,
    threadIds: folder.threadIds.filter((threadId) => !moving.has(threadId)),
  }));
  if (target === null) return next;
  const existing = next.find((folder) => folder.id === target.id);
  if (existing === undefined) {
    return [...next, { id: target.id, name: target.name, threadIds: [...threadIds] }];
  }
  existing.threadIds = [...existing.threadIds, ...threadIds];
  return next;
}
