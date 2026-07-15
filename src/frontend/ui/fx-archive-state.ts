function __mineradioInitUiFxArchives45() {
  USER_FX_ARCHIVE_STORE_KEY = 'mineradio-user-fx-archives-v1';

  USER_FX_ARCHIVE_EXPORT_TYPE = 'mineradio-user-fx-archive';

  USER_FX_ARCHIVE_SCHEMA = 1;

  hadStoredUserFxArchives = hasStoredUserFxArchives();

  userFxArchives = readUserFxArchives();

  if (!hadStoredUserFxArchives) {
    userFxArchives = [createPackagedDefaultUserFxArchiveSlot()];
    saveUserFxArchives();
  }

  userFxArchiveEditing = -1;
}
