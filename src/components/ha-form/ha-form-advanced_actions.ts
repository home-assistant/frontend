import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { stopPropagation } from "../../common/dom/stop_propagation";
import type { LocalizeFunc } from "../../common/translations/localize";
import type { HomeAssistant } from "../../types";
import "./ha-form";
import type {
  HaFormAdvancedActionsSchema,
  HaFormDataContainer,
  HaFormElement,
  HaFormSchema,
} from "./types";

const NO_ACTIONS = [];

@customElement("ha-form-advanced_actions")
export class HaFormAdvancedActions extends LitElement implements HaFormElement {
  @property({ attribute: false }) public localize?: LocalizeFunc;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public data!: HaFormDataContainer;

  @property({ attribute: false }) public schema!: HaFormAdvancedActionsSchema;

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

    return html` ${schema.map(
      (item) => html`
        <ha-form
          .hass=${this.hass}
          .data=${this.data}
          .schema=${[item]}
          .disabled=${this.disabled}
          .computeLabel=${this.computeLabel}
          .computeHelper=${this.computeHelper}
          .localizeValue=${this.localizeValue}
        ></ha-form>
      `
    )}
    ${hiddenActions.length > 0
      ? html`
          <ha-button-menu
            @action=${this._handleAddAction}
            fixed
            @closed=${stopPropagation}
          >
            <ha-button slot="trigger">
              ${this.localize?.("ui.components.form-advanced-actions.add") ||
              "Add advanced interaction"}
            </ha-button>
            ${hiddenActions.map((action) => {
              const actionSchema = this.schema.schema.find(
                (item) => item.name === action
              )!;
              return html`
                <ha-list-item>
                  ${this.computeLabel
                    ? this.computeLabel(actionSchema)
                    : action}
                </ha-list-item>
              `;
            })}
          </ha-button-menu>
        `
      : nothing}`;
  }

  private _handleAddAction(ev: CustomEvent) {
    const hiddenActions = this._hiddenActions(
      this.schema.schema,
      this._displayActions ?? []
    );
    const index = ev.detail.index;
    const action = hiddenActions[index];
    this._displayActions = [...(this._displayActions ?? []), action];
  }

  static styles = css`
    :host {
      display: grid !important;
      grid-template-columns: repeat(
        var(--form-grid-column-count, auto-fit),
        minmax(var(--form-grid-min-width, 200px), 1fr)
      );
      grid-column-gap: 8px;
      grid-row-gap: 24px;
    }
    :host > ha-form {
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-advanced_actions": HaFormAdvancedActions;
  }
}
