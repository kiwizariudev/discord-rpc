// preload.js - nodeIntegration is enabled so this is minimal
window.addEventListener('DOMContentLoaded', () => {
  // Expose versions for display
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };
  replaceText('chrome-version', process.versions.chrome);
  replaceText('node-version', process.versions.node);
  replaceText('electron-version', process.versions.electron);
});
