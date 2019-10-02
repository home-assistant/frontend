import { h, Component } from "preact";
import yaml from "js-yaml";
import "../../../components/ha-textarea";

export default class JSONTextArea extends Component<any, any> {
  constructor(props) {
    super(props);
    this.state = {
      isvalid: true,
      value: props.value ? yaml.safeDump(props.value) : undefined,
    };

    this.onChange = this.onChange.bind(this);
  }

  public onChange(ev) {
    const value = ev.target.value;
    let parsed;
    let isValid = true;

    if (value) {
      try {
        parsed = yaml.safeLoad(value);
        isValid = true;
      } catch (err) {
        // Invalid YAML
        isValid = false;
      }
    }

    this.setState({
      value,
      isValid,
    });
    if (isValid) {
      this.props.onChange(parsed);
    }
  }

  public render({ label }, { value, isValid }) {
    const style: any = {
      minWidth: 300,
      width: "100%",
    };
    if (!isValid) {
      style.border = "1px solid red";
    }
    return (
      <ha-textarea
        label={label}
        value={value}
        style={style}
        onvalue-changed={this.onChange}
        dir="ltr"
      />
    );
  }
}
