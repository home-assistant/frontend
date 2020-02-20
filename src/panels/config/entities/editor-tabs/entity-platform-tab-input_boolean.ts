import {
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { ExtEntityRegistryEntry } from "../../../../data/entity_registry";
import { HomeAssistant } from "../../../../types";
import "../../helpers/entity-platform-helper-tab";
import { HaPaperDialog } from "../../../../components/dialog/ha-paper-dialog";

@customElement("entity-platform-tab-input_boolean")
export class EntityRegistrySettingsInputBoolean extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public entry!: ExtEntityRegistryEntry;
  @property() public dialogElement!: HaPaperDialog;

  protected render(): TemplateResult {
    return html`
      <entity-platform-helper-tab
        .hass=${this.hass}
        .entry=${this.entry}
        .dialogElement=${this.dialogElement}
        platform="input_boolean"
      >
      </entity-platform-helper-tab>
    `;
  }
}
