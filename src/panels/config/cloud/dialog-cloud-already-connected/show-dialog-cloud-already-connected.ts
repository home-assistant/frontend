import { fireEvent } from "../../../../common/dom/fire_event";

export interface CloudAlreadyConnectedParams {
  details: {
    remote_ip_address: string;
    connected_at: string;
    name?: string;
    version?: string;
  };
  logInHereAction?: () => void;
  closeDialog?: () => void;
}

export const showCloudAlreadyConnectedDialog = (
  element: HTMLElement,
  webhookDialogParams: CloudAlreadyConnectedParams
) =>
  new Promise((resolve) => {
    const originalClose = webhookDialogParams.closeDialog;
    const originalLogInHereAction = webhookDialogParams.logInHereAction;

    fireEvent(element, "show-dialog", {
      dialogTag: "dialog-cloud-already-connected",
      dialogImport: () => import("./dialog-cloud-already-connected"),
      dialogParams: {
        ...webhookDialogParams,
        closeDialog: () => {
          originalClose?.();
          resolve(false);
        },
        logInHereAction: () => {
          originalLogInHereAction?.();
          resolve(true);
        },
      },
    });
  });
