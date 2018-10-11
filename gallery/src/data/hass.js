export default class FakeHass {
  constructor(states = {}) {
    this.states = states;
    this._wsCommands = {};
  }

  addWSCommand(command, callback) {
    this._wsCommands[command] = callback;
  }

  async callService(domain, service, serviceData) {
    console.log("callService", { domain, service, serviceData });
    return Promise.resolve();
  }

  async callWS(msg) {
    const callback = this._wsCommands[msg.type];
    return callback
      ? callback(msg)
      : Promise.reject({
          code: "command_not_mocked",
          message: "This command is not implemented in the gallery.",
        });
  }

  async sendWS(msg) {
    const callback = this._wsCommands[msg.type];

    if (callback) {
      callback(msg);
    } else {
      console.error(`Unknown command: ${msg.type}`);
    }
    console.log("sendWS", msg);
  }
}
