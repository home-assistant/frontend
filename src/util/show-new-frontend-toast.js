import "@polymer/paper-button/paper-button";
import "../components/ha-toast";

export default (installingWorker) => {
  const toast = document.createElement("ha-toast");
  toast.opened = true;
  toast.text = "A new version of the frontend is available.";
  toast.duration = 0;

  const button = document.createElement("paper-button");
  button.addEventListener("click", () =>
    installingWorker.postMessage({ type: "skipWaiting" })
  );
  button.style.color = "var(--primary-color)";
  button.style.fontWeight = "bold";
  button.innerHTML = "reload";
  toast.appendChild(button);

  document.body.appendChild(toast);
};
