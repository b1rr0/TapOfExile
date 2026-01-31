const tg = window.Telegram?.WebApp;

export function haptic(style = "light") {
  if (tg?.HapticFeedback) {
    tg.HapticFeedback.impactOccurred(style);
  }
}

export function hapticNotification(type = "success") {
  if (tg?.HapticFeedback) {
    tg.HapticFeedback.notificationOccurred(type);
  }
}
