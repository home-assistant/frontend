/* eslint-disable lit/lifecycle-super */
import { customElement } from "lit/decorators";
import { navigate } from "../../../../../common/navigate";
import type { HomeAssistant } from "../../../../../types";
import { showMatterAddDeviceDialog } from "./show-dialog-add-matter-device";

@customElement("matter-add-device")
export class MatterAddDevice extends HTMLElement {
  public hass!: HomeAssistant;

  async connectedCallback() {
    // Navigation closes open dialogs, so wait for it before showing the
    // dialog. This element is detached by then, open it from the app root.
    await navigate("/config/devices/dashboard", {
      replace: true,
    });
    showMatterAddDeviceDialog(document.querySelector("home-assistant") ?? this);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "matter-add-device": MatterAddDevice;
  }
}
