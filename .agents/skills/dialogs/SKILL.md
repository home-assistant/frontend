---
name: dialogs
description: Build and review Home Assistant dialogs. Use when opening dialogs with the show-dialog event, implementing HassDialog lifecycle, and configuring dialog sizing and footer actions.
---

**Opening Dialogs (Fire Event Pattern - Recommended):**

```typescript
fireEvent(this, "show-dialog", {
  dialogTag: "dialog-example",
  dialogImport: () => import("./dialog-example"),
  dialogParams: { title: "Example", data: someData },
});
```

**Dialog Implementation Requirements:**

- Implement `HassDialog<T>` interface
- Use `@state() private _open = false` to control dialog visibility
- Set `_open = true` in `showDialog()`, `_open = false` in `closeDialog()`
- Return `nothing` when no params (loading state)
- Fire `dialog-closed` event in `_dialogClosed()` handler
- Use `header-title` attribute for simple titles
- Use `header-subtitle` attribute for simple subtitles
- Use slots for custom content where the standard attributes are not enough
- Use `ha-dialog-footer` with `primaryAction`/`secondaryAction` slots for footer content
- Add `autofocus` to first focusable element (e.g., `<ha-form autofocus>`). The component may need to forward this attribute internally.

### Creating a Dialog

```typescript
@customElement("dialog-my-feature")
export class DialogMyFeature
  extends LitElement
  implements HassDialog<MyDialogParams>
{
  @property({ attribute: false })
  hass!: HomeAssistant;

  @state()
  private _params?: MyDialogParams;

  @state()
  private _open = false;

  public async showDialog(params: MyDialogParams): Promise<void> {
    this._params = params;
    this._open = true;
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _submit(): void {
    // Example submit handler: perform save logic, then close the dialog
    this.closeDialog();
  }

  private _dialogClosed(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${this._params.title}
        header-subtitle=${this._params.subtitle}
        @closed=${this._dialogClosed}
      >
        <p>Dialog content</p>
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this.closeDialog}
          >
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button slot="primaryAction" @click=${this._submit}>
            ${this.hass.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-wa-dialog>
    `;
  }

  static styles = [haStyleDialog, css``];
}
```

**Dialog Sizing:**

- Use `width` attribute with predefined sizes: `"small"` (320px), `"medium"` (560px - default), `"large"` (720px), or `"full"`
- Custom sizing is NOT recommended - use the standard width presets
- Example: `<ha-wa-dialog width="small">` for alert/confirmation dialogs

**Button Appearance Guidelines:**

- **Primary action buttons**: Default appearance (no appearance attribute) or omit for standard styling
- **Secondary action buttons**: Use `appearance="plain"` for cancel/dismiss actions
- **Destructive actions**: Use `appearance="filled"` for delete/remove operations (combined with appropriate semantic styling)
- **Button sizes**: Use `size="small"` (32px height) or default/medium (40px height)
- Always place primary action in `slot="primaryAction"` and secondary in `slot="secondaryAction"` within `ha-dialog-footer`

### Dialog Design Guidelines

- Max width: 560px (Alert/confirmation: 320px fixed width)
- Close X-icon on top left (all screen sizes)
- Submit button grouped with cancel at bottom right
- Keep button labels short: "Save", "Delete", "Enable"
- Destructive actions use red warning button
- Always use a title (best practice)
- Strive for minimalism
