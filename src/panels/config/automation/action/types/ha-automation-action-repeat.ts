import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-textfield";
import { RepeatAction } from "../../../../../data/script";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import "../ha-automation-action";
import type { ActionElement } from "../ha-automation-action-row";

import type { LocalizeFunc } from "../../../../../common/translations/localize";
import "../../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../../components/ha-form/types";

const OPTIONS = ["count", "while", "until", "for_each"] as const;

const getType = (action) => OPTIONS.find((option) => option in action);

@customElement("ha-automation-action-repeat")
export class HaRepeatAction extends LitElement implements ActionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public disabled = false;

  @property({ attribute: false }) public action!: RepeatAction;

  @property({ type: Boolean }) public reOrderMode = false;

  public static get defaultConfig() {
    return { repeat: { count: 2, sequence: [] } };
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc, type: string, reOrderMode: boolean) =>
      [
        {
          name: "type",
          selector: {
            select: {
              mode: "dropdown",
              options: OPTIONS.map((opt) => ({
                value: opt,
                label: localize(
                  `ui.panel.config.automation.editor.actions.type.repeat.type.${opt}.label`
                ),
              })),
            },
          },
        },
        ...(type === "count"
          ? ([
              {
                name: "count",
                required: true,
                selector: { number: { mode: "box", min: 1 } },
              },
            ] as const)
          : []),
        ...(type === "until" || type === "while"
          ? ([
              {
                name: type,
                selector: {
                  condition: { nested: true, reorder_mode: reOrderMode },
                },
              },
            ] as const)
          : []),
        ...(type === "for_each"
          ? ([
              {
                name: "for_each",
                required: true,
                selector: { object: {} },
              },
            ] as const)
          : []),
        {
          name: "sequence",
          selector: { action: { nested: true, reorder_mode: reOrderMode } },
        },
      ] as const
  );

  protected render() {
    const action = this.action.repeat;
    const type = getType(action);
    const schema = this._schema(
      this.hass.localize,
      type ?? "count",
      this.reOrderMode
    );
    const data = { ...action, type };
    return html` <ha-form
      .hass=${this.hass}
      .data=${data}
      .schema=${schema}
      .disabled=${this.disabled}
      @value-changed=${this._valueChanged}
      .computeLabel=${this._computeLabelCallback}
    ></ha-form>`;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const newVal = ev.detail.value;

    const newType = newVal.type;
    delete newVal.type;
    const oldType = getType(this.action.repeat);

    if (newType !== oldType) {
      if (newType === "count") {
        newVal.count = 2;
        delete newVal.while;
        delete newVal.until;
        delete newVal.for_each;
      }
      if (newType === "while") {
        newVal.while = newVal.until ?? [];
        delete newVal.count;
        delete newVal.until;
        delete newVal.for_each;
      }
      if (newType === "until") {
        newVal.until = newVal.while ?? [];
        delete newVal.count;
        delete newVal.while;
        delete newVal.for_each;
      }
      if (newType === "for_each") {
        newVal.for_each = {};
        delete newVal.count;
        delete newVal.while;
        delete newVal.until;
      }
    }

    fireEvent(this, "value-changed", {
      value: {
        ...this.action,
        repeat: { ...newVal },
      },
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-textfield {
          margin-top: 16px;
        }
      `,
    ];
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ): string => {
    switch (schema.name) {
      case "type":
        return this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.repeat.type_select"
        );
      case "count":
        return this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.repeat.type.count.label"
        );
      case "while":
        return (
          this.hass.localize(
            "ui.panel.config.automation.editor.actions.type.repeat.type.while.conditions"
          ) + ":"
        );
      case "until":
        return (
          this.hass.localize(
            "ui.panel.config.automation.editor.actions.type.repeat.type.until.conditions"
          ) + ":"
        );
      case "for_each":
        return (
          this.hass.localize(
            "ui.panel.config.automation.editor.actions.type.repeat.type.for_each.items"
          ) + ":"
        );
      case "sequence":
        return (
          this.hass.localize(
            "ui.panel.config.automation.editor.actions.type.repeat.sequence"
          ) + ":"
        );
    }
    return "";
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-repeat": HaRepeatAction;
  }
}
