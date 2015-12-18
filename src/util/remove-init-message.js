export default function removeInitMessage() {
  // remove the HTML init message
  const initMsg = document.getElementById('ha-init-skeleton');
  if (initMsg) {
    initMsg.parentElement.removeChild(initMsg);
  }
}
