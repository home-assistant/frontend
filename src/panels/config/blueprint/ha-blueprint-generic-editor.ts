import type { PropertyValues, TemplateResult, CSSResultGroup } from "lit";
import { html, css, nothing, LitElement } from "lit";
import { mdiContentSave, mdiHelpCircle } from "@mdi/js";
import { classMap } from "lit/directives/class-map";
import { property, state } from "lit/decorators";
import yaml from "js-yaml";
import "../../../layouts/hass-subpage";
import type { HomeAssistant, Route } from "../../../types";
import "../../../components/ha-fab";
import "../../../components/ha-button-menu";
import "../../../components/ha-list-item";
import "@material/mwc-button/mwc-button";
import type {
  Blueprint,
  BlueprintDomain,
  BlueprintInput,
  Blueprints,
} from "../../../data/blueprint";
import {
  getBlueprint,
  getBlueprintEditorInitData,
  saveBlueprint,
} from "../../../data/blueprint";
import { PreventUnsavedMixin } from "../../../mixins/prevent-unsaved-mixin";
import { KeyboardShortcutMixin } from "../../../mixins/keyboard-shortcut-mixin";
import { afterNextRender } from "../../../common/util/render-status";
import { showToast } from "../../../util/toast";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import { navigate } from "../../../common/navigate";
import { showBlueprintRenameDialog } from "./blueprint-rename-dialog/show-dialog-blueprint-rename";
import { documentationUrl } from "../../../util/documentation-url";
import "./input/ha-blueprint-input";
import { haStyle } from "../../../resources/styles";

export abstract class HaBlueprintGenericEditor extends PreventUnsavedMixin(
  KeyboardShortcutMixin(LitElement)
) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: false }) public blueprints!: Record<
    BlueprintDomain,
    Blueprints
  >;

  @property({ attribute: "blueprint-path" }) public blueprintPath?: string;

  @state() private _dirty = false;

  @state() protected _readOnly = false;

  @state() private _saving = false;

  @state() private _yamlErrors?: string;

  @state() private _blueprintPath?: string;

  protected abstract _blueprint: Blueprint | undefined;

  protected abstract _domain: BlueprintDomain;

  protected abstract getDefaultBlueprint(): Blueprint;

  protected abstract renderEditor(): TemplateResult | symbol;

  protected abstract renderHeader(): TemplateResult | symbol;

  protected abstract normalizeBlueprint(
    blueprint: Partial<Blueprint>
  ): Blueprint;

  protected _valueChanged(ev: CustomEvent<{ value: Blueprint }>) {
    ev.stopPropagation();

    this._blueprint = ev.detail.value;
    this._updateInputsInHass();
    if (this._readOnly) {
      return;
    }
    this._dirty = true;
  }

  private async _promptBlueprintAlias(): Promise<boolean> {
    return new Promise((resolve) => {
      showBlueprintRenameDialog(this, {
        path: this._blueprintPath!,
        blueprint: this._blueprint!,
        updateBlueprint: (blueprint) => {
          this._blueprint = blueprint;
          this._dirty = true;
          this.requestUpdate();
          resolve(true);
        },
        updatePath: (path) => {
          this._blueprintPath = path;
        },
        onClose: () => resolve(false),
      });
    });
  }

  private async _saveBlueprint(): Promise<void> {
    if (!this._blueprint) {
      return;
    }

    if (this._yamlErrors) {
      showToast(this, {
        message: this._yamlErrors,
      });
      return;
    }

    if (!this._blueprintPath) {
      const saved = await this._promptBlueprintAlias();
      if (!saved) {
        return;
      }
    }

    this._saving = true;

    try {
      const blueprint = {
        ...this._blueprint,
        blueprint: this._blueprint.metadata,
        metadata: undefined,
      };

      await saveBlueprint(
        this.hass,
        this._blueprint.metadata.domain,
        this._blueprintPath as string,
        yaml.dump(blueprint),
        this._blueprint.metadata.source_url,
        true
      );

      this._dirty = false;

      if (!this.blueprintPath) {
        navigate(
          `/config/blueprint/edit/${this._blueprint.metadata.domain}/${this._blueprintPath}.yaml`,
          {
            replace: true,
          }
        );
      }
    } catch (errors: any) {
      showToast(this, {
        message: errors.body?.message || errors.error || errors.body,
      });
      throw errors;
    } finally {
      this._saving = false;
    }
  }

  private async _loadBlueprint() {
    try {
      const inputTag = new yaml.Type("!input", { kind: "scalar" });
      const schema = yaml.DEFAULT_SCHEMA.extend([inputTag]);
      const blueprintGetResult = await getBlueprint(
        this.hass,
        this._domain,
        this._blueprintPath!
      );
      const blueprint = yaml.load(blueprintGetResult.yaml, {
        schema,
      }) as Blueprint;
      this._dirty = false;
      this._readOnly = false;
      this._blueprint = this.normalizeBlueprint(blueprint);
      this._updateInputsInHass();
    } catch (err: any) {
      await showAlertDialog(this, {
        text:
          err.status_code === 404
            ? this.hass.localize(
                "ui.panel.config.blueprint.editor.load_error_not_editable"
              )
            : this.hass.localize(
                "ui.panel.config.blueprint.editor.load_error_unknown",
                { err_no: err.status_code }
              ),
      });
      history.back();
    }
  }

  private async _confirmUnsavedChanged(): Promise<boolean> {
    if (this._dirty) {
      return showConfirmationDialog(this, {
        title: this.hass!.localize(
          "ui.panel.config.blueprint.editor.unsaved_confirm_title"
        ),
        text: this.hass!.localize(
          "ui.panel.config.blueprint.editor.unsaved_confirm_text"
        ),
        confirmText: this.hass!.localize("ui.common.leave"),
        dismissText: this.hass!.localize("ui.common.stay"),
        destructive: true,
      });
    }
    return true;
  }

  private _backTapped = async () => {
    const result = await this._confirmUnsavedChanged();
    if (result) {
      afterNextRender(() => history.back());
    }
  };

  private _inputChanged(
    ev: CustomEvent<{ value: [string, BlueprintInput][] }>
  ) {
    ev.stopPropagation();
    const input = ev.detail.value.reduce(
      (acc, [key, i]) => ({ ...acc, [key]: i }),
      {}
    );
    const blueprint = this._blueprint
      ? this._blueprint
      : this.getDefaultBlueprint();
    this._blueprint = {
      ...blueprint,
      metadata: {
        ...blueprint.metadata,
        input,
      },
    };
    this._dirty = true;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    const oldBlueprintPath = changedProps.get("blueprintPath");
    if (
      (changedProps.has("blueprintPath") || changedProps.has("blueprints")) &&
      this.blueprintPath &&
      this.hass &&
      // Only refresh config if we picked a new blueprint. If same ID, don't fetch it.
      oldBlueprintPath !== this.blueprintPath
    ) {
      this._blueprintPath = this.blueprintPath;
      this._loadBlueprint();
    }

    if (changedProps.has("blueprintPath") && !this.blueprintPath && this.hass) {
      const initData = getBlueprintEditorInitData();
      this._blueprint = {
        ...this.getDefaultBlueprint(),
        ...(initData ? this.normalizeBlueprint(initData) : initData),
      } as Blueprint;
      this._blueprintPath = undefined;
      this._readOnly = false;
      this._dirty = true;
    }
  }

  protected render() {
    if (!this._blueprint) {
      return nothing;
    }

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .backCallback=${this._backTapped}
        .header=${this._blueprint?.metadata?.name ||
        this.hass.localize("ui.panel.config.blueprint.editor.default_name")}
      >
        ${this.renderHeader()}

        <div class="editor-content">
          <div class="header">
            <h2 id="variables-heading" class="name">
              ${this.hass.localize(
                "ui.panel.config.blueprint.editor.inputs.header"
              )}
            </h2>
            <a
              href=${documentationUrl(this.hass, "/docs/blueprint/variable/")}
              target="_blank"
              rel="noreferrer"
            >
              <ha-icon-button
                .path=${mdiHelpCircle}
                .label=${this.hass.localize(
                  "ui.panel.config.blueprint.editor.inputs.learn_more"
                )}
              ></ha-icon-button>
            </a>
          </div>
          ${!Object.entries(this._blueprint?.metadata?.input || {})?.length
            ? html`<p class="section-description">
                ${this.hass.localize(
                  "ui.panel.config.blueprint.editor.inputs.section_description"
                )}
              </p>`
            : nothing}

          <ha-blueprint-input
            role="region"
            aria-labelledby="inputs-heading"
            .inputs=${Object.entries(this._blueprint?.metadata?.input || {})}
            @value-changed=${this._inputChanged}
            .hass=${this.hass}
            .disabled=${this._readOnly}
          ></ha-blueprint-input>

          ${this.renderEditor()}
        </div>

        <ha-fab
          slot="fab"
          class=${classMap({
            dirty: !this._readOnly && this._dirty,
          })}
          .label=${this.hass.localize("ui.panel.config.blueprint.editor.save")}
          .disabled=${this._saving}
          extended
          @click=${this._saveBlueprint}
        >
          <ha-svg-icon slot="icon" .path=${mdiContentSave}></ha-svg-icon>
        </ha-fab>
      </hass-subpage>
    `;
  }

  private _updateInputsInHass() {
    // TODO: Add temporary inputs to HASS object to be consumed by pickers
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    // TODO: Remove temporary inputs from HASS object
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .content {
          padding-bottom: 20px;
        }
        .yaml-mode {
          height: 100%;
          display: flex;
          flex-direction: column;
          padding-bottom: 0;
        }
        .editor-content,
        :not(.yaml-mode) > ha-alert {
          margin: 0 auto;
          max-width: 1040px;
          padding: 28px 20px 0;
          display: block;
        }
        ha-yaml-editor {
          flex-grow: 1;
          --actions-border-radius: 0;
          --code-mirror-height: 100%;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }
        p {
          margin-bottom: 0;
        }
        ha-entity-toggle {
          margin-right: 8px;
          margin-inline-end: 8px;
          margin-inline-start: initial;
        }
        ha-fab {
          position: relative;
          bottom: calc(-80px - env(safe-area-inset-bottom));
          transition: bottom 0.3s;
        }
        ha-fab.dirty {
          bottom: 0;
        }
        li[role="separator"] {
          border-bottom-color: var(--divider-color);
        }
        ha-button-menu a {
          text-decoration: none;
          color: var(--primary-color);
        }
        h1 {
          margin: 0;
        }
        .header-name {
          display: flex;
          align-items: center;
          margin: 0 auto;
          max-width: 1040px;
          padding: 28px 20px 0;
        }
        :host {
          display: block;
        }
        ha-card {
          overflow: hidden;
        }
        .description {
          margin: 0;
        }
        p {
          margin-top: 0;
        }
        .header {
          margin-top: 16px;

          display: flex;
          align-items: center;
        }
        .header:first-child {
          margin-top: -16px;
        }
        .header .name {
          font-weight: 400;
          flex: 1;
          margin-bottom: 16px;
        }
        .header a {
          color: var(--secondary-text-color);
        }
        .header .small {
          font-size: small;
          font-weight: normal;
          line-height: 0;
        }
        .section-description {
          margin-bottom: 16px;
        }

        ha-blueprint-input {
          display: block;
          margin-bottom: 16px;
        }
      `,
    ];
  }
}
