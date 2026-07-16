// Mineradio classic module: core/compatibility.
function installMineradioCompatibility() {
  // Keep the small, documented facade while domains move behind ESM exports.
  window.Mineradio = window.Mineradio || {};
  window.Mineradio.bootstrap = bootstrapMineradio;
  window.Mineradio.dispose = disposeMineradio;
}
