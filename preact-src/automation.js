import { h, Component } from 'preact';

import Trigger from './trigger';
import Script from './script';

export default class Automation extends Component {
  constructor() {
    super();

    this.onChange = this.onChange.bind(this);
    this.triggerChanged = this.triggerChanged.bind(this);
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

  actionChanged(action) {
    this.props.onChange({
      ...this.props.automation,
      action,
    });
  }

  render({ automation, isWide }) {
    const { alias, trigger, condition, action } = automation;

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
                onChange={this.onChange}
              />
            </div>
          </paper-card>
        </ha-config-section>

        <ha-config-section is-wide={isWide}>
          <span slot='header'>Triggers</span>
          <span slot='introduction'>
            Like a journey, every automation starts with a single step.
            In this case it's what should trigger the automation.
            <p><a href="https://home-assistant.io/docs/automation/trigger/" target="_blank">
              Learn more about triggers.
            </a></p>
          </span>
          <Trigger trigger={trigger} onChange={this.triggerChanged} />
        </ha-config-section>

        { condition &&
          <ha-config-section is-wide={isWide}>
            <span slot='header'>Conditions</span>
            <span slot='introduction'>
              Conditions can be used to prevent an automation from executing.
              <p><a href="https://home-assistant.io/docs/scripts/conditions/" target="_blank">
                Learn more about conditions.
              </a></p>
            </span>
            <paper-card>
              <div class='card-content'>
                Conditions are not supported yet.
                <pre>{JSON.stringify(condition, null, 2)}</pre>
              </div>
            </paper-card>
          </ha-config-section>}

        <ha-config-section is-wide={isWide}>
          <span slot='header'>Action</span>
          <span slot='introduction'>
            The action part defines what the automation should do.
            <p><a href="https://home-assistant.io/docs/scripts/" target="_blank">
              Learn more about actions.
            </a></p>
          </span>
          <Script script={action} onChange={this.actionChanged} />
        </ha-config-section>
      </div>
    );
  }
}
