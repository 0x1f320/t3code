import { assert, it } from "@effect/vitest";
import { ProjectId, ThreadId } from "@t3tools/contracts";
import * as Effect from "effect/Effect";

import * as ServerSettings from "../serverSettings.ts";
import { placeNewThread, readThreadFolder, resolveNewThreadFolder } from "./threadFolders.ts";

const web = ProjectId.make("web");
const api = ProjectId.make("api");
const caller = { projectId: web, threadId: ThreadId.make("caller") };
const fresh = ThreadId.make("fresh");
const auth = { id: "auth", name: "Auth" };

it.effect("new threads follow the caller's folder unless told otherwise", () =>
  Effect.gen(function* () {
    const resolve = (projectId: ProjectId, folderId?: string | null) =>
      resolveNewThreadFolder({ projectId, folderId, caller });
    assert.deepEqual(yield* resolve(web), auth);
    assert.isNull(yield* resolve(web, null));
    assert.isNull(yield* resolve(api));
    assert.deepEqual(yield* resolve(web, "ui"), { id: "ui", name: "UI" });
    assert.equal((yield* resolve(web, "gone").pipe(Effect.flip)).code, "invalid_request");

    assert.deepEqual(yield* placeNewThread(web, fresh, auth), auth);
    assert.deepEqual(yield* placeNewThread(web, fresh, auth), auth);
    const settings = yield* ServerSettings.ServerSettingsService;
    assert.deepEqual((yield* settings.getSettings).projectThreadFolders[web], [
      { ...auth, threadIds: [caller.threadId, fresh] },
      { id: "ui", name: "UI", threadIds: [] },
    ]);
    assert.deepEqual(yield* readThreadFolder(web, fresh), auth);

    yield* settings.updateSettings({ projectThreadFolders: { [web]: null } });
    assert.isNull(yield* placeNewThread(web, ThreadId.make("late"), auth));
    assert.isNull(yield* readThreadFolder(web, fresh));
  }).pipe(
    Effect.provide(
      ServerSettings.layerTest({
        projectThreadFolders: {
          [web]: [
            { ...auth, threadIds: [caller.threadId] },
            { id: "ui", name: "UI", threadIds: [] },
          ],
        },
      }),
    ),
  ),
);
