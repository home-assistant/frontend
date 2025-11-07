import "./logs-app";

// Load base styles first, then apply theme
import("../../src/resources/append-ha-style").then(() => {
  import("./auto-theme");
});

document.body.appendChild(document.createElement("logs-app"));
