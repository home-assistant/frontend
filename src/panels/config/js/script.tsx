import { h, Component } from "preact";

import "@polymer/paper-input/paper-input";
import "../ha-config-section";
import "../../../components/ha-card";

import Script from "./script/index";

export default class ScriptEditor extends Component<{
  onChange: (...args: any[]) => any;
  script: any;
  isWide: any;
  hass: any;
  localize: any;
}> {
  constructor() {
    super();

    this.onChange = this.onChange.bind(this);
    this.sequenceChanged = this.sequenceChanged.bind(this);
  }

  public onChange(ev) {
    this.props.onChange({
      ...this.props.script,
      [ev.target.name]: ev.target.value,
    });
  }

  public sequenceChanged(sequence) {
    this.props.onChange({ ...this.props.script, sequence });
  }

  // @ts-ignore
  public render({ script, isWide, hass, localize }) {
    const { alias, sequence } = script;

    return (
      <div>
        <ha-config-section is-wide={isWide}>
          <span slot="header">{alias}</span>
          <span slot="introduction">
            Use scripts to execute a sequence of actions.
          </span>
          <ha-card>
            <div class="card-content">
              <paper-input
                label="Name"
                name="alias"
                value={alias}
                onvalue-changed={this.onChange}
              />
            </div>
          </ha-card>
        </ha-config-section>

        <ha-config-section is-wide={isWide}>
          <span slot="header">Sequence</span>
          <span slot="introduction">
            The sequence of actions of this script.
            <p>
              <a href="https://home-assistant.io/docs/scripts/" target="_blank">
                Learn more about available actions.
              </a>
            </p>
          </span>
          <Script
            script={sequence}
            onChange={this.sequenceChanged}
            hass={hass}
            localize={localize}
          />
        </ha-config-section>
      </div>
    );
  }
}
