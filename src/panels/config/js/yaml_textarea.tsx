import { h, Component } from "preact";
import yaml from "js-yaml";
import "../../../components/ha-yaml-editor";
// tslint:disable-next-line
import { HaYamlEditor } from "../../../components/ha-yaml-editor";

const isEmpty = (obj: object) => {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      return false;
    }
  }
  return true;
};

export default class YAMLTextArea extends Component<any, any> {
  private _yamlEditor!: HaYamlEditor;

  constructor(props) {
    super(props);

    let value: string | undefined;
    try {
      value =
        props.value && !isEmpty(props.value)
          ? yaml.safeDump(props.value)
          : undefined;
    } catch (err) {
      alert(`There was an error converting to YAML: ${err}`);
    }

    this.state = {
      isvalid: true,
      value,
    };

    this.onChange = this.onChange.bind(this);
  }

  public onChange(ev) {
    const value = ev.detail.value;
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
    } else {
      parsed = {};
    }

    this.setState({
      value,
      isValid,
    });
    if (isValid) {
      this.props.onChange(parsed);
    }
  }

  public componentDidMount() {
    setTimeout(() => {
      this._yamlEditor.codemirror.refresh();
    }, 1);
  }

  public render({ label }, { value, isValid }) {
    const style: any = {
      minWidth: 300,
      width: "100%",
    };
    return (
      <div>
        <p>{label}</p>
        <ha-yaml-editor
          ref={this._storeYamlEditorRef}
          style={style}
          value={value}
          error={isValid === false}
          onyaml-changed={this.onChange}
        />
      </div>
    );
  }

  private _storeYamlEditorRef = (yamlEditor) => (this._yamlEditor = yamlEditor);
}
