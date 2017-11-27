import { h, Component } from 'preact';

import Trigger from './trigger/index.js';
import Condition from './condition/index.js';
import Script from './script/index.js';

export default class Automation extends Component {
  constructor() {
    super();

    this.onChange = this.onChange.bind(this);
    this.triggerChanged = this.triggerChanged.bind(this);
    this.conditionChanged = this.conditionChanged.bind(this);
    this.actionChanged = this.actionChanged.bind(this);
  }

  onChange(ev) {
    this.props.onChange({
      ...this.props.automation,
      [ev.target.name]: ev.target.value,
    });
  }

  triggerChanged(trigger) {
    this.props.onChange({
      ...this.props.automation,
      trigger,
    });
  }

  conditionChanged(condition) {
    this.props.onChange({
      ...this.props.automation,
      condition,
    });
  }

  actionChanged(action) {
    this.props.onChange({
      ...this.props.automation,
      action,
    });
  }

  render({ automation, isWide, hass }) {
    const {
      alias, trigger, condition, action
    } = automation;

    return (
      <div>
        <ha-config-section is-wide={isWide}>
          <span slot='header'>{alias}</span>
          <span slot='introduction'>
            Use automations to bring your home alive.
          </span>
          <paper-card>
            <div class='card-content'>
              <paper-input
                label="Name"
                name="alias"
                value={alias}
                onvalue-changed={this.onChange}
              />
            </div>
          </paper-card>
        </ha-config-section>

        <ha-config-section is-wide={isWide}>
          <span slot='header'>Triggers</span>
          <span slot='introduction'>
            Triggers are what starts the processing of an automation rule.
            It is possible to specify multiple triggers for the same rule.
            Once a trigger starts, Home Assistant will validate the conditions,
            if any, and call the action.
            <p><a href="https://home-assistant.io/docs/automation/trigger/" target="_blank">
              Learn more about triggers.
            </a></p>
          </span>
          <Trigger
            trigger={trigger}
            onChange={this.triggerChanged}
            hass={hass}
          />
        </ha-config-section>

        <ha-config-section is-wide={isWide}>
          <span slot='header'>Conditions</span>
          <span slot='introduction'>
            Conditions are an optional part of an automation rule and can be used to prevent
            an action from happening when triggered. Conditions look very similar to triggers
            but are very different. A trigger will look at events happening in the system
            while a condition only looks at how the system looks right now. A trigger can
            observe that a switch is being turned on. A condition can only see if a switch
            is currently on or off.
            <p><a href="https://home-assistant.io/docs/scripts/conditions/" target="_blank">
              Learn more about conditions.
            </a></p>
          </span>
          <Condition
            condition={condition || []}
            onChange={this.conditionChanged}
            hass={hass}
          />
        </ha-config-section>

        <ha-config-section is-wide={isWide}>
          <span slot='header'>Action</span>
          <span slot='introduction'>
            The actions are what Home Assistant will do when the automation is triggered.
            <p><a href="https://home-assistant.io/docs/scripts/" target="_blank">
              Learn more about actions.
            </a></p>
          </span>
          <Script
            script={action}
            onChange={this.actionChanged}
            hass={hass}
          />
        </ha-config-section>
      </div>
    );
  }
}
