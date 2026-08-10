export {};

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
    fbq: ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void;
      queue: unknown[];
      loaded?: boolean;
      version?: string;
    };
    ttq: {
      page: () => void;
      track?: (...args: unknown[]) => void;
      [key: string]: unknown;
    };
  }
}
