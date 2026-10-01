import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as MatterData from "../../../../../../src/data/matter";
import type { MatterCommissioningParameters } from "../../../../../../src/data/matter";
import type { MatterOpenCommissioningWindowDialogParams } from "../../../../../../src/panels/config/integrations/integration-panels/matter/show-dialog-matter-open-commissioning-window";
import type { HomeAssistant } from "../../../../../../src/types";

const openMatterCommissioningWindow = vi.fn();
const shareMatterDeviceExternal = vi.fn();

vi.mock("../../../../../../src/common/util/copy-clipboard", () => ({
  copyToClipboard: vi.fn(),
}));

vi.mock("../../../../../../src/data/matter", async (importOriginal) => ({
  ...(await importOriginal<typeof MatterData>()),
  openMatterCommissioningWindow: (...args: unknown[]) =>
    openMatterCommissioningWindow(...args),
  shareMatterDeviceExternal: (...args: unknown[]) =>
    shareMatterDeviceExternal(...args),
}));

await import("../../../../../../src/panels/config/integrations/integration-panels/matter/dialog-matter-open-commissioning-window");

const window_: MatterCommissioningParameters = {
  setup_pin_code: 20202021,
  setup_manual_code: "34970112332",
  setup_qr_code: "MT:-24J0AFN00KA0648G00",
  discriminator: 3840,
  vendor_id: 0xfff1,
  product_id: 0x8001,
  commissioning_timeout: 300,
};

/**
 * The element is cached and reused across opens, so a window that arrives late has to land in the open it
 * belongs to. Getting this wrong has gone both ways: a stale window rendered under another device's name,
 * and a usable window thrown away for the device it was opened for.
 */
describe("dialog-matter-open-commissioning-window", () => {
  let dialog: HTMLElement & {
    hass: HomeAssistant;
    showDialog: (
      params: MatterOpenCommissioningWindowDialogParams
    ) => Promise<void>;
  };

  // Same shape as test/dialogs/form/dialog-form.test.ts: the guard under test is only observable in
  // state the dialog keeps to itself.
  const internals = () => dialog as unknown as Record<string, unknown>;
  const share = () => (internals()["_shareDevice"] as () => Promise<void>)();
  const start = () => (internals()["_start"] as () => Promise<void>)();
  const close = () => (internals()["_dialogClosed"] as () => void)();
  const commissionParams = () =>
    internals()["_commissionParams"] as
      MatterCommissioningParameters | undefined;

  beforeEach(() => {
    openMatterCommissioningWindow.mockReset();
    shareMatterDeviceExternal.mockReset();
    dialog = document.createElement(
      "dialog-matter-open-commissioning-window"
    ) as typeof dialog;
    // The element is never appended, so `render()` never runs and this stub needs no `auth`.
    // Appending it would break every test here.
    dialog.hass = {
      devices: { dev_a: { name: "Kitchen light" } },
      localize: (key: string) => key,
    } as unknown as HomeAssistant;
  });

  const pendingWindow = () => {
    let settle!: {
      resolve: (params: MatterCommissioningParameters) => void;
      reject: (error: Error) => void;
    };
    openMatterCommissioningWindow.mockReturnValue(
      new Promise<MatterCommissioningParameters>((resolve, reject) => {
        settle = { resolve, reject };
      })
    );
    return settle;
  };

  it("drops a window that arrives for a device the dialog has left", async () => {
    await dialog.showDialog({ device_id: "dev_a" });
    const settle = pendingWindow();
    const started = start();

    close();
    await dialog.showDialog({ device_id: "dev_b" });
    settle.resolve(window_);
    await started;

    expect(commissionParams()).toBeUndefined();
    expect(internals()["_windowOpenedAt"]).toBeUndefined();
  });

  /** `ha-dialog` reads `_open`, and a dismissal that is not `closeDialog` would leave it true. */
  it("marks itself closed when the dialog reports it was dismissed", async () => {
    openMatterCommissioningWindow.mockResolvedValue(window_);
    await dialog.showDialog({ device_id: "dev_a" });
    await start();

    close();

    expect(internals()["_open"]).toBe(false);
  });

  it("drops a failure that arrives for a device the dialog has left", async () => {
    await dialog.showDialog({ device_id: "dev_a" });
    const settle = pendingWindow();
    const started = start();

    close();
    await dialog.showDialog({ device_id: "dev_b" });
    settle.reject(new Error("busy"));
    await started;

    expect(internals()["_status"]).toBeUndefined();
  });

  /** The window is open on that device, so throwing it away would orphan it. */
  it("keeps a window that arrives after a reopen for the same device", async () => {
    await dialog.showDialog({ device_id: "dev_a" });
    const settle = pendingWindow();
    const started = start();

    close();
    await dialog.showDialog({ device_id: "dev_a" });
    settle.resolve(window_);
    await started;

    expect(commissionParams()).toBe(window_);
    expect(internals()["_windowOpenedAt"]).toBeTypeOf("number");
  });

  /** A second request would revoke the window the first reply is about to show. */
  it("waits for the pending window instead of offering Start after a reopen for the same device", async () => {
    await dialog.showDialog({ device_id: "dev_a" });
    const settle = pendingWindow();
    const started = start();

    close();
    await dialog.showDialog({ device_id: "dev_a" });

    expect(internals()["_status"]).toBe("started");
    settle.resolve(window_);
    await started;
    close();
    await dialog.showDialog({ device_id: "dev_a" });
    expect(internals()["_status"]).toBeUndefined();
  });

  it("forgets the previous window when reopened without a close", async () => {
    openMatterCommissioningWindow.mockResolvedValue(window_);
    await dialog.showDialog({ device_id: "dev_a" });
    await start();
    expect(commissionParams()).toBe(window_);

    await dialog.showDialog({ device_id: "dev_b" });

    expect(commissionParams()).toBeUndefined();
    expect(internals()["_status"]).toBeUndefined();
  });

  describe("sharing", () => {
    const openedWindow = async () => {
      openMatterCommissioningWindow.mockResolvedValue(window_);
      await dialog.showDialog({ device_id: "dev_a" });
      await start();
    };

    /**
     * The keys are the contract with both companion apps and nothing else checks them: a typo here
     * leaves every test in all four repositories green and the feature dead on both platforms.
     */
    it("puts the whole window on the bus under the names the apps read", async () => {
      shareMatterDeviceExternal.mockResolvedValue({});
      await openedWindow();

      await share();

      expect(shareMatterDeviceExternal).toHaveBeenCalledTimes(1);
      expect(shareMatterDeviceExternal.mock.calls[0][1]).toStrictEqual({
        setup_qr_code: window_.setup_qr_code,
        setup_pin_code: window_.setup_pin_code,
        discriminator: window_.discriminator,
        vendor_id: window_.vendor_id,
        product_id: window_.product_id,
        device_name: "Kitchen light",
        remaining_seconds: 300,
      });
    });

    it("closes the dialog when the app reports success", async () => {
      shareMatterDeviceExternal.mockResolvedValue({});
      await openedWindow();

      await share();

      expect(internals()["_open"]).toBe(false);
      expect(internals()["_shareFailed"]).toBe(false);
    });

    /** The user backed out of the platform's sheet, which is not an error to report. */
    it("shows nothing when the app reports a cancel", async () => {
      shareMatterDeviceExternal.mockRejectedValue({ code: "canceled" });
      await openedWindow();

      await share();

      expect(internals()["_shareFailed"]).toBe(false);
      expect(internals()["_open"]).toBe(true);
    });

    it("shows a failure for every other code", async () => {
      shareMatterDeviceExternal.mockRejectedValue({ code: "failed" });
      await openedWindow();

      await share();

      expect(internals()["_shareFailed"]).toBe(true);
      expect(internals()["_open"]).toBe(true);
    });

    it("refuses a window that has run out, without asking the app", async () => {
      await openedWindow();
      internals()["_windowOpenedAt"] = Date.now() - 300_000;

      await share();

      expect(shareMatterDeviceExternal).not.toHaveBeenCalled();
      expect(internals()["_shareExpired"]).toBe(true);
    });

    /** Copying stays available while a share runs, but must not drop the window under the sheet. */
    it("keeps the dialog open when the code is copied during a share", async () => {
      shareMatterDeviceExternal.mockReturnValue(
        new Promise(() => {
          // never settles
        })
      );
      await openedWindow();
      void share();

      await (internals()["_copyCode"] as () => Promise<void>)();

      expect(internals()["_open"]).toBe(true);
      expect(commissionParams()).toBe(window_);
    });

    it("sends once while a share is already in flight", async () => {
      // A share that never settles, so the second tap meets one in flight.
      shareMatterDeviceExternal.mockReturnValue(
        new Promise(() => {
          // never settles
        })
      );
      await openedWindow();

      const first = share();
      await share();

      expect(shareMatterDeviceExternal).toHaveBeenCalledTimes(1);
      void first;
    });
  });
});
