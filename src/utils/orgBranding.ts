export interface OrgBranding {
  name: string;
  logoUrl: string | null;
}

/** Fired after the signed-in user's own org profile is saved, so the sidebar updates without a reload. */
export const ORG_BRANDING_EVENT = 'smartly:org-branding-changed';

export const announceOrgBranding = (branding: OrgBranding) => {
  window.dispatchEvent(new CustomEvent<OrgBranding>(ORG_BRANDING_EVENT, { detail: branding }));
};

// Mirrors MAX_LOGO_DATA_URL_LENGTH in GCF/functions/src/api/routes/orgs.ts (API body limit is 64kb).
const MAX_LOGO_DATA_URL_LENGTH = 60_000;

const loadImage = (file: File) => new Promise<HTMLImageElement>((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(url);
    resolve(image);
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error('That file could not be read as an image.'));
  };
  image.src = url;
});

/**
 * Downscale an uploaded logo to a small WebP (PNG where the browser can't encode WebP)
 * that fits the org profile API's size cap.
 */
export const resizeLogo = async (file: File): Promise<string> => {
  if (!file.type.startsWith('image/')) throw new Error('Choose a PNG, JPEG, or WebP image.');
  const image = await loadImage(file);
  for (const maxSide of [256, 192, 128, 96]) {
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Your browser could not process this image.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/webp', 0.85);
    if (dataUrl.length <= MAX_LOGO_DATA_URL_LENGTH) return dataUrl;
  }
  throw new Error('This logo is too detailed to store. Try a simpler or smaller image.');
};
