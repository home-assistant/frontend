import { h, Component, ComponentChild } from "preact";

export class AutomationComponent extends Component<any> {
  // @ts-ignore
  private initialized: boolean;

  constructor(props) {
    super(props);
    this.initialized = false;
  }

  public componentDidMount() {
    this.initialized = true;
  }

  public componentWillUnmount() {
    this.initialized = false;
  }

  public render(_props?, _state?, _context?: any): ComponentChild {
    return <div></div>;
  }
}
