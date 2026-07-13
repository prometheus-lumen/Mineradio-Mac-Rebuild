'use strict';

// Mineradio classic module: core/compatibility.
function installMineradioCompatibility() {
  // Classic top-level declarations intentionally remain the legacy window facade.
  window.Mineradio = window.Mineradio || {};
  window.Mineradio.bootstrap = bootstrapMineradio;
}
