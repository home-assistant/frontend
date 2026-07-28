import { ReactiveElement } from "lit";
import { fireEvent } from "../common/dom/fire_event";

declare global {
  interface HASSDomEvents {
    "hass-panel-ready": undefined;
  }
}

export const panelIsReady = async (element: HTMLElement) => {
  if (element instanceof ReactiveElement) {
    // Ensure pending Lit changes are rendered before revealing the panel.
    await element.updateComplete;
  }
  fireEvent(element, "hass-panel-ready");
};

export class PanelReady {
  public ready?: Promise<void>;

  public track(element: HTMLElement, waitForReady = false) {
    this.ready = waitForReady
      ? new Promise((resolve) => {
          element.addEventListener("hass-panel-ready", () => resolve(), {
            once: true,
          });
        })
      : undefined;
  }
}
