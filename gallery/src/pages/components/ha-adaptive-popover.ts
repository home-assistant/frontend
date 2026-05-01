import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators";
import { mdiCog, mdiHelp } from "@mdi/js";
import "../../../../src/components/ha-adaptive-popover";
import "../../../../src/components/ha-button";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-dialog-footer";
import "../../../../src/components/ha-form/ha-form";
import "../../../../src/components/ha-icon-button";
import type { HASSDomCurrentTargetEvent } from "../../../../src/common/dom/fire_event";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import type { HomeAssistant } from "../../../../src/types";
import type { HaFormSchema } from "../../../../src/components/ha-form/types";

const SCHEMA: HaFormSchema[] = [
  { type: "string", name: "Name", default: "", autofocus: true },
  { type: "string", name: "Email", default: "" },
];

type PopoverType = false | "basic" | "small" | "large" | "form" | "actions";

@customElement("demo-components-ha-adaptive-popover")
export class DemoHaAdaptivePopover extends LitElement {
  @state() private _openPopover: PopoverType = false;

  @state() private _hass?: HomeAssistant;

  @state() private _dialogAnchor?: HTMLElement;

  protected firstUpdated() {
    this._hass = provideHass(this);
  }

  protected render() {
    return html`
      <div class="content">
        <h1>Adaptive popover <code>&lt;ha-adaptive-popover&gt;</code></h1>

        <p class="subtitle">
          Responsive popover component that opens as an anchored popover on
          desktop and falls back to adaptive dialog behavior otherwise.
        </p>

        <h2>Demos</h2>

        <div class="buttons">
          <ha-button @click=${this._handleOpenPopover("basic")}
            >Basic adaptive popover</ha-button
          >
          <ha-button @click=${this._handleOpenPopover("small")}
            >Small adaptive popover</ha-button
          >
          <ha-button @click=${this._handleOpenPopover("large")}
            >Large adaptive popover</ha-button
          >
          <ha-button @click=${this._handleOpenPopover("form")}
            >Adaptive popover with form</ha-button
          >
          <ha-button @click=${this._handleOpenPopover("actions")}
            >Adaptive popover with actions</ha-button
          >
        </div>

        <ha-card>
          <div class="card-content">
            <p>
              <strong>Tip:</strong> On desktop, this uses the opener as the
              popover anchor. On narrow screens, it falls back to adaptive
              dialog behavior.
            </p>
          </div>
        </ha-card>

        <ha-adaptive-popover
          .hass=${this._hass}
          .open=${this._openPopover === "basic"}
          .dialogAnchor=${this._dialogAnchor}
          header-title="Basic adaptive popover"
          header-subtitle="Anchored to the opener on desktop"
          @closed=${this._handleClosed}
        >
          <div>
            This component uses a desktop popover when an anchor is available,
            and adaptive dialog behavior otherwise.
          </div>
        </ha-adaptive-popover>

        <ha-adaptive-popover
          .hass=${this._hass}
          .open=${this._openPopover === "small"}
          .dialogAnchor=${this._dialogAnchor}
          width="small"
          header-title="Small adaptive popover"
          @closed=${this._handleClosed}
        >
          <div>This popover uses the small width preset (320px).</div>
        </ha-adaptive-popover>

        <ha-adaptive-popover
          .hass=${this._hass}
          .open=${this._openPopover === "large"}
          .dialogAnchor=${this._dialogAnchor}
          width="large"
          header-title="Large adaptive popover"
          @closed=${this._handleClosed}
        >
          <div>This popover uses the large width preset (1024px).</div>
        </ha-adaptive-popover>

        <ha-adaptive-popover
          .hass=${this._hass}
          .open=${this._openPopover === "form"}
          .dialogAnchor=${this._dialogAnchor}
          header-title="Adaptive popover with form"
          header-subtitle="This is an adaptive popover with a form"
          @closed=${this._handleClosed}
        >
          <ha-form autofocus .schema=${SCHEMA}></ha-form>
          <ha-dialog-footer slot="footer">
            <ha-button
              @click=${this._handleClosed}
              slot="secondaryAction"
              variant="plain"
              >Cancel</ha-button
            >
            <ha-button
              @click=${this._handleClosed}
              slot="primaryAction"
              variant="accent"
              >Submit</ha-button
            >
          </ha-dialog-footer>
        </ha-adaptive-popover>

        <ha-adaptive-popover
          .hass=${this._hass}
          .open=${this._openPopover === "actions"}
          .dialogAnchor=${this._dialogAnchor}
          header-title="Adaptive popover with actions"
          header-subtitle="This is an adaptive popover with header actions"
          @closed=${this._handleClosed}
        >
          <div slot="headerActionItems">
            <ha-icon-button label="Settings" path=${mdiCog}></ha-icon-button>
            <ha-icon-button label="Help" path=${mdiHelp}></ha-icon-button>
          </div>

          <div>Adaptive popover content</div>
        </ha-adaptive-popover>
      </div>
    `;
  }

  private _handleOpenPopover =
    (popover: PopoverType) => (ev?: HASSDomCurrentTargetEvent<HTMLElement>) => {
      this._dialogAnchor = ev?.currentTarget;
      this._openPopover = popover;
    };

  private _handleClosed = () => {
    this._dialogAnchor = undefined;
    this._openPopover = false;
  };

  static styles = [
    css`
      :host {
        display: block;
        padding: var(--ha-space-4);
      }

      .content {
        max-width: 1000px;
        margin: 0 auto;
      }

      h1 {
        margin-top: 0;
        margin-bottom: var(--ha-space-2);
      }

      h2 {
        margin-top: var(--ha-space-6);
        margin-bottom: var(--ha-space-3);
      }

      p {
        margin: var(--ha-space-2) 0;
        line-height: 1.6;
      }

      .subtitle {
        color: var(--secondary-text-color);
        font-size: 1.1em;
        margin-bottom: var(--ha-space-4);
      }

      .buttons {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--ha-space-2);
        margin: var(--ha-space-4) 0;
      }

      .card-content {
        padding: var(--ha-space-3);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-adaptive-popover": DemoHaAdaptivePopover;
  }
}
