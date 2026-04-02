/// <reference types="vite/client" />

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready(): void;
        expand(): void;
        close(): void;
        HapticFeedback: {
          impactOccurred(style: "light" | "medium" | "heavy" | "rigid" | "soft"): void;
          notificationOccurred(type: "error" | "success" | "warning"): void;
          selectionChanged(): void;
        };
        initData?: string;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
          };
          start_param?: string;
        };
        themeParams?: Record<string, string>;
      };
    };
  }
}

export {};
