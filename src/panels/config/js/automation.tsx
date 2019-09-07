import { h, Component } from "preact";

import "@polymer/paper-input/paper-input";
import "../ha-config-section";
import "../../../components/ha-card";

import Trigger from "./trigger/index";
import Condition from "./condition/index";
import Script from "./script/index";

export default class Automation extends Component<any> {
  constructor() {
    super();

    this.onChange = this.onChange.bind(this);
    this.triggerChanged = this.triggerChanged.bind(this);
    this.conditionChanged = this.conditionChanged.bind(this);
    this.actionChanged = this.actionChanged.bind(this);
  }

  public onChange(ev) {
    this.props.onChange({
      ...this.props.automation,
      [ev.target.name]: ev.target.value,
    });
  }

  public triggerChanged(trigger) {
    this.props.onChange({ ...this.props.automation, trigger });
  }

  public conditionChanged(condition) {
    this.props.onChange({ ...this.props.automation, condition });
  }

  public actionChanged(action) {
    this.props.onChange({ ...this.props.automation, action });
  }

  public render({ automation, isWide, hass, localize }) {
    const { alias, trigger, condition, action } = automation;

    return (
      <div>
        <ha-config-section is-wide={isWide}>
          <span slot="header">{alias}</span>
          <span slot="introduction">
            {localize("ui.panel.config.automation.editor.introduction")}
          </span>
          <ha-card>
            <div class="card-content">
              <paper-input
                label={localize("ui.panel.config.automation.editor.alias")}
                name="alias"
                value={alias}
                onvalue-changed={this.onChange}
              />
            </div>
          </ha-card>
        </ha-config-section>

        <ha-config-section is-wide={isWide}>
          <span slot="header">
            {localize("ui.panel.config.automation.editor.triggers.header")}
          </span>
          <span slot="introduction">
            <p>
              {localize(
                "ui.panel.config.automation.editor.triggers.introduction"
              )}
            </p>
            <a
              href="https://home-assistant.io/docs/automation/trigger/"
              target="_blank"
            >
              {localize(
                "ui.panel.config.automation.editor.triggers.learn_more"
              )}
            </a>
          </span>
          <Trigger
            trigger={trigger}
            onChange={this.triggerChanged}
            hass={hass}
            localize={localize}
          />
        </ha-config-section>

        <ha-config-section is-wide={isWide}>
          <span slot="header">
            {localize("ui.panel.config.automation.editor.conditions.header")}
          </span>
          <span slot="introduction">
            <p>
              {localize(
                "ui.panel.config.automation.editor.conditions.introduction"
              )}
            </p>
            <a
              href="https://home-assistant.io/docs/scripts/conditions/"
              target="_blank"
            >
              {localize(
                "ui.panel.config.automation.editor.conditions.learn_more"
              )}
            </a>
          </span>
          <Condition
            condition={condition || []}
            onChange={this.conditionChanged}
            hass={hass}
            localize={localize}
          />
        </ha-config-section>

        <ha-config-section is-wide={isWide}>
          <span slot="header">
            {localize("ui.panel.config.automation.editor.actions.header")}
          </span>
          <span slot="introduction">
            <p>
              {localize(
                "ui.panel.config.automation.editor.actions.introduction"
              )}
            </p>
            <a
              href="https://home-assistant.io/docs/automation/action/"
              target="_blank"
            >
              {localize("ui.panel.config.automation.editor.actions.learn_more")}
            </a>
          </span>
          <Script
            script={action}
            onChange={this.actionChanged}
            hass={hass}
            localize={localize}
          />
        </ha-config-section>
      </div>
    );
  }
}
