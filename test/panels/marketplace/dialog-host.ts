import { ContextProvider } from "@lit/context";
import { vi } from "vitest";
import {
  apiContext,
  connectionContext,
  internationalizationContext,
} from "../../../src/data/context";
import type {
  HomeAssistantApi,
  HomeAssistantConnection,
  HomeAssistantInternationalization,
} from "../../../src/types";

export interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

export const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
};

export type SendMessage = (message: {
  type: string;
  repository_id?: string;
}) => Promise<unknown>;

export const mockConnection = (
  sendMessagePromise: SendMessage = async () => null
) => ({
  subscribeMessage: vi.fn(async () => vi.fn()),
  sendMessagePromise: vi.fn(sendMessagePromise),
});

export type MockConnection = ReturnType<typeof mockConnection>;

// The real ha-dialog reports "closed" once its hide animation is done, the
// dialog mixin removes the dialog on that.
export const defineClosingDialogStub = () => {
  if (customElements.get("ha-dialog")) {
    return;
  }

  customElements.define(
    "ha-dialog",
    class extends HTMLElement {
      public headerTitle?: string;

      public set open(open: boolean) {
        if (!open) {
          this.dispatchEvent(
            new Event("closed", { bubbles: true, composed: true })
          );
        }
      }
    }
  );
};

// Dialogs get their hass pieces from contexts, like the dialog manager's
// root element provides them.
export const openDialog = async <Tag extends keyof HTMLElementTagNameMap>(
  tag: Tag,
  params: unknown,
  connection: MockConnection = mockConnection()
): Promise<HTMLElementTagNameMap[Tag]> => {
  const host = document.createElement("div");
  new ContextProvider(host, {
    context: internationalizationContext,
    initialValue: {
      localize: (key: string) => key,
      locale: { language: "en" },
    } as unknown as HomeAssistantInternationalization,
  });
  new ContextProvider(host, {
    context: connectionContext,
    initialValue: { connection } as unknown as HomeAssistantConnection,
  });
  new ContextProvider(host, {
    context: apiContext,
    initialValue: {
      callApi: vi.fn(async () => undefined),
      // Like the real one, it answers through the connection
      callWS: (message: Parameters<MockConnection["sendMessagePromise"]>[0]) =>
        connection.sendMessagePromise(message),
    } as unknown as HomeAssistantApi,
  });
  document.body.appendChild(host);

  const dialog = document.createElement(tag);
  (dialog as unknown as { params: unknown }).params = params;
  host.appendChild(dialog);
  await (dialog as unknown as { updateComplete: Promise<unknown> })
    .updateComplete;
  return dialog;
};

// Lets pending backend answers settle and the dialog render them.
export const settle = async (dialog: HTMLElement) => {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
  await (dialog as unknown as { updateComplete: Promise<unknown> })
    .updateComplete;
};

export const getInternals = (element: HTMLElement) =>
  element as unknown as Record<string, any>;
