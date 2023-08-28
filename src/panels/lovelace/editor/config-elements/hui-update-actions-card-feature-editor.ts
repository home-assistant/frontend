import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import {
  LovelaceCardFeatureContext,
  UpdateActionsCardFeatureConfig,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";
import { supportsFeature } from "../../../../common/entity/supports-feature";
import { UpdateEntityFeature } from "../../../../data/update";
import { DEFAULT_UPDATE_BACKUP_OPTION } from "../../card-features/hui-update-actions-card-feature";

@customElement("hui-update-actions-card-feature-editor")
export class HuiUpdateActionsCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: UpdateActionsCardFeatureConfig;

  public setConfig(config: UpdateActionsCardFeatureConfig): void {
    this._config = config;
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc, supportsBackup: boolean) =>
      [
        {
          name: "backup",
          disabled: !supportsBackup,
          selector: {
            select: {
              default: "yes",
              mode: "dropdown",
              options: ["yes", "no", "ask"].map((option) => ({
                value: option,
                label: localize(
                  `ui.panel.lovelace.editor.card.features.types.update-actions.backup_options.${option}`
                ),
              })),
            },
          },
        },
      ] as const
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const stateObj = this.context?.entity_id
      ? this.hass.states[this.context?.entity_id]
      : undefined;

    const supportsBackup =
      Boolean(stateObj) &&
      supportsFeature(stateObj!, UpdateEntityFeature.BACKUP);

    const schema = this._schema(this.hass.localize, supportsBackup);

    const data = {
      ...this._config,
      ...(!this._config.backup && supportsBackup
        ? { backup: DEFAULT_UPDATE_BACKUP_OPTION }
        : {}),
    };

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .computeLabel=${this._computeLabelCallback}
        .computeHelper=${this._computeHelperCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "backup":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.tile.features.types.update-actions.${schema.name}`
        );
      default:
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
    }
  };

  private _computeHelperCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    const stateObj = this.context?.entity_id
      ? this.hass!.states[this.context?.entity_id]
      : undefined;

    const supportsBackup =
      Boolean(stateObj) &&
      supportsFeature(stateObj!, UpdateEntityFeature.BACKUP);

    switch (schema.name) {
      case "backup":
        if (!supportsBackup) {
          return this.hass!.localize(
            "ui.panel.lovelace.editor.card.features.types.update-actions.backup_not_supported"
          );
        }
        return undefined;
    }
    return undefined;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-update-actions-card-feature-editor": HuiUpdateActionsCardFeatureEditor;
  }
}
