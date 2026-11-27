import type { EnvironmentId, ProjectId, ThreadId } from "@t3tools/contracts";
import { useGT } from "gt-react";
import { FolderIcon, FolderOpenIcon } from "lucide-react";
import { memo, type MouseEvent as ReactMouseEvent } from "react";

import { useClientSettings } from "../hooks/useSettings";
import { buildSidebarProjectSnapshots } from "../sidebarProjectGrouping";
import { useEnvironments, usePrimaryEnvironmentId } from "../state/environments";
import { useProjects, useServerConfigs } from "../state/entities";
import { ComposerSelectControl } from "./chat/ComposerControl";
import { useComposerMenuProps } from "./chat/composerEventScope";
import { ComposerContextLabel } from "./ComposerContextLabel";
import { useThreadFolders } from "./sidebar/useThreadFolders";
import {
  Select,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectPopup,
  SelectValue,
} from "./ui/select";

const NO_FOLDER_VALUE = "";

interface BranchToolbarThreadFolderSelectorProps {
  environmentId: EnvironmentId;
  projectId: ProjectId;
  threadId: ThreadId;
}

/** Picks the boring-sidebar folder a new thread lands in, the same membership the sidebar writes. */
export const BranchToolbarThreadFolderSelector = memo(function BranchToolbarThreadFolderSelector(
  props: BranchToolbarThreadFolderSelectorProps,
) {
  const boringSidebarEnabled = useClientSettings((settings) => settings.boringSidebarEnabled);
  if (!boringSidebarEnabled) return null;
  return <ThreadFolderSelect {...props} />;
});

function useProjectGroup(environmentId: EnvironmentId, projectId: ProjectId) {
  const projects = useProjects();
  const sidebarProjectGroupingMode = useClientSettings(
    (settings) => settings.sidebarProjectGroupingMode,
  );
  const sidebarProjectGroupingOverrides = useClientSettings(
    (settings) => settings.sidebarProjectGroupingOverrides,
  );
  const primaryEnvironmentId = usePrimaryEnvironmentId();
  const { environments } = useEnvironments();
  const labels = new Map(environments.map((entry) => [entry.environmentId, entry.label]));
  return (
    buildSidebarProjectSnapshots({
      projects,
      groupScratchProjects: true,
      settings: { sidebarProjectGroupingMode, sidebarProjectGroupingOverrides },
      primaryEnvironmentId,
      resolveEnvironmentLabel: (id) => labels.get(id) ?? null,
    }).find((group) =>
      group.memberProjectRefs.some(
        (ref) => ref.environmentId === environmentId && ref.projectId === projectId,
      ),
    ) ?? null
  );
}

function ThreadFolderSelect({
  environmentId,
  projectId,
  threadId,
}: BranchToolbarThreadFolderSelectorProps) {
  const gt = useGT();
  const composerFloatingLayerProps = useComposerMenuProps();
  const threadFolders = useThreadFolders(useServerConfigs());
  const group = useProjectGroup(environmentId, projectId);
  if (group === null || !threadFolders.canEdit(group)) return null;
  const { folders, folderIdByThreadKey } = threadFolders.resolve(group);
  if (folders.length === 0) return null;

  const currentFolderId = folderIdByThreadKey.get(`${environmentId}:${threadId}`);
  const currentFolder = folders.find((folder) => folder.id === currentFolderId) ?? null;
  const folderLabel = gt("Folder");
  const noFolderLabel = gt("No folder");
  const items = [
    { value: NO_FOLDER_VALUE, label: noFolderLabel },
    ...folders.map((folder) => ({ value: folder.id, label: folder.name })),
  ];
  const stopContextMenuMouseDown = (event: ReactMouseEvent) => {
    if (event.button !== 0 || event.ctrlKey) event.stopPropagation();
  };

  return (
    <Select
      modal={false}
      value={currentFolder?.id ?? NO_FOLDER_VALUE}
      onValueChange={(value: string | null) => {
        const target = folders.find((folder) => folder.id === value) ?? null;
        threadFolders.move(group, [{ environmentId, projectId, id: threadId }], target);
      }}
      items={items}
    >
      <ComposerSelectControl
        size="xs"
        className="min-w-0 shrink"
        aria-label={folderLabel}
        data-composer-context-control
        onMouseDownCapture={stopContextMenuMouseDown}
      >
        {currentFolder ? <FolderOpenIcon className="size-3" /> : <FolderIcon className="size-3" />}
        <ComposerContextLabel>
          <SelectValue />
        </ComposerContextLabel>
      </ComposerSelectControl>
      <SelectPopup alignItemWithTrigger={false} {...composerFloatingLayerProps}>
        <SelectGroup>
          <SelectGroupLabel>{folderLabel}</SelectGroupLabel>
          <SelectItem value={NO_FOLDER_VALUE}>{noFolderLabel}</SelectItem>
          {folders.map((folder) => (
            <SelectItem key={folder.id} value={folder.id}>
              {folder.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectPopup>
    </Select>
  );
}
