export const externalForwardConnectionEvents = (bus) => {
  const sendConnEvent = (evtType: string) => {
    bus.fireMessage({ type: "connection-status", result: { event: evtType } });
  };

  document.addEventListener("connected", () => {
    sendConnEvent("connected");
  });
  document.addEventListener("disconnected", () => {
    sendConnEvent("disconnected");
  });
  document.addEventListener("auth-invalid", () => {
    sendConnEvent("auth-invalid");
  });
};
