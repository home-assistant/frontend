import { fireEvent } from "../../../common/dom/fire_event";
import { Tag, UpdateTagParams } from "../../../data/tag";

export interface TagDetailDialogParams {
  entry?: Tag;
  openWrite?: (tag: Tag) => void;
  createEntry: (
    values: Partial<UpdateTagParams>,
    tagId?: string
  ) => Promise<Tag>;
  updateEntry?: (updates: Partial<UpdateTagParams>) => Promise<Tag>;
  removeEntry?: () => Promise<boolean>;
}

export const loadTagDetailDialog = () => import("./dialog-tag-detail");

export const showTagDetailDialog = (
  element: HTMLElement,
  systemLogDetailParams: TagDetailDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-tag-detail",
    dialogImport: loadTagDetailDialog,
    dialogParams: systemLogDetailParams,
  });
};
