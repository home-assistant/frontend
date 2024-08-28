import { customElement } from "lit/decorators";
import { assert, assign, boolean, object, optional, string } from "superstruct";
import "../../../../components/ha-form/ha-form";
import { EntityBadgeConfig } from "../../badges/types";
import "../hui-sub-element-editor";
import { actionConfigStruct } from "../structs/action-struct";
import { baseLovelaceBadgeConfig } from "../structs/base-badge-struct";
import "./hui-card-features-editor";
import { HuiEntityBadgeEditor } from "./hui-entity-badge-editor";

const badgeConfigStruct = assign(
  baseLovelaceBadgeConfig,
  object({
    entity: optional(string()),
    name: optional(string()),
    icon: optional(string()),
    show_entity_picture: optional(boolean()),
    tap_action: optional(actionConfigStruct),
    show_name: optional(boolean()),
    image: optional(string()),
  })
);

@customElement("hui-state-label-badge-editor")
export class HuiStateLabelBadgeEditor extends HuiEntityBadgeEditor {
  // @ts-ignore
  public override setConfig(config: StateLabelBadgeConfig): void {
    assert(config, badgeConfigStruct);

    const entityBadgeConfig: EntityBadgeConfig = {
      type: "entity",
      entity: config.entity,
      show_name: config.show_name ?? true,
    };

    // @ts-ignore
    super.setConfig(entityBadgeConfig);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-state-label-badge-editor": HuiStateLabelBadgeEditor;
  }
}
