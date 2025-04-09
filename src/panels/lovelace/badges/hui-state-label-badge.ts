import type { HuiStateLabelBadgeEditor } from "../editor/config-elements/hui-state-label-badge-editor";
import type { EntityBadgeConfig, StateLabelBadgeConfig } from "./types";

import "../../../components/entity/ha-state-label-badge";

import { customElement } from "lit/decorators";

import { HuiEntityBadge } from "./hui-entity-badge";

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
