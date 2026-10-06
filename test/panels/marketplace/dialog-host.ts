import { vi } from "vitest";
import { provideHass } from "../../../src/fake_data/provide_hass";

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
  const hass = provideHass(host, { localize: (key: string) => key });
  // The default callWS answers through the connection, like the real one
  Object.assign(hass.connection, connection);
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
