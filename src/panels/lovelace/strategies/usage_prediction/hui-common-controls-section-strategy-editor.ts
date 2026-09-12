import { mdiFormatListBulleted } from "@mdi/js";
import { html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { consumeLocalize } from "../../../../common/decorators/consume-context-entry";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { ValueChangedEvent } from "../../../../types";
import type { LovelaceStrategyEditor } from "../types";
import type { CommonControlsSectionStrategyConfig } from "./common-controls-section-strategy";

const SCHEMA = [
  {
    name: "limit",
    selector: { number: { min: 1, mode: "box" } },
  },
  {
    name: "hide_empty",
    selector: { boolean: {} },
  },
  {
    name: "entities",
    type: "expandable",
    flatten: true,
    iconPath: mdiFormatListBulleted,
    schema: [
      {
        name: "include_entities",
        selector: { entity: { multiple: true, reorder: true } },
      },
      {
        name: "exclude_entities",
        selector: { entity: { multiple: true } },
      },
    ],
  },
] as const satisfies readonly HaFormSchema[];

@customElement("hui-common-controls-section-strategy-editor")
export class HuiCommonControlsSectionStrategyEditor
  extends LitElement
  implements LovelaceStrategyEditor
{
  @state() @consumeLocalize() private _localize!: LocalizeFunc;

  @state() private _config?: CommonControlsSectionStrategyConfig;

  public setConfig(config: CommonControlsSectionStrategyConfig): void {
    this._config = config;
  }

  protected render() {
    if (!this._config) return nothing;

    return html`
      <ha-form
        .data=${this._config}
        .schema=${SCHEMA}
        .computeLabel=${this._computeLabel}
        .computeHelper=${this._computeHelper}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _computeLabel = (schema: SchemaUnion<typeof SCHEMA>) =>
    this._localize(
      `ui.panel.lovelace.editor.strategy.common_controls.${schema.name}`
    );

  private _computeHelper = (schema: SchemaUnion<typeof SCHEMA>) =>
    schema.name === "entities" || schema.name === "hide_empty"
      ? ""
      : this._localize(
          `ui.panel.lovelace.editor.strategy.common_controls.${schema.name}_helper`
        );

  private _valueChanged(
    ev: ValueChangedEvent<CommonControlsSectionStrategyConfig>
  ): void {
    ev.stopPropagation();
    fireEvent(this, "config-changed", {
      config: { ...this._config, ...ev.detail.value },
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-common-controls-section-strategy-editor": HuiCommonControlsSectionStrategyEditor;
  }
}
