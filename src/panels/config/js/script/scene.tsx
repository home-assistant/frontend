import { h, Component } from "preact";
import "../../../../components/entity/ha-entity-picker";

export default class SceneAction extends Component<any> {
  constructor() {
    super();

    this.sceneChanged = this.sceneChanged.bind(this);
  }

  public sceneChanged(ev: any) {
    this.props.onChange(this.props.index, {
      ...this.props.action,
      scene: ev.target.value,
    });
  }

  public render({ action, hass }) {
    const { scene } = action;

    return (
      <div>
        <ha-entity-picker
          value={scene}
          onChange={this.sceneChanged}
          hass={hass}
          includeDomains={["scene"]}
          allowCustomEntity
        />
      </div>
    );
  }
}

(SceneAction as any).defaultConfig = {
  alias: "",
  scene: "",
};
