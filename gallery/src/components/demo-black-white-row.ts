import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement, css, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../src/common/dom/fire_event";
import type { HASSDomEvent } from "../../../src/common/dom/fire_event";
import "../../../src/components/ha-card";
import "../../../src/components/ha-button";
import type { HaButton } from "../../../src/components/ha-button";
import type { ThemeSettings } from "../../../src/types";
import {
  applyFlippedGalleryTheme,
  effectiveGalleryDarkMode,
  loadGalleryThemeSettings,
} from "../common/theme";

const mql = matchMedia("(prefers-color-scheme: dark)");

@customElement("demo-black-white-row")
class DemoBlackWhiteRow extends LitElement {
  // eslint-disable-next-line lit/no-native-attributes
  @property() title!: string;

  @property({ attribute: false }) value?: unknown;

  @property({ type: Boolean }) public disabled = false;

  @state() private _themeSettings = loadGalleryThemeSettings();

  @state() private _systemDark = mql.matches;

  @query(".flipped") private _flipped?: HTMLElement;

  connectedCallback() {
    super.connectedCallback();
    mql.addEventListener("change", this._systemDarkChanged);
    window.addEventListener(
      "theme-settings-changed",
      this._themeSettingsChanged as EventListener
    );
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    mql.removeEventListener("change", this._systemDarkChanged);
    window.removeEventListener(
      "theme-settings-changed",
      this._themeSettingsChanged as EventListener
    );
  }

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    this._applyFlippedTheme();
  }

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);

    if (
      changedProperties.has("_themeSettings") ||
      changedProperties.has("_systemDark")
    ) {
      this._applyFlippedTheme();
    }
  }

  protected render(): TemplateResult {
    const currentLabel = effectiveGalleryDarkMode(
      this._themeSettings,
      this._systemDark
    )
      ? "Dark mode"
      : "Light mode";
    const flippedLabel =
      currentLabel === "Dark mode" ? "Light mode" : "Dark mode";

    return html`
      <div class="row">
        <section class="content current" aria-label=${currentLabel}>
          <h2>${currentLabel}</h2>
          <ha-card .header=${this.title}>
            <div class="card-content">
              <slot name="light"></slot>
            </div>
            <div class="card-actions">
              <ha-button .disabled=${this.disabled} @click=${this.handleSubmit}>
                Submit
              </ha-button>
            </div>
          </ha-card>
        </section>
        <section class="content flipped" aria-label=${flippedLabel}>
          <h2>${flippedLabel}</h2>
          <ha-card .header=${this.title}>
            <div class="card-content">
              <slot name="dark"></slot>
            </div>
            <div class="card-actions">
              <ha-button .disabled=${this.disabled} @click=${this.handleSubmit}>
                Submit
              </ha-button>
            </div>
          </ha-card>
          ${
            this.value
              ? html`<pre>${JSON.stringify(this.value, undefined, 2)}</pre>`
              : nothing
          }
        </section>
      </div>
    `;
  }

  handleSubmit(ev: Event) {
    const content = (ev.target as HaButton).closest(".content");
    if (!content) {
      return;
    }

    fireEvent(this, "submitted" as any, {
      slot: content.classList.contains("current") ? "light" : "dark",
    });
  }

  private _themeSettingsChanged = (
    ev: HASSDomEvent<Partial<ThemeSettings>>
  ) => {
    this._themeSettings = {
      ...this._themeSettings,
      ...ev.detail,
      theme: "default",
    };
  };

  private _systemDarkChanged = (ev: MediaQueryListEvent) => {
    this._systemDark = ev.matches;
  };

  private _applyFlippedTheme() {
    if (!this._flipped) {
      return;
    }

    applyFlippedGalleryTheme(
      this._flipped,
      this._themeSettings,
      this._systemDark
    );
  }

  static styles = css`
    :host {
      display: block;
      flex: 1;
      min-block-size: 100%;
    }
    .row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      inline-size: 100%;
      min-block-size: 100%;
    }
    .content {
      box-sizing: border-box;
      min-inline-size: 0;
      padding: var(--ha-space-8);
      background-color: var(--primary-background-color);
      color: var(--primary-text-color);
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-4);
    }
    ha-card {
      width: 100%;
    }
    h2 {
      margin: 0;
      color: var(--primary-text-color);
      font-size: var(--ha-font-size-xl);
      font-weight: var(--ha-font-weight-medium);
      line-height: var(--ha-line-height-normal);
    }
    pre {
      box-sizing: border-box;
      width: 100%;
      margin: 0;
      overflow: auto;
      color: var(--primary-text-color);
    }
    .card-actions {
      display: flex;
      flex-direction: row-reverse;
      border-top: none;
    }
    @media only screen and (max-width: 1000px) {
      .row {
        grid-template-columns: 1fr;
      }
      .content {
        padding: 16px;
      }
      ha-card {
        width: 100%;
      }
      pre {
        margin: 0;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-black-white-row": DemoBlackWhiteRow;
  }
}
