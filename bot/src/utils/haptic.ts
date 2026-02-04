const tg = (window as any).Telegram?.WebApp;

export function haptic(style: "light" | "medium" | "heavy" | "rigid" | "soft" = "light"): void {
  if (tg?.HapticFeedback) {
    tg.HapticFeedback.impactOccurred(style);
  }
}

export function hapticNotification(type: "error" | "success" | "warning" = "success"): void {
  if (tg?.HapticFeedback) {
    tg.HapticFeedback.notificationOccurred(type);
  }
}
