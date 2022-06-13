import { fireEvent } from "../../common/dom/fire_event";

export interface HaDomainTogglerDialogParams {
  title?: string;
  description?: string;
  domains: string[];
  exposedDomains: string[] | null;
  toggleDomain: (domain: string, turnOn: boolean) => void;
  resetDomain: (domain: string) => void;
}

export const loadDomainTogglerDialog = () => import("./dialog-domain-toggler");

export const showDomainTogglerDialog = (
  element: HTMLElement,
  dialogParams: HaDomainTogglerDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-domain-toggler",
    dialogImport: loadDomainTogglerDialog,
    dialogParams,
  });
};
