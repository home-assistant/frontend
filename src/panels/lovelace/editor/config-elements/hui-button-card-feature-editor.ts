import { mdiApplicationVariableOutline } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeDomain } from "../../../../common/entity/compute_domain";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import "../../../../components/ha-service-control";
import "../../../../components/ha-svg-icon";
import { hasScriptFields } from "../../../../data/script";
import type { HomeAssistant } from "../../../../types";
import type {
  ButtonCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";

@customElement("hui-button-card-feature-editor")
export class HuiButtonCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: ButtonCardFeatureConfig;

  public setConfig(config: ButtonCardFeatureConfig): void {
    this._config = config;
  }

  private _schema = memoizeOne((localize: LocalizeFunc) => [
    {
      name: "action_name",
      default: localize("ui.card.button.press"),
      selector: {
        text: {},
      },
    },
  ]);

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    let scriptData:
      | {
          action: string;
          data?: Record<string, any>;
        }
      | undefined;

    if (this.context?.entity_id) {
      const domain = computeDomain(this.context.entity_id);

      if (
        domain === "script" &&
        hasScriptFields(this.hass, this.context.entity_id)
      ) {
        scriptData = {
          action: this.context.entity_id,
          data: this._config.data,
        };
      }
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${this._schema(this.hass.localize)}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>
      ${scriptData
        ? html`<ha-expansion-panel
            outlined
            expanded
            .header=${this.hass.localize(
              "ui.components.service-control.script_variables"
            )}
            .secondary=${this.hass.localize("ui.common.optional")}
            no-collapse
          >
            <ha-svg-icon
              slot="leading-icon"
              .path=${mdiApplicationVariableOutline}
            ></ha-svg-icon>
            <ha-service-control
              hide-picker
              hide-description
              .hass=${this.hass}
              .value=${scriptData}
              .showAdvanced=${this.hass.userData?.showAdvanced}
              .narrow=${false}
              @value-changed=${this._scriptFieldVariablesChanged}
            ></ha-service-control
          ></ha-expansion-panel>`
        : nothing}
    `;
  }

  private _computeLabel = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "action_name":
        return this.hass!.localize("ui.common.name");
      default:
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
    }
  };

  private _scriptFieldVariablesChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", {
      config: {
        ...(this._config || {}),
        data: ev.detail.value.data,
      },
    });
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    fireEvent(this, "config-changed", {
      config: { ...(this._config || {}), ...ev.detail.value },
    });
  }

  static styles = css`
    ha-expansion-panel {
      margin-top: 16px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-button-card-feature-editor": HuiButtonCardFeatureEditor;
  }
}
