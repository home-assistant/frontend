import { dump } from "js-yaml";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-yaml-editor";
import { Action } from "../../../../src/data/script";
import { describeAction } from "../../../../src/data/script_i18n";
import { getEntity } from "../../../../src/fake_data/entity";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import { HomeAssistant } from "../../../../src/types";

const ENTITIES = [
  getEntity("scene", "kitchen_morning", "scening", {
    friendly_name: "Kitchen Morning",
  }),
  getEntity("media_player", "kitchen", "playing", {
    friendly_name: "Sonos Kitchen",
  }),
];

const ACTIONS = [
  { wait_template: "{{ true }}", alias: "Something with an alias" },
  { delay: "0:05" },
  { wait_template: "{{ true }}" },
  {
    condition: "template",
    value_template: "{{ true }}",
  },
  { event: "happy_event" },
  {
    device_id: "abcdefgh",
    domain: "plex",
    entity_id: "media_player.kitchen",
    type: "turn_on",
  },
  { scene: "scene.kitchen_morning" },
  {
    service: "scene.turn_on",
    target: { entity_id: "scene.kitchen_morning" },
    metadata: {},
  },
  {
    service: "media_player.play_media",
    target: { entity_id: "media_player.kitchen" },
    data: { media_content_id: "", media_content_type: "" },
    metadata: { title: "Happy Song" },
  },
  {
    wait_for_trigger: [
      {
        platform: "state",
        entity_id: "input_boolean.toggle_1",
      },
    ],
  },
  {
    variables: {
      hello: "world",
    },
  },
  {
    service: "input_boolean.toggle",
    target: {
      entity_id: "input_boolean.toggle_4",
    },
  },
  {
    parallel: [
      { scene: "scene.kitchen_morning" },
      {
        service: "media_player.play_media",
        target: { entity_id: "media_player.living_room" },
        data: { media_content_id: "", media_content_type: "" },
        metadata: { title: "Happy Song" },
      },
    ],
  },
  {
    stop: "No one is home!",
  },
  { repeat: { count: 3, sequence: [{ delay: "00:00:01" }] } },
  {
    repeat: {
      for_each: ["bread", "butter", "cheese"],
      sequence: [{ delay: "00:00:01" }],
    },
  },
  {
    if: [{ condition: "state" }],
    then: [{ delay: "00:00:01" }],
    else: [{ delay: "00:00:05" }],
  },
  {
    if: [{ condition: "state" }],
    then: [{ delay: "00:00:01" }],
  },
  {
    if: [{ condition: "state" }, { condition: "state" }],
    then: [{ delay: "00:00:01" }],
    else: [{ delay: "00:00:05" }],
  },
  {
    choose: [
      {
        conditions: [{ condition: "state" }],
        sequence: [{ delay: "00:00:01" }],
      },
      {
        conditions: [{ condition: "sun" }],
        sequence: [{ delay: "00:00:05" }],
      },
    ],
    default: [{ delay: "00:00:03" }],
  },
];

const initialAction: Action = {
  service: "light.turn_on",
  target: {
    entity_id: "light.kitchen",
  },
};

@customElement("demo-automation-describe-action")
export class DemoAutomationDescribeAction extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;

  @state() _action = initialAction;

  protected render() {
    if (!this.hass) {
      return nothing;
    }
    return html`
      <ha-card header="Actions">
        <div class="action">
          <span>
            ${this._action
              ? describeAction(this.hass, [], this._action)
              : "<invalid YAML>"}
          </span>
          <ha-yaml-editor
            label="Action Config"
            .defaultValue=${initialAction}
            @value-changed=${this._dataChanged}
          ></ha-yaml-editor>
        </div>

        ${ACTIONS.map(
          (conf) => html`
            <div class="action">
              <span>${describeAction(this.hass, [], conf as any)}</span>
              <pre>${dump(conf)}</pre>
            </div>
          `
        )}
      </ha-card>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    const hass = provideHass(this);
    hass.updateTranslations(null, "en");
    hass.updateTranslations("config", "en");
    hass.addEntities(ENTITIES);
  }

  private _dataChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    this._action = ev.detail.isValid ? ev.detail.value : undefined;
  }

  static get styles() {
    return css`
      ha-card {
        max-width: 600px;
        margin: 24px auto;
      }
      .action {
        padding: 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      span {
        margin-right: 16px;
      }
      ha-yaml-editor {
        width: 50%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-automation-describe-action": DemoAutomationDescribeAction;
  }
}
