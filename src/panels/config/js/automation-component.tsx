import { h, Component, ComponentChild } from "preact";

export class AutomationComponent extends Component<any, any> {
  // @ts-ignore
  protected initialized: boolean;

  constructor(props?, context?) {
    super(props, context);
    this.initialized = false;
  }

  public componentDidMount() {
    this.initialized = true;
  }

  public componentWillUnmount() {
    this.initialized = false;
  }

  public render(_props?, _state?, _context?: any): ComponentChild {
    return <div />;
  }
}
