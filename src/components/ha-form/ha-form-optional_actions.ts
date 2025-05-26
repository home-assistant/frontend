import { mdiPlus } from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { stopPropagation } from "../../common/dom/stop_propagation";
import type { LocalizeFunc } from "../../common/translations/localize";
import type { HomeAssistant } from "../../types";
import "../ha-button";
import "../ha-list-item";
import "../ha-svg-icon";
import "./ha-form";
import type {
  HaFormDataContainer,
  HaFormElement,
  HaFormOptionalActionsSchema,
  HaFormSchema,
} from "./types";

const NO_ACTIONS = [];

@customElement("ha-form-optional_actions")
export class HaFormOptionalActions extends LitElement implements HaFormElement {
  @property({ attribute: false }) public localize?: LocalizeFunc;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public data!: HaFormDataContainer;

  @property({ attribute: false }) public schema!: HaFormOptionalActionsSchema;

  @property({ type: Boolean }) public disabled = false;

  @property({ attribute: false }) public computeLabel?: (
    schema: HaFormSchema,
    data?: HaFormDataContainer
  ) => string;

  @property({ attribute: false }) public computeHelper?: (
    schema: HaFormSchema
  ) => string;

  @property({ attribute: false }) public localizeValue?: (
    key: string
  ) => string;

  @state() private _displayActions?: string[];

  public async focus() {
    await this.updateComplete;
    this.renderRoot.querySelector("ha-form")?.focus();
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (changedProps.has("data")) {
      const displayActions = this._displayActions ?? NO_ACTIONS;
      const hiddenActions = this._hiddenActions(
        this.schema.schema,
        displayActions
      );
      this._displayActions = [
        ...displayActions,
        ...hiddenActions.filter((name) => name in this.data),
      ];
    }
  }

  private _hiddenActions = memoizeOne(
    (schema: readonly HaFormSchema[], displayActions: string[]): string[] =>
      schema
        .map((item) => item.name)
        .filter((name) => !displayActions.includes(name))
  );

  private _displaySchema = memoizeOne(
    (
      schema: readonly HaFormSchema[],
      displayActions: string[]
    ): HaFormSchema[] =>
      schema.filter((item) => displayActions.includes(item.name))
  );

  public render(): TemplateResult {
    const displayActions = this._displayActions ?? NO_ACTIONS;

    const schema = this._displaySchema(
      this.schema.schema,
      this._displayActions ?? []
    );

    const hiddenActions = this._hiddenActions(
      this.schema.schema,
      displayActions
    );

    const schemaMap = new Map<string, HaFormSchema>(
      this.computeLabel
        ? this.schema.schema.map((item) => [item.name, item])
        : []
    );

    return html`
      ${schema.length > 0
        ? html`
            <ha-form
              .hass=${this.hass}
              .data=${this.data}
              .schema=${schema}
              .disabled=${this.disabled}
              .computeLabel=${this.computeLabel}
              .computeHelper=${this.computeHelper}
              .localizeValue=${this.localizeValue}
            ></ha-form>
          `
        : nothing}
      ${hiddenActions.length > 0
        ? html`
            <ha-button-menu
              @action=${this._handleAddAction}
              fixed
              @closed=${stopPropagation}
            >
              <ha-button slot="trigger" appearance="filled" size="small">
                <ha-svg-icon .path=${mdiPlus} slot="prefix"></ha-svg-icon>
                ${this.localize?.("ui.components.form-optional-actions.add") ||
                "Add interaction"}
              </ha-button>
              ${hiddenActions.map((action) => {
                const actionSchema = schemaMap.get(action);
                return html`
                  <ha-list-item>
                    ${this.computeLabel && actionSchema
                      ? this.computeLabel(actionSchema)
                      : action}
                  </ha-list-item>
                `;
              })}
            </ha-button-menu>
          `
        : nothing}
    `;
  }

  private _handleAddAction(ev: CustomEvent) {
    const hiddenActions = this._hiddenActions(
      this.schema.schema,
      this._displayActions ?? NO_ACTIONS
    );
    const index = ev.detail.index;
    const action = hiddenActions[index];
    this._displayActions = [...(this._displayActions ?? []), action];
  }

  static styles = css`
    :host {
      display: flex !important;
      flex-direction: column;
      gap: 24px;
    }
    :host ha-form {
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-optional_actions": HaFormOptionalActions;
  }
}
