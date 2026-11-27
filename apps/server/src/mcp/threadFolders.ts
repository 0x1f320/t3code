import { OrchestratorMcpFailure, type ProjectId, type ThreadId } from "@t3tools/contracts";
import {
  moveThreadsToFolder,
  threadFolderOf,
  type ThreadFolderSummary,
} from "@t3tools/shared/projectThreadFolders";
import * as Effect from "effect/Effect";

import * as ServerSettings from "../serverSettings.ts";
import { unavailable } from "./threadAccess.ts";

const projectFolders = (projectId: ProjectId) =>
  ServerSettings.ServerSettingsService.pipe(
    Effect.flatMap((settings) => settings.getSettings),
    Effect.map((settings) => settings.projectThreadFolders[projectId] ?? []),
  );

export const readThreadFolder = (projectId: ProjectId, threadId: ThreadId) =>
  projectFolders(projectId).pipe(Effect.map((folders) => threadFolderOf(folders, threadId)));

/** An omitted `folderId` follows the caller's folder when the new thread shares its project. */
export const resolveNewThreadFolder = Effect.fn("mcp.resolveNewThreadFolder")(function* (input: {
  readonly projectId: ProjectId;
  readonly folderId: string | null | undefined;
  readonly caller: { readonly projectId: ProjectId; readonly threadId: ThreadId } | undefined;
}) {
  const { folderId, caller } = input;
  if (folderId === null) return null;
  if (folderId === undefined && caller?.projectId !== input.projectId) return null;
  const folders = yield* projectFolders(input.projectId).pipe(Effect.mapError(unavailable));
  if (folderId === undefined) return caller ? threadFolderOf(folders, caller.threadId) : null;
  const folder = folders.find((candidate) => candidate.id === folderId);
  if (folder === undefined)
    return yield* new OrchestratorMcpFailure({
      code: "invalid_request",
      message: `No folder ${folderId} in this project. No thread was created. \`t3_thread_read\` shows a thread's \`folder\`.`,
    });
  return { id: folder.id, name: folder.name };
});

/** The thread already exists, so a folder deleted meanwhile or a failed write leaves it loose. */
export const placeNewThread = Effect.fn("mcp.placeNewThread")(
  function* (projectId: ProjectId, threadId: ThreadId, folder: ThreadFolderSummary | null) {
    if (folder === null) return null;
    const settings = yield* ServerSettings.ServerSettingsService;
    const folders = yield* projectFolders(projectId);
    if (!folders.some((candidate) => candidate.id === folder.id)) return null;
    if (threadFolderOf(folders, threadId)?.id !== folder.id)
      yield* settings.updateSettings({
        projectThreadFolders: { [projectId]: moveThreadsToFolder(folders, [threadId], folder) },
      });
    return folder;
  },
  Effect.catchCause((cause) =>
    Effect.logWarning("Failed to place a new thread in its folder.", cause).pipe(Effect.as(null)),
  ),
);
