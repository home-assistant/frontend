import { fireEvent } from "../../../../common/dom/fire_event";
import type { CloudWebhook } from "../../../../data/cloud";
import type { Webhook } from "../../../../data/webhook";

export interface WebhookDialogParams {
  webhook: Webhook;
  cloudhook: CloudWebhook;
  disableHook: () => void;
}

export const showManageCloudhookDialog = (
  element: HTMLElement,
  webhookDialogParams: WebhookDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-manage-cloudhook",
    dialogImport: () => import("./dialog-manage-cloudhook"),
    dialogParams: webhookDialogParams,
  });
};
