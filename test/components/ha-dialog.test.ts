import { afterEach, describe, expect, it, vi } from "vitest";
import type { HaDialog } from "../../src/components/ha-dialog";
import "../../src/components/ha-dialog";

vi.mock("@home-assistant/webawesome/dist/components/dialog/dialog", () => {
  customElements.define("wa-dialog", class extends HTMLElement {});
  return {};
});

vi.mock("../../src/components/ha-dialog-header", () => {
  customElements.define("ha-dialog-header", class extends HTMLElement {});
  return {};
});

vi.mock("../../src/components/ha-icon-button", () => {
  customElements.define("ha-icon-button", class extends HTMLElement {});
  return {};
});

// Lit counts the test run as a server, so this never gets an observer
vi.mock("@lit-labs/observers/resize-controller", () => ({
  ResizeController: class {
    observe = vi.fn();

    unobserve = vi.fn();
  },
}));

let host: HTMLElement | undefined;

afterEach(() => {
  host?.remove();
  host = undefined;
});

// Shows the dialog the way wa-dialog announces it opened
const showDialog = async (dialog: HaDialog) => {
  await dialog.updateComplete;
  dialog
    .shadowRoot!.querySelector("wa-dialog")!
    .dispatchEvent(new Event("wa-show"));
};

describe("ha-dialog", () => {
  it("focuses its own autofocus child", async () => {
    host = document.createElement("ha-dialog");
    host.innerHTML = "<input /><input autofocus />";
    document.body.append(host);

    await showDialog(host as HaDialog);

    await vi.waitFor(() =>
      expect(document.activeElement).toBe(host!.querySelector("[autofocus]"))
    );
  });

  it.each([
    ["slotted in by a wrapper", "<input /><input autofocus />"],
    [
      "nested in content a wrapper slots in",
      "<input /><div><input autofocus /></div>",
    ],
  ])("focuses an autofocus element %s", async (_, content) => {
    // A wrapper like ha-adaptive-dialog passes its content through a slot
    host = document.createElement("div");
    host.attachShadow({ mode: "open" }).innerHTML =
      "<ha-dialog><slot></slot></ha-dialog>";
    host.innerHTML = content;
    document.body.append(host);

    await showDialog(host.shadowRoot!.querySelector("ha-dialog")!);

    await vi.waitFor(() =>
      expect(document.activeElement).toBe(host!.querySelector("[autofocus]"))
    );
  });
});
