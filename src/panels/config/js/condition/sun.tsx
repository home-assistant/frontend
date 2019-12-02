import { h } from "preact";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-radio-button/paper-radio-button";
import "@polymer/paper-radio-group/paper-radio-group";

import { onChangeEvent } from "../../../../common/preact/event";
import { AutomationComponent } from "../automation-component";

export default class SunCondition extends AutomationComponent {
  private onChange: (obj: any) => void;
  private afterPicked: (obj: any) => void;
  private beforePicked: (obj: any) => void;

  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, "condition");
    this.afterPicked = this.radioGroupPicked.bind(this, "after");
    this.beforePicked = this.radioGroupPicked.bind(this, "before");
  }

  public radioGroupPicked(key, ev) {
    if (!this.initialized) {
      return;
    }
    const condition = { ...this.props.condition };

    if (ev.target.selected) {
      condition[key] = ev.target.selected;
    } else {
      delete condition[key];
    }

    this.props.onChange(this.props.index, condition);
  }

  public render({ condition, localize }) {
    /* eslint-disable camelcase */
    const { after, after_offset, before, before_offset } = condition;
    return (
      <div>
        <label id="beforelabel">
          {localize(
            "ui.panel.config.automation.editor.conditions.type.sun.before"
          )}
        </label>
        <paper-radio-group
          allow-empty-selection
          selected={before}
          aria-labelledby="beforelabel"
          onpaper-radio-group-changed={this.beforePicked}
        >
          <paper-radio-button name="sunrise">
            {localize(
              "ui.panel.config.automation.editor.conditions.type.sun.sunrise"
            )}
          </paper-radio-button>
          <paper-radio-button name="sunset">
            {localize(
              "ui.panel.config.automation.editor.conditions.type.sun.sunset"
            )}
          </paper-radio-button>
        </paper-radio-group>

        <paper-input
          label={localize(
            "ui.panel.config.automation.editor.conditions.type.sun.before_offset"
          )}
          name="before_offset"
          value={before_offset}
          onvalue-changed={this.onChange}
          disabled={before === undefined}
        />

        <label id="afterlabel">
          {localize(
            "ui.panel.config.automation.editor.conditions.type.sun.after"
          )}
        </label>
        <paper-radio-group
          allow-empty-selection
          selected={after}
          aria-labelledby="afterlabel"
          onpaper-radio-group-changed={this.afterPicked}
        >
          <paper-radio-button name="sunrise">
            {localize(
              "ui.panel.config.automation.editor.conditions.type.sun.sunrise"
            )}
          </paper-radio-button>
          <paper-radio-button name="sunset">
            {localize(
              "ui.panel.config.automation.editor.conditions.type.sun.sunset"
            )}
          </paper-radio-button>
        </paper-radio-group>

        <paper-input
          label={localize(
            "ui.panel.config.automation.editor.conditions.type.sun.after_offset"
          )}
          name="after_offset"
          value={after_offset}
          onvalue-changed={this.onChange}
          disabled={after === undefined}
        />
      </div>
    );
  }
}

(SunCondition as any).defaultConfig = {};
