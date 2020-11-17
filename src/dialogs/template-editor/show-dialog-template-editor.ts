import { fireEvent } from "../../common/dom/fire_event";

export interface TemplateEditorParams {
  startingTemplate?: string;
}

export const loadTemplateEditor = () =>
  import(
    /* webpackChunkName: "template-editor-dialog" */ "./ha-template-editor"
  );

export const showTemplateEditor = (
  element: HTMLElement,
  dialogParams: TemplateEditorParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-template-editor",
    dialogImport: loadTemplateEditor,
    dialogParams,
  });
};
