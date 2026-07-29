import { ContextProvider, createContext } from "@lit/context";
import type { ReactiveController, ReactiveControllerHost } from "lit";
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

export type RegisterChildPanelReady = (ready: Promise<void>) => void;

export const childPanelReadyContext =
  createContext<RegisterChildPanelReady>("child-panel-ready");

export class ChildPanelReady implements ReactiveController {
  private _promises: Promise<void>[] = [];

  private _host: ReactiveControllerHost & HTMLElement;

  private _resolveReady?: () => void;

  public ready = new Promise<void>((resolve) => {
    this._resolveReady = resolve;
  });

  public constructor(host: ReactiveControllerHost & HTMLElement) {
    this._host = host;
    host.addController(this);
    new ContextProvider(host, {
      context: childPanelReadyContext,
      initialValue: (ready) => this._promises.push(ready),
    });
  }

  public hostUpdated() {
    Promise.allSettled(this._promises).then(() => {
      this._resolveReady?.();
      return panelIsReady(this._host);
    });
    this._host.removeController(this);
  }
}

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
