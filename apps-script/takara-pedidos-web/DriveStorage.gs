/*
 * TAKARA DRIVE STORAGE V1
 *
 * Shared Takara3D root-folder helpers used by orders, Store and retention.
 */

function getOrCreateRootFolder_() {
  const folders = DriveApp.getFoldersByName(CFG.ROOT_FOLDER);

  if (folders.hasNext()) {
    return folders.next();
  }

  return DriveApp.createFolder(CFG.ROOT_FOLDER);
}

function getOrCreateChildFolder_(parent, name) {
  const folders = parent.getFoldersByName(name);

  if (folders.hasNext()) {
    return folders.next();
  }

  return parent.createFolder(name);
}

/* ============================================================
   UTILIDADES
   ============================================================ */
