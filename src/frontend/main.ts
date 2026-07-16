import {
  bootstrapMineradio,
  disposeMineradio,
  installMineradioCompatibility,
} from 'virtual:mineradio/legacy-runtime';
import { loadOptionalDomains } from '@frontend/core/load-optional-domains';

installMineradioCompatibility();
bootstrapMineradio();
loadOptionalDomains();
window.addEventListener('pagehide', disposeMineradio, { once: true });
