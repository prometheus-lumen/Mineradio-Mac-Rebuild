import '@frontend/update/check';

import { bindBackdropClose } from '@frontend/shared/modal';
import { startUpdatePreviewDownload } from '@frontend/update/download';
import { closeUpdatePanel, openUpdatePanel } from '@frontend/update/panel';

let eventsBound = false;

export function bindUpdateEvents(): void {
  if (eventsBound) return;
  eventsBound = true;
  document.getElementById('update-entry')?.addEventListener('click', openUpdatePanel);
  document.getElementById('update-primary-btn')?.addEventListener('click', startUpdatePreviewDownload);
  document.getElementById('update-cancel-btn')?.addEventListener('click', closeUpdatePanel);
  bindBackdropClose('update-modal', closeUpdatePanel);
}
