/**
 * Default image object key + URL path strategy.
 * Other storage plugins can replace this via backendProviders.files.imagePathStrategy.
 */
export function buildDefaultImagePaths(folderId, basename) {
  const prefix = `images/${folderId}/${basename}`;
  return {
    original: { key: `${prefix}`, path: `/images/${folderId}/${basename}` },
    thumb: {
      key: `${prefix}_thumb.jpg`,
      path: `/images/${folderId}/${basename}_thumb.jpg`,
    },
    small: {
      key: `${prefix}_small.jpg`,
      path: `/images/${folderId}/${basename}_small.jpg`,
    },
    hires: {
      key: `${prefix}_hires.jpg`,
      path: `/images/${folderId}/${basename}_hires.jpg`,
    },
  };
}
