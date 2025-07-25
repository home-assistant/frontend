import { html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-markdown";
import { fetchBlueprints } from "../../../data/blueprint";
import type { BlueprintScriptConfig } from "../../../data/script";
import { HaBlueprintGenericEditor } from "../blueprint/blueprint-generic-editor";

@customElement("blueprint-script-editor")
export class HaBlueprintScriptEditor extends HaBlueprintGenericEditor {
  @property({ attribute: false }) public config!: BlueprintScriptConfig;

  protected get _config(): BlueprintScriptConfig {
    return this.config;
  }

  protected render() {
    return html`
      ${this.config.description
        ? html`<ha-markdown
            class="description"
            breaks
            .content=${this.config.description}
          ></ha-markdown>`
        : nothing}
      ${this.renderCard()}
    `;
  }

  protected async _getBlueprints() {
    this._blueprints = await fetchBlueprints(this.hass, "script");
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "blueprint-script-editor": HaBlueprintScriptEditor;
  }
}
