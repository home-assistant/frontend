import type { CertificateInformation } from "../../../../data/cloud";

import { fireEvent } from "../../../../common/dom/fire_event";

export interface CloudCertificateParams {
  certificateInfo: CertificateInformation;
}

export const showCloudCertificateDialog = (
  element: HTMLElement,
  webhookDialogParams: CloudCertificateParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-cloud-certificate",
    dialogImport: () => import("./dialog-cloud-certificate"),
    dialogParams: webhookDialogParams,
  });
};
