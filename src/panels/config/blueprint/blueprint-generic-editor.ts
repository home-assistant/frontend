import "@material/mwc-button/mwc-button";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { nestedArrayMove } from "../../../common/util/array-move";
import "../../../components/ha-alert";
import "../../../components/ha-blueprint-picker";
import "../../../components/ha-card";
import "../../../components/ha-circular-progress";
import "../../../components/ha-markdown";
import "../../../components/ha-selector/ha-selector";
import "../../../components/ha-settings-row";
import { BlueprintAutomationConfig } from "../../../data/automation";
import {
  BlueprintInput,
  BlueprintInputSection,
  BlueprintOrError,
  Blueprints,
} from "../../../data/blueprint";
import { BlueprintScriptConfig } from "../../../data/script";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";

@customElement("blueprint-generic-editor")
export abstract class HaBlueprintGenericEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @state() protected _blueprints?: Blueprints;

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this._getBlueprints();
  }

  protected get _blueprint(): BlueprintOrError | undefined {
    if (!this._blueprints) {
      return undefined;
    }
    return this._blueprints[this._config.use_blueprint.path];
  }

  protected abstract get _config():
    | BlueprintAutomationConfig
    | BlueprintScriptConfig;

  protected renderCard() {
    const blueprint = this._blueprint;
    let border = true;
    return html`
      <ha-card
        outlined
        class="blueprint"
        .header=${this.hass.localize(
          "ui.panel.config.automation.editor.blueprint.header"
        )}
      >
        <div class="blueprint-picker-container">
          ${this._blueprints
            ? Object.keys(this._blueprints).length
              ? html`
                  <ha-blueprint-picker
                    .hass=${this.hass}
                    .label=${this.hass.localize(
                      "ui.panel.config.automation.editor.blueprint.blueprint_to_use"
                    )}
                    .blueprints=${this._blueprints}
                    .value=${this._config.use_blueprint.path}
                    .disabled=${this.disabled}
                    @value-changed=${this._blueprintChanged}
                  ></ha-blueprint-picker>
                `
              : this.hass.localize(
                  "ui.panel.config.automation.editor.blueprint.no_blueprints"
                )
            : html`<ha-circular-progress indeterminate></ha-circular-progress>`}
        </div>

        ${this._config.use_blueprint.path
          ? blueprint && "error" in blueprint
            ? html`<p class="warning padding">
                There is an error in this Blueprint: ${blueprint.error}
              </p>`
            : html`${blueprint?.metadata.description
                ? html`<ha-markdown
                    class="card-content"
                    breaks
                    .content=${blueprint.metadata.description}
                  ></ha-markdown>`
                : ""}
              ${blueprint?.metadata?.input &&
              Object.keys(blueprint.metadata.input).length
                ? Object.entries(blueprint.metadata.input).map(
                    ([key, value]) => {
                      if (value && "input" in value) {
                        const section = this.renderSection(key, value);
                        border = false;
                        return section;
                      }
                      const row = this.renderSettingRow(key, value, border);
                      border = true;
                      return row;
                    }
                  )
                : html`<p class="padding">
                    ${this.hass.localize(
                      "ui.panel.config.automation.editor.blueprint.no_inputs"
                    )}
                  </p>`}`
          : ""}
      </ha-card>
    `;
  }

  private renderSection(sectionKey: string, section: BlueprintInputSection) {
    const title = section?.name || sectionKey;
    const anyRequired =
      section.input &&
      Object.values(section.input).some(
        (item) => item === null || item.default === undefined
      );
    const expanded = !section.collapsed || anyRequired;

    return html` <ha-expansion-panel
      outlined
      .expanded=${expanded}
      .noCollapse=${anyRequired}
    >
      <div slot="header" role="heading" aria-level="3" class="section-header">
        ${section?.icon
          ? html` <ha-icon
              class="section-header"
              .icon=${section.icon}
            ></ha-icon>`
          : nothing}
        <ha-markdown .content=${title}></ha-markdown>
      </div>
      <div class="content">
        ${section?.description
          ? html`<ha-markdown .content=${section.description}></ha-markdown>`
          : nothing}
        ${section.input
          ? Object.entries(section.input).map(([key, value]) =>
              this.renderSettingRow(key, value, true)
            )
          : nothing}
      </div>
    </ha-expansion-panel>`;
  }

  private renderSettingRow(
    key: string,
    value: BlueprintInput | null,
    border: boolean
  ) {
    const selector = value?.selector ?? { text: undefined };
    const type = Object.keys(selector)[0];
    const enhancedSelector = ["action", "condition", "trigger"].includes(type)
      ? {
          [type]: {
            ...selector[type],
            path: [key],
          },
        }
      : selector;
    return html`<ha-settings-row
      .narrow=${this.narrow}
      class=${border ? "border" : ""}
    >
      <span slot="heading">${value?.name || key}</span>
      <ha-markdown
        slot="description"
        class="card-content"
        breaks
        .content=${value?.description}
      ></ha-markdown>
      ${html`<ha-selector
        .hass=${this.hass}
        .selector=${enhancedSelector}
        .key=${key}
        .disabled=${this.disabled}
        .required=${value?.default === undefined}
        .placeholder=${value?.default}
        .value=${this._config.use_blueprint.input &&
        key in this._config.use_blueprint.input
          ? this._config.use_blueprint.input[key]
          : value?.default}
        @value-changed=${this._inputChanged}
        @item-moved=${this._itemMoved}
      ></ha-selector>`}
    </ha-settings-row>`;
  }

  protected abstract _getBlueprints();

  private _blueprintChanged(ev) {
    ev.stopPropagation();
    if (this._config.use_blueprint.path === ev.detail.value) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: {
        ...this._config,
        use_blueprint: {
          path: ev.detail.value,
        },
      },
    });
  }

  private _inputChanged(ev) {
    ev.stopPropagation();
    const target = ev.target as any;
    const key = target.key;
    const value = ev.detail ? ev.detail.value : target.value;
    if (
      (this._config.use_blueprint.input &&
        this._config.use_blueprint.input[key] === value) ||
      (!this._config.use_blueprint.input && value === "")
    ) {
      return;
    }
    const input = { ...this._config.use_blueprint.input, [key]: value };

    fireEvent(this, "value-changed", {
      value: {
        ...this._config,
        use_blueprint: {
          ...this._config.use_blueprint,
          input,
        },
      },
    });
  }

  private _itemMoved(ev) {
    ev.stopPropagation();
    const { oldIndex, newIndex, oldPath, newPath } = ev.detail;

    const input = nestedArrayMove(
      this._config.use_blueprint.input,
      oldIndex,
      newIndex,
      oldPath,
      newPath
    );

    fireEvent(this, "value-changed", {
      value: {
        ...this._config,
        use_blueprint: {
          ...this._config.use_blueprint,
          input,
        },
      },
    });
  }

  protected _duplicate() {
    fireEvent(this, "duplicate");
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          display: block;
        }
        ha-card.blueprint {
          margin: 0 auto;
          margin-bottom: 64px;
        }
        .padding {
          padding: 16px;
        }
        .link-button-row {
          padding: 14px;
        }
        .blueprint-picker-container {
          padding: 0 16px 16px;
        }
        ha-textfield,
        ha-blueprint-picker {
          display: block;
        }
        h3 {
          margin: 16px;
        }
        .introduction {
          margin-top: 0;
          margin-bottom: 12px;
        }
        .introduction a {
          color: var(--primary-color);
        }
        p {
          margin-bottom: 0;
        }
        .description {
          margin-bottom: 16px;
        }
        ha-settings-row {
          --paper-time-input-justify-content: flex-end;
          --settings-row-content-width: 100%;
          --settings-row-prefix-display: contents;
        }
        ha-settings-row.border {
          border-top: 1px solid var(--divider-color);
        }
        ha-expansion-panel {
          margin: 8px;
          margin-left: 8px;
          margin-right: 8px;
        }
        ha-alert {
          margin-bottom: 16px;
          display: block;
        }
        ha-alert.re-order {
          border-radius: var(--ha-card-border-radius, 12px);
          overflow: hidden;
        }
        div.section-header {
          display: flex;
          vertical-align: middle;
        }
        ha-icon.section-header {
          padding-right: 10px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "blueprint-generic-editor": HaBlueprintGenericEditor;
  }
}
