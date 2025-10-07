import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators";
import { mdiCog, mdiHelp } from "@mdi/js";
import "../../../../src/components/ha-button";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-dialog-footer";
import "../../../../src/components/ha-form/ha-form";
import "../../../../src/components/ha-icon-button";
import "../../../../src/components/ha-wa-dialog";
import type { HaFormSchema } from "../../../../src/components/ha-form/types";

const SCHEMA: HaFormSchema[] = [
  { type: "string", name: "Name", required: true, default: "" },
];

type DialogType =
  | false
  | "basic"
  | "basic-subtitle-below"
  | "basic-subtitle-above"
  | "form"
  | "actions";

@customElement("demo-components-ha-wa-dialog")
export class DemoHaWaDialog extends LitElement {
  @state() private _openDialog: DialogType = false;

  protected render() {
    return html`
      <div class="content">
        <h1>Dialog <code>&lt;ha-wa-dialog&gt;</code></h1>

        <p class="subtitle">Dialog component built with WebAwesome.</p>

        <h2>Demos</h2>

        <div class="buttons">
          <ha-button @click=${this._handleOpenDialog("basic")}
            >Basic dialog</ha-button
          >
          <ha-button @click=${this._handleOpenDialog("basic-subtitle-below")}
            >Basic dialog with subtitle below</ha-button
          >
          <ha-button @click=${this._handleOpenDialog("basic-subtitle-above")}
            >Basic dialog with subtitle above</ha-button
          >
          <ha-button @click=${this._handleOpenDialog("form")}
            >Dialog with form</ha-button
          >
          <ha-button @click=${this._handleOpenDialog("actions")}
            >Dialog with actions</ha-button
          >
        </div>

        <ha-wa-dialog
          .open=${this._openDialog === "basic"}
          header-title="Basic dialog"
          @closed=${this._handleClosed}
        >
          <div>Dialog content</div>
        </ha-wa-dialog>

        <ha-wa-dialog
          .open=${this._openDialog === "basic-subtitle-below"}
          header-title="Basic dialog with subtitle"
          header-subtitle="This is a basic dialog with a subtitle below"
          @closed=${this._handleClosed}
        >
          <div>Dialog content</div>
        </ha-wa-dialog>

        <ha-wa-dialog
          .open=${this._openDialog === "basic-subtitle-above"}
          header-title="Dialog with subtitle above"
          header-subtitle="This is a basic dialog with a subtitle above"
          header-subtitle-position="above"
          @closed=${this._handleClosed}
        >
          <div>Dialog content</div>
        </ha-wa-dialog>

        <ha-wa-dialog
          .open=${this._openDialog === "form"}
          header-title="Dialog with form"
          header-subtitle="This is a dialog with a form and a footer"
          prevent-scrim-close
          @closed=${this._handleClosed}
        >
          <ha-form .schema=${SCHEMA}></ha-form>
          <ha-dialog-footer slot="footer">
            <ha-button
              data-dialog="close"
              slot="secondaryAction"
              variant="plain"
              >Cancel</ha-button
            >
            <ha-button data-dialog="close" slot="primaryAction" variant="accent"
              >Submit</ha-button
            >
          </ha-dialog-footer>
        </ha-wa-dialog>

        <ha-wa-dialog
          .open=${this._openDialog === "actions"}
          header-title="Dialog with actions"
          header-subtitle="This is a dialog with header actions"
          @closed=${this._handleClosed}
        >
          <div slot="headerActionItems">
            <ha-icon-button label="Settings" path=${mdiCog}></ha-icon-button>
            <ha-icon-button label="Help" path=${mdiHelp}></ha-icon-button>
          </div>

          <div>Dialog content</div>
        </ha-wa-dialog>

        <h2>Design</h2>

        <h3>Width</h3>

        <p>There are multiple widths available for the dialog.</p>

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
              <td><code>min(720px, var(--full-width))</code></td>
            </tr>
            <tr>
              <td><code>full</code></td>
              <td><code>var(--full-width)</code></td>
            </tr>
          </tbody>
        </table>

        <p>
          <code>--full-width</code> is calculated based on the available width
          of the screen. 95vw is the maximum width of the dialog on a large
          screen, while on a small screen it is 100vw minus the safe area
          insets.
        </p>

        <p>Dialogs have a default width of <code>medium</code>.</p>

        <h3>Prevent scrim close</h3>

        <p>
          You can prevent the dialog from being closed by clicking the
          scrim/overlay. This is allowed by default.
        </p>

        <h3>Header</h3>

        <p>The header contains a title, a subtitle and action items.</p>

        <table>
          <thead>
            <tr>
              <th>Slot</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>header</code></td>
              <td>The entire header area.</td>
            </tr>
            <tr>
              <td><code>headerTitle</code></td>
              <td>The header title text.</td>
            </tr>
            <tr>
              <td><code>headerSubtitle</code></td>
              <td>The header subtitle text.</td>
            </tr>
            <tr>
              <td><code>headerActionItems</code></td>
              <td>The header action items.</td>
            </tr>
          </tbody>
        </table>

        <h4>Header title</h4>

        <p>The header title is a text string.</p>

        <h4>Header subtitle</h4>

        <p>The header subtitle is a text string.</p>

        <h4>Header action items</h4>

        <p>
          The header action items usually containing icon buttons and/or menu
          buttons.
        </p>

        <h3>Body</h3>

        <p>The body is the content of the dialog.</p>

        <h3>Footer</h3>

        <p>The footer is the footer of the dialog.</p>

        <p>
          It is recommended to use the <code>ha-dialog-footer</code> component
          for the footer and to style the buttons inside the footer as so:
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

        <h3>Example Usage</h3>

        <pre><code>&lt;ha-wa-dialog
  open
  header-title="Dialog title"
  header-subtitle="Dialog subtitle"
  prevent-scrim-close
&gt;
  &lt;div slot="headerActionItems"&gt;
    &lt;ha-icon-button label="Settings" path="mdiCog"&gt;&lt;/ha-icon-button&gt;
    &lt;ha-icon-button label="Help" path="mdiHelp"&gt;&lt;/ha-icon-button&gt;
  &lt;/div&gt;
  &lt;div&gt;Dialog content&lt;/div&gt;
  &lt;ha-dialog-footer slot="footer"&gt;
    &lt;ha-button data-dialog="close" slot="secondaryAction" variant="plain"
      &gt;Cancel&lt;/ha-button
    &gt;
    &lt;ha-button slot="primaryAction" variant="accent"&gt;Submit&lt;/ha-button&gt;
  &lt;/ha-dialog-footer&gt;
&lt;/ha-wa-dialog&gt;</code></pre>

        <h3>API</h3>

        <p>
          This component is based on the webawesome dialog component. Check the
          <a
            href="https://webawesome.com/docs/components/dialog/"
            target="_blank"
            rel="noopener noreferrer"
            >webawesome documentation</a
          >
          for more details.
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
              <td>Controls the dialog open state.</td>
              <td><code>false</code></td>
              <td><code>false</code>, <code>true</code></td>
            </tr>
            <tr>
              <td><code>width</code></td>
              <td>Preferred dialog width preset.</td>
              <td><code>medium</code></td>
              <td>
                <code>small</code>, <code>medium</code>, <code>large</code>,
                <code>full</code>
              </td>
            </tr>
            <tr>
              <td><code>prevent-scrim-close</code></td>
              <td>
                Prevents closing the dialog by clicking the scrim/overlay.
              </td>
              <td><code>false</code></td>
              <td><code>true</code></td>
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
              <td><code>flexcontent</code></td>
              <td>
                Makes the dialog body a flex container for flexible layouts.
              </td>
              <td><code>false</code></td>
              <td><code>false</code>, <code>true</code></td>
            </tr>
          </tbody>
        </table>

        <h4>CSS Custom Properties</h4>

        <table>
          <thead>
            <tr>
              <th>CSS Property</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>--dialog-content-padding</code></td>
              <td>Padding for dialog content sections.</td>
            </tr>
            <tr>
              <td><code>--ha-dialog-show-duration</code></td>
              <td>Show animation duration.</td>
            </tr>
            <tr>
              <td><code>--ha-dialog-hide-duration</code></td>
              <td>Hide animation duration.</td>
            </tr>
            <tr>
              <td><code>--ha-dialog-surface-background</code></td>
              <td>Dialog background color.</td>
            </tr>
            <tr>
              <td><code>--ha-dialog-border-radius</code></td>
              <td>Border radius of the dialog surface.</td>
            </tr>
            <tr>
              <td><code>--dialog-z-index</code></td>
              <td>Z-index for the dialog.</td>
            </tr>
            <tr>
              <td><code>--dialog-surface-position</code></td>
              <td>CSS position of the dialog surface.</td>
            </tr>
            <tr>
              <td><code>--dialog-surface-margin-top</code></td>
              <td>Top margin for the dialog surface.</td>
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
              <td>Fired when the dialog is shown.</td>
            </tr>
            <tr>
              <td><code>closed</code></td>
              <td>Fired after the dialog is hidden.</td>
            </tr>
          </tbody>
        </table>
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

      a {
        color: var(--primary-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-wa-dialog": DemoHaWaDialog;
  }
}
