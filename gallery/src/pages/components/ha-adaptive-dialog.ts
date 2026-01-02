import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators";
import { mdiCog, mdiHelp } from "@mdi/js";
import "../../../../src/components/ha-button";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-dialog-footer";
import "../../../../src/components/ha-adaptive-dialog";
import "../../../../src/components/ha-form/ha-form";
import "../../../../src/components/ha-icon-button";
import type { HaFormSchema } from "../../../../src/components/ha-form/types";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import type { HomeAssistant } from "../../../../src/types";

const SCHEMA: HaFormSchema[] = [
  { type: "string", name: "Name", default: "", autofocus: true },
  { type: "string", name: "Email", default: "" },
];

type DialogType =
  | false
  | "basic"
  | "basic-subtitle-below"
  | "basic-subtitle-above"
  | "form"
  | "form-block-mode"
  | "actions"
  | "large"
  | "small";

@customElement("demo-components-ha-adaptive-dialog")
export class DemoHaAdaptiveDialog extends LitElement {
  @state() private _openDialog: DialogType = false;

  @state() private _hass?: HomeAssistant;

  protected firstUpdated() {
    const hass = provideHass(this);
    this._hass = hass;
  }

  protected render() {
    return html`
      <div class="content">
        <h1>Adaptive dialog <code>&lt;ha-adaptive-dialog&gt;</code></h1>

        <p class="subtitle">
          Responsive dialog component that automatically switches between a full
          dialog and bottom sheet based on screen size.
        </p>

        <h2>Demos</h2>

        <div class="buttons">
          <ha-button @click=${this._handleOpenDialog("basic")}
            >Basic adaptive dialog</ha-button
          >
          <ha-button @click=${this._handleOpenDialog("basic-subtitle-below")}
            >Adaptive dialog with subtitle below</ha-button
          >
          <ha-button @click=${this._handleOpenDialog("basic-subtitle-above")}
            >Adaptive dialog with subtitle above</ha-button
          >
          <ha-button @click=${this._handleOpenDialog("small")}
            >Small width adaptive dialog</ha-button
          >
          <ha-button @click=${this._handleOpenDialog("large")}
            >Large width adaptive dialog</ha-button
          >
          <ha-button @click=${this._handleOpenDialog("form")}
            >Adaptive dialog with form</ha-button
          >
          <ha-button @click=${this._handleOpenDialog("form-block-mode")}
            >Adaptive dialog with form (block mode change)</ha-button
          >
          <ha-button @click=${this._handleOpenDialog("actions")}
            >Adaptive dialog with actions</ha-button
          >
        </div>

        <ha-card>
          <div class="card-content">
            <p>
              <strong>Tip:</strong> Resize your browser window to see the
              responsive behavior. The dialog automatically switches to a bottom
              sheet on narrow screens (&lt;870px width) or short screens
              (&lt;500px height).
            </p>
          </div>
        </ha-card>

        <ha-adaptive-dialog
          .hass=${this._hass}
          .open=${this._openDialog === "basic"}
          header-title="Basic adaptive dialog"
          @closed=${this._handleClosed}
        >
          <div>Adaptive dialog content</div>
        </ha-adaptive-dialog>

        <ha-adaptive-dialog
          .hass=${this._hass}
          .open=${this._openDialog === "basic-subtitle-below"}
          header-title="Adaptive dialog with subtitle"
          header-subtitle="This is an adaptive dialog with a subtitle below"
          @closed=${this._handleClosed}
        >
          <div>Adaptive dialog content</div>
        </ha-adaptive-dialog>

        <ha-adaptive-dialog
          .hass=${this._hass}
          .open=${this._openDialog === "basic-subtitle-above"}
          header-title="Adaptive dialog with subtitle above"
          header-subtitle="This is an adaptive dialog with a subtitle above"
          header-subtitle-position="above"
          @closed=${this._handleClosed}
        >
          <div>Adaptive dialog content</div>
        </ha-adaptive-dialog>

        <ha-adaptive-dialog
          .hass=${this._hass}
          .open=${this._openDialog === "small"}
          width="small"
          header-title="Small adaptive dialog"
          @closed=${this._handleClosed}
        >
          <div>This dialog uses the small width preset (320px).</div>
        </ha-adaptive-dialog>

        <ha-adaptive-dialog
          .hass=${this._hass}
          .open=${this._openDialog === "large"}
          width="large"
          header-title="Large adaptive dialog"
          @closed=${this._handleClosed}
        >
          <div>This dialog uses the large width preset (1024px).</div>
        </ha-adaptive-dialog>

        <ha-adaptive-dialog
          .hass=${this._hass}
          .open=${this._openDialog === "form"}
          header-title="Adaptive dialog with form"
          header-subtitle="This is an adaptive dialog with a form"
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
        </ha-adaptive-dialog>

        <ha-adaptive-dialog
          .hass=${this._hass}
          .open=${this._openDialog === "form-block-mode"}
          header-title="Adaptive dialog with form (block mode change)"
          header-subtitle="This form will not reset when the viewport size changes"
          block-mode-change
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
        </ha-adaptive-dialog>

        <ha-adaptive-dialog
          .hass=${this._hass}
          .open=${this._openDialog === "actions"}
          header-title="Adaptive dialog with actions"
          header-subtitle="This is an adaptive dialog with header actions"
          @closed=${this._handleClosed}
        >
          <div slot="headerActionItems">
            <ha-icon-button label="Settings" path=${mdiCog}></ha-icon-button>
            <ha-icon-button label="Help" path=${mdiHelp}></ha-icon-button>
          </div>

          <div>Adaptive dialog content</div>
        </ha-adaptive-dialog>

        <h2>Design</h2>

        <h3>Responsive behavior</h3>

        <p>
          The <code>ha-adaptive-dialog</code> component automatically switches
          between two modes based on screen size:
        </p>

        <ul>
          <li>
            <strong>Dialog mode:</strong> Used on larger screens (width &gt;
            870px and height &gt; 500px). Renders as a centered dialog using
            <code>ha-wa-dialog</code>.
          </li>
          <li>
            <strong>Bottom sheet mode:</strong> Used on mobile devices and
            smaller screens (width ≤ 870px or height ≤ 500px). Renders as a
            drawer from the bottom using <code>ha-bottom-sheet</code>.
          </li>
        </ul>

        <p>
          The mode is determined automatically and updates when the window is
          resized. To prevent mode changes after the initial mount (useful for
          preventing form resets), use the <code>block-mode-change</code>
          attribute.
        </p>

        <h3>Width</h3>

        <p>
          In dialog mode, there are multiple width presets available. These are
          ignored in bottom sheet mode.
        </p>

        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>small</code></td>
              <td><code>min(320px, var(--full-width))</code></td>
            </tr>
            <tr>
              <td><code>medium</code></td>
              <td><code>min(580px, var(--full-width))</code></td>
            </tr>
            <tr>
              <td><code>large</code></td>
              <td><code>min(1024px, var(--full-width))</code></td>
            </tr>
            <tr>
              <td><code>full</code></td>
              <td><code>var(--full-width)</code></td>
            </tr>
          </tbody>
        </table>

        <p>Adaptive dialogs have a default width of <code>medium</code>.</p>

        <h3>Header</h3>

        <p>
          The header contains a navigation icon, title, subtitle, and action
          items.
        </p>

        <table>
          <thead>
            <tr>
              <th>Slot</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>headerNavigationIcon</code></td>
              <td>
                Leading header action (e.g., close/back button). In bottom sheet
                mode, defaults to a close button if not provided.
              </td>
            </tr>
            <tr>
              <td><code>headerTitle</code></td>
              <td>The header title content.</td>
            </tr>
            <tr>
              <td><code>headerSubtitle</code></td>
              <td>The header subtitle content.</td>
            </tr>
            <tr>
              <td><code>headerActionItems</code></td>
              <td>Trailing header actions (e.g., icon buttons, menus).</td>
            </tr>
          </tbody>
        </table>

        <h4>Header title</h4>

        <p>
          The header title can be set using the <code>header-title</code>
          attribute or by providing custom content in the
          <code>headerTitle</code> slot.
        </p>

        <h4>Header subtitle</h4>

        <p>
          The header subtitle can be set using the
          <code>header-subtitle</code> attribute or by providing custom content
          in the <code>headerSubtitle</code> slot. The subtitle position
          relative to the title can be controlled with the
          <code>header-subtitle-position</code> attribute.
        </p>

        <h4>Header navigation icon</h4>

        <p>
          In bottom sheet mode, a close button is automatically provided if no
          custom navigation icon is specified. In dialog mode, the dialog can be
          closed via the standard dialog close button.
        </p>

        <h4>Header action items</h4>

        <p>
          The header action items usually contain icon buttons and/or menu
          buttons.
        </p>

        <h3>Body</h3>

        <p>The body is the content of the adaptive dialog.</p>

        <h3>Footer</h3>

        <p>The footer is the footer of the adaptive dialog.</p>

        <p>
          It is recommended to use the <code>ha-dialog-footer</code> component
          for the footer and to style the buttons inside the footer as follows:
        </p>

        <table>
          <thead>
            <tr>
              <th>Slot</th>
              <th>Description</th>
              <th>Variant to use</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>secondaryAction</code></td>
              <td>The secondary action button(s).</td>
              <td><code>plain</code></td>
            </tr>
            <tr>
              <td><code>primaryAction</code></td>
              <td>The primary action button(s).</td>
              <td><code>accent</code></td>
            </tr>
          </tbody>
        </table>

        <h2>Implementation</h2>

        <h3>When to use</h3>

        <p>
          Use <code>ha-adaptive-dialog</code> when you need a dialog that should
          adapt to different screen sizes automatically. This is particularly
          useful for:
        </p>

        <ul>
          <li>Forms and data entry that need to work well on mobile devices</li>
          <li>
            Content that benefits from full-screen presentation on small devices
          </li>
          <li>
            Interfaces that need consistent behavior across desktop and mobile
          </li>
        </ul>

        <p>
          If you don't need responsive behavior, use
          <code>ha-wa-dialog</code> directly for desktop-only dialogs or
          <code>ha-bottom-sheet</code> for mobile-only sheets.
        </p>

        <p>
          Use the <code>block-mode-change</code> attribute when you want to
          prevent the dialog from switching modes after it's opened. This is
          especially useful for forms, as it prevents form data from being lost
          when users resize their browser window.
        </p>

        <h3>Example usage</h3>

        <pre><code>&lt;ha-adaptive-dialog
  .hass=\${this.hass}
  open
  width="medium"
  header-title="Dialog title"
  header-subtitle="Dialog subtitle"
&gt;
  &lt;div slot="headerActionItems"&gt;
    &lt;ha-icon-button label="Settings" path="mdiCog"&gt;&lt;/ha-icon-button&gt;
    &lt;ha-icon-button label="Help" path="mdiHelp"&gt;&lt;/ha-icon-button&gt;
  &lt;/div&gt;
  &lt;div&gt;Dialog content&lt;/div&gt;
  &lt;ha-dialog-footer slot="footer"&gt;
    &lt;ha-button slot="secondaryAction" variant="plain"
      &gt;Cancel&lt;/ha-button
    &gt;
    &lt;ha-button slot="primaryAction" variant="accent"&gt;Submit&lt;/ha-button&gt;
  &lt;/ha-dialog-footer&gt;
&lt;/ha-adaptive-dialog&gt;</code></pre>

        <p>Example with <code>block-mode-change</code> for forms:</p>

        <pre><code>&lt;ha-adaptive-dialog
  .hass=\${this.hass}
  open
  header-title="Edit configuration"
  block-mode-change
&gt;
  &lt;ha-form .schema=\${schema} .data=\${data}&gt;&lt;/ha-form&gt;
  &lt;ha-dialog-footer slot="footer"&gt;
    &lt;ha-button slot="secondaryAction" variant="plain"
      &gt;Cancel&lt;/ha-button
    &gt;
    &lt;ha-button slot="primaryAction" variant="accent"&gt;Save&lt;/ha-button&gt;
  &lt;/ha-dialog-footer&gt;
&lt;/ha-adaptive-dialog&gt;</code></pre>

        <h3>API</h3>

        <p>
          This component combines <code>ha-wa-dialog</code> and
          <code>ha-bottom-sheet</code> with automatic mode switching based on
          screen size.
        </p>

        <h4>Attributes</h4>

        <table>
          <thead>
            <tr>
              <th>Attribute</th>
              <th>Description</th>
              <th>Default</th>
              <th>Options</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>open</code></td>
              <td>Controls the adaptive dialog open state.</td>
              <td><code>false</code></td>
              <td><code>false</code>, <code>true</code></td>
            </tr>
            <tr>
              <td><code>width</code></td>
              <td>
                Preferred dialog width preset (dialog mode only, ignored in
                bottom sheet mode).
              </td>
              <td><code>medium</code></td>
              <td>
                <code>small</code>, <code>medium</code>, <code>large</code>,
                <code>full</code>
              </td>
            </tr>
            <tr>
              <td><code>header-title</code></td>
              <td>Header title text when no custom title slot is provided.</td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td><code>header-subtitle</code></td>
              <td>
                Header subtitle text when no custom subtitle slot is provided.
              </td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td><code>header-subtitle-position</code></td>
              <td>Position of the subtitle relative to the title.</td>
              <td><code>below</code></td>
              <td><code>above</code>, <code>below</code></td>
            </tr>
            <tr>
              <td><code>aria-labelledby</code></td>
              <td>
                The ID of the element that labels the dialog (for
                accessibility).
              </td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td><code>aria-describedby</code></td>
              <td>
                The ID of the element that describes the dialog (for
                accessibility).
              </td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td><code>block-mode-change</code></td>
              <td>
                When set, the mode is determined at mount time based on the
                current screen size, but subsequent mode changes are blocked.
                Useful for preventing forms from resetting when the viewport
                size changes.
              </td>
              <td><code>false</code></td>
              <td><code>false</code>, <code>true</code></td>
            </tr>
          </tbody>
        </table>

        <h4>CSS custom properties</h4>

        <table>
          <thead>
            <tr>
              <th>CSS Property</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>--ha-dialog-surface-background</code></td>
              <td>Dialog/sheet background color.</td>
            </tr>
            <tr>
              <td><code>--ha-dialog-border-radius</code></td>
              <td>Border radius of the dialog surface (dialog mode only).</td>
            </tr>
            <tr>
              <td><code>--ha-dialog-show-duration</code></td>
              <td>Show animation duration (dialog mode only).</td>
            </tr>
            <tr>
              <td><code>--ha-dialog-hide-duration</code></td>
              <td>Hide animation duration (dialog mode only).</td>
            </tr>
          </tbody>
        </table>

        <h4>Events</h4>

        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>opened</code></td>
              <td>
                Fired when the adaptive dialog is shown (dialog mode only).
              </td>
            </tr>
            <tr>
              <td><code>closed</code></td>
              <td>
                Fired after the adaptive dialog is hidden (dialog mode only).
              </td>
            </tr>
            <tr>
              <td><code>after-show</code></td>
              <td>Fired after show animation completes (dialog mode only).</td>
            </tr>
          </tbody>
        </table>

        <h3>Focus management</h3>

        <p>
          To automatically focus an element when the adaptive dialog opens, add
          the
          <code>autofocus</code> attribute to it. Components with
          <code>delegatesFocus: true</code> (like <code>ha-form</code>) will
          forward focus to their first focusable child.
        </p>

        <p>Example:</p>

        <pre><code>&lt;ha-adaptive-dialog .hass=\${this.hass} open&gt;
  &lt;ha-form autofocus .schema=\${schema}&gt;&lt;/ha-form&gt;
&lt;/ha-adaptive-dialog&gt;</code></pre>
      </div>
    `;
  }

  private _handleOpenDialog = (dialog: DialogType) => () => {
    this._openDialog = dialog;
  };

  private _handleClosed = () => {
    this._openDialog = false;
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

      h3,
      h4 {
        margin-top: var(--ha-space-4);
        margin-bottom: var(--ha-space-2);
      }

      p {
        margin: var(--ha-space-2) 0;
        line-height: 1.6;
      }

      ul {
        margin: var(--ha-space-2) 0;
        padding-left: var(--ha-space-5);
      }

      li {
        margin: var(--ha-space-1) 0;
        line-height: 1.6;
      }

      .subtitle {
        color: var(--secondary-text-color);
        font-size: 1.1em;
        margin-bottom: var(--ha-space-4);
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin: var(--ha-space-3) 0;
      }

      th,
      td {
        text-align: left;
        padding: var(--ha-space-2);
        border-bottom: 1px solid var(--divider-color);
      }

      th {
        font-weight: 500;
      }

      code {
        background-color: var(--secondary-background-color);
        padding: 2px 6px;
        border-radius: 4px;
        font-family: monospace;
        font-size: 0.9em;
      }

      pre {
        background-color: var(--secondary-background-color);
        padding: var(--ha-space-3);
        border-radius: 8px;
        overflow-x: auto;
        margin: var(--ha-space-3) 0;
      }

      pre code {
        background-color: transparent;
        padding: 0;
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

      a {
        color: var(--primary-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-adaptive-dialog": DemoHaAdaptiveDialog;
  }
}
