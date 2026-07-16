import {
  bootstrapMineradio,
  disposeMineradio,
  installMineradioCompatibility,
} from 'virtual:mineradio/legacy-runtime';
import { loadOptionalDomains } from '@frontend/core/load-optional-domains';
import {
  restorePersistedUserSettings,
  startUserSettingsPersistence,
} from '@frontend/core/settings-persistence';

installMineradioCompatibility();
void restorePersistedUserSettings().finally(() => {
  bootstrapMineradio();
  startUserSettingsPersistence();
  loadOptionalDomains();
  window.addEventListener('pagehide', disposeMineradio, { once: true });
});
