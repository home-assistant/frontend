import { customElement } from "lit/decorators";
import { navigate } from "../../../../../common/navigate";
import { HomeAssistant } from "../../../../../types";
import { showMatterAddDeviceDialog } from "./show-dialog-add-matter-device";

@customElement("matter-add-device")
export class MatterAddDevice extends HTMLElement {
  public hass!: HomeAssistant;

  connectedCallback() {
    showMatterAddDeviceDialog(this);
    navigate(`/config/devices`, {
      replace: true,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "matter-add-device": MatterAddDevice;
  }
}
