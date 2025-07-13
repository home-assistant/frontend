import type { CSSResultGroup, TemplateResult } from "lit";
import { css, LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-yaml-editor";
import "../../../components/ha-textfield";
import "../../../components/ha-button";
import "../../../components/ha-card";
import type { HomeAssistant } from "../../../types";
import { haStyle } from "../../../resources/styles";
import type { Blueprint } from "../../../data/blueprint";
import { BlueprintYamlSchema } from "../../../data/blueprint";
import "./ha-blueprint-editor";
import "./blueprint-metadata-editor";

@customElement("developer-tools-blueprints")
class HaPanelDevBlueprints extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _blueprint: Blueprint | null = null;

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this.hass.loadFragmentTranslation("config");
  }

  private _onBlueprintContentChanged(ev: CustomEvent<{ value: Blueprint }>) {
    ev.stopPropagation();
    this._blueprint = { ...this._blueprint, ...ev.detail.value };
  }

  private _onBlueprintMetadataChanged(ev: CustomEvent<{ value: Blueprint["metadata"] }>) {
    ev.stopPropagation();
    this._blueprint = { ...this._blueprint!, metadata: ev.detail.value };
  }

  private _onBlueprintYamlChanged(ev: CustomEvent<{ value: Blueprint }>) {
    ev.stopPropagation();
    // TODO
  }

  protected render(): TemplateResult {
    const containerClass = this.narrow
      ? "container vertical"
      : "container horizontal";

    return html`
      <div class=${containerClass}>
        <div class="full-row">
          <ha-button>${this.hass.localize("ui.panel.developer-tools.tabs.blueprints.editor.actions.pick")}</ha-button>
          <ha-button>${this.hass.localize("ui.panel.developer-tools.tabs.blueprints.editor.actions.save")}</ha-button>
          <ha-button>${this.hass.localize("ui.panel.developer-tools.tabs.blueprints.editor.actions.reset")}</ha-button>
        </div>
        <ha-card>
          <blueprint-metadata-editor
            .hass=${this.hass}
            .metadata=${this._blueprint?.metadata}
            @value-changed=${this._onBlueprintMetadataChanged}
          ></blueprint-metadata-editor>
          <ha-blueprint-editor
            .hass=${this.hass}
            .narrow=${this.narrow}
            .isWide=${!this.narrow}
            .blueprints=${[]}
            .blueprintPath=${""}
            .domain=${"automation"}
            @value-changed=${this._onBlueprintContentChanged}
          >
          </ha-blueprint-editor>
        </ha-card>
        <ha-yaml-editor
          .readonly=${true}
          .yamlSchema=${BlueprintYamlSchema}
          .value=${this._blueprint}
          .autoUpdate=${true}
          @value-changed=${this._onBlueprintYamlChanged}
        >
        </ha-yaml-editor>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .container {
          margin: 16px;
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .container.vertical {
          flex-direction: column;
        }

        .container.horizontal {
          flex-direction: row;
        }

        .container > * {
          flex: 1;
        }

        ha-card {
          padding: 8px;
        }
        
        .full-row {
          flex: 1 0 100%;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "developer-tools-blueprints": HaPanelDevBlueprints;
  }
}
