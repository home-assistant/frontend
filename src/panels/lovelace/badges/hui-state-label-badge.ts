import { customElement } from "lit/decorators";
import "../../../components/entity/ha-state-label-badge";
import { HuiStateLabelBadgeEditor } from "../editor/config-elements/hui-state-label-badge-editor";
import { HuiEntityBadge } from "./hui-entity-badge";
import { EntityBadgeConfig, StateLabelBadgeConfig } from "./types";

@customElement("hui-state-label-badge")
export class HuiStateLabelBadge extends HuiEntityBadge {
  public static async getConfigElement(): Promise<HuiStateLabelBadgeEditor> {
    await import("../editor/config-elements/hui-state-label-badge-editor");
    return document.createElement("hui-state-label-badge-editor");
  }

  // @ts-ignore
  public override setConfig(config: StateLabelBadgeConfig): void {
    const entityBadgeConfig: EntityBadgeConfig = {
      type: "entity",
      entity: config.entity,
      show_name: config.show_name ?? true,
    };

    super.setConfig(entityBadgeConfig);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-state-label-badge": HuiStateLabelBadge;
  }
}
