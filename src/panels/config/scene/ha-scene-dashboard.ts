import "@material/mwc-fab";
import { mdiPlus } from "@mdi/js";
import "@polymer/paper-tooltip/paper-tooltip";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { ifDefined } from "lit-html/directives/if-defined";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { stateIcon } from "../../../common/entity/state_icon";
import { DataTableColumnContainer } from "../../../components/data-table/ha-data-table";
import "../../../components/ha-icon";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import { forwardHaptic } from "../../../data/haptics";
import { activateScene, SceneEntity } from "../../../data/scene";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-tabs-subpage-data-table";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import { showToast } from "../../../util/toast";
import { configSections } from "../ha-panel-config";

@customElement("ha-scene-dashboard")
class HaSceneDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  @property() public isWide!: boolean;

  @property() public route!: Route;

  @property() public scenes!: SceneEntity[];

  private _scenes = memoizeOne((scenes: SceneEntity[]) => {
    return scenes.map((scene) => {
      return {
        ...scene,
        name: computeStateName(scene),
        icon: stateIcon(scene),
      };
    });
  });

  private _columns = memoizeOne(
    (_language): DataTableColumnContainer => {
      return {
        activate: {
          title: "",
          type: "icon-button",
          template: (_toggle, scene) =>
            html`
              <ha-icon-button
                .scene=${scene}
                icon="hass:play"
                title="${this.hass.localize(
                  "ui.panel.config.scene.picker.activate_scene"
                )}"
                @click=${(ev: Event) => this._activateScene(ev)}
              ></ha-icon-button>
            `,
        },
        icon: {
          title: "",
          type: "icon",
          template: (icon) => html` <ha-icon .icon=${icon}></ha-icon> `,
        },
        name: {
          title: this.hass.localize(
            "ui.panel.config.scene.picker.headers.name"
          ),
          sortable: true,
          filterable: true,
          direction: "asc",
          grows: true,
        },
        info: {
          title: "",
          type: "icon-button",
          template: (_info, scene) => html`
            <ha-icon-button
              .scene=${scene}
              @click=${this._showInfo}
              icon="hass:information-outline"
              title="${this.hass.localize(
                "ui.panel.config.scene.picker.show_info_scene"
              )}"
            ></ha-icon-button>
          `,
        },
        edit: {
          title: "",
          type: "icon-button",
          template: (_info, scene: any) => html`
            <a
              href=${ifDefined(
                scene.attributes.id
                  ? `/config/scene/edit/${scene.attributes.id}`
                  : undefined
              )}
            >
              <ha-icon-button
                .icon=${scene.attributes.id ? "hass:pencil" : "hass:pencil-off"}
                .disabled=${!scene.attributes.id}
                title="${this.hass.localize(
                  "ui.panel.config.scene.picker.edit_scene"
                )}"
              ></ha-icon-button>
            </a>
            ${!scene.attributes.id
              ? html`
                  <paper-tooltip animation-delay="0" position="left">
                    ${this.hass.localize(
                      "ui.panel.config.scene.picker.only_editable"
                    )}
                  </paper-tooltip>
                `
              : ""}
          `,
        },
      };
    }
  );

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        .route=${this.route}
        .tabs=${configSections.automation}
        .columns=${this._columns(this.hass.language)}
        .data=${this._scenes(this.scenes)}
        id="entity_id"
        .noDataText=${this.hass.localize(
          "ui.panel.config.scene.picker.no_scenes"
        )}
        hasFab
      >
        <ha-icon-button
          slot="toolbar-icon"
          icon="hass:help-circle"
          @click=${this._showHelp}
        ></ha-icon-button>
        <a href="/config/scene/edit/new" slot="fab">
          <mwc-fab
            title=${this.hass.localize(
              "ui.panel.config.scene.picker.add_scene"
            )}
          >
            <ha-svg-icon slot="icon" path=${mdiPlus}></ha-svg-icon>
          </mwc-fab>
        </a>
      </hass-tabs-subpage-data-table>
    `;
  }

  private _showInfo(ev) {
    ev.stopPropagation();
    const entityId = ev.currentTarget.scene.entity_id;
    fireEvent(this, "hass-more-info", { entityId });
  }

  private async _activateScene(ev) {
    ev.stopPropagation();
    const scene = ev.target.scene as SceneEntity;
    await activateScene(this.hass, scene.entity_id);
    showToast(this, {
      message: this.hass.localize(
        "ui.panel.config.scene.activated",
        "name",
        computeStateName(scene)
      ),
    });
    forwardHaptic("light");
  }

  private _showHelp() {
    showAlertDialog(this, {
      title: this.hass.localize("ui.panel.config.scene.picker.header"),
      text: html`
        ${this.hass.localize("ui.panel.config.scene.picker.introduction")}
        <p>
          <a
            href="${documentationUrl(this.hass, "/docs/scene/editor/")}"
            target="_blank"
            rel="noreferrer"
          >
            ${this.hass.localize("ui.panel.config.scene.picker.learn_more")}
          </a>
        </p>
      `,
    });
  }

  static get styles(): CSSResultArray {
    return [
      haStyle,
      css`
        a {
          color: var(--primary-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-scene-dashboard": HaSceneDashboard;
  }
}
