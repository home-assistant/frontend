import { SelectBase } from "@material/mwc-select/mwc-select-base";
import { styles } from "@material/mwc-select/mwc-select.css";
import { css, html, nothing, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import { debounce } from "../common/util/debounce";
import { nextRender } from "../common/util/render-status";

@customElement("ha-select")
export class HaSelect extends SelectBase {
  // @ts-ignore
  @property({ type: Boolean }) public icon?: boolean;

  @property({ type: Boolean }) public rounded?: boolean;

  protected override renderLeadingIcon() {
    if (!this.icon) {
      return nothing;
    }

    return html`<span class="mdc-select__icon"
      ><slot name="icon"></slot
    ></span>`;
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("translations-updated", this._translationsUpdated);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener(
      "translations-updated",
      this._translationsUpdated
    );
  }

  protected updated(changesProps: PropertyValues): void {
    super.updated(changesProps);
    if (changesProps.has("rounded")) {
      this.outlined = this.rounded ?? false;
    }
  }

  private _translationsUpdated = debounce(async () => {
    await nextRender();
    this.layoutOptions();
  }, 500);

  static override styles = [
    styles,
    css`
      .mdc-select:not(.mdc-select--disabled) .mdc-select__icon {
        color: var(--secondary-text-color);
      }
      .mdc-select__anchor {
        width: var(--ha-select-min-width, 200px);
      }
      .mdc-select--filled .mdc-floating-label {
        inset-inline-start: 12px;
        inset-inline-end: initial;
        direction: var(--direction);
      }
      .mdc-select--filled.mdc-select--with-leading-icon .mdc-floating-label {
        inset-inline-start: 48px;
        inset-inline-end: initial;
        direction: var(--direction);
      }
      .mdc-select--filled .mdc-select__anchor {
        padding-inline-start: 12px;
        padding-inline-end: 0px;
        direction: var(--direction);
      }
      .mdc-select--filled .mdc-select__anchor .mdc-floating-label--float-above {
        transform-origin: var(--float-start);
      }
      :host([rounded]) {
        --mdc-shape-small: 16px;
      }
      :host([rounded]) .mdc-select--outlined .mdc-select__anchor {
        height: 48px;
      }
      :host([rounded])
        .mdc-select--outlined
        .mdc-select__anchor
        .mdc-floating-label--float-above {
        transform: translateY(-31px) scale(1);
      }
      :host([rounded][icon])
        .mdc-select--outlined
        .mdc-select__anchor
        .mdc-floating-label--float-above {
        transform: translateY(-31px) translateX(-32px) scale(1);
      }
    `,
  ];
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-select": HaSelect;
  }
}
