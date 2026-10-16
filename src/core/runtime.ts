// The standalone distributor embeds all resources before the application starts.
// Server builds leave this configuration unset.
declare global {
  interface Window {
    __LABEL_SINGLE_FILE__?: {
      fonts: Record<string, string>;
      licenses: string;
    };
  }
}
export const singleFile = typeof window !== 'undefined' && Boolean(window.__LABEL_SINGLE_FILE__);
export const embeddedFonts = () => typeof window === 'undefined' ? {} : window.__LABEL_SINGLE_FILE__?.fonts ?? {};
