import { h, Component } from "preact";
import "../../../components/ha-textarea";

export default class JSONTextArea extends Component<any, any> {
  constructor(props) {
    super(props);
    this.state = {
      isvalid: true,
      value: JSON.stringify(props.value || {}, null, 2),
    };

    this.onChange = this.onChange.bind(this);
  }

  public onChange(ev) {
    const value = ev.target.value;
    let parsed;
    let isValid;

    try {
      parsed = JSON.parse(value);
      isValid = true;
    } catch (err) {
      // Invalid JSON
      isValid = false;
    }

    this.setState({
      value,
      isValid,
    });
    if (isValid) {
      this.props.onChange(parsed);
    }
  }

  public componentWillReceiveProps({ value }) {
    if (value === this.props.value) {
      return;
    }
    this.setState({
      value: JSON.stringify(value, null, 2),
      isValid: true,
    });
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
