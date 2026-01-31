export class Screens {
  constructor(events) {
    this.events = events;
    this.loadingEl = document.getElementById("loading-screen");
    this.gameEl = document.getElementById("game-screen");
    this.offlineEl = document.getElementById("offline-popup");
  }

  showGame() {
    this.loadingEl.classList.add("hidden");
    this.gameEl.classList.remove("hidden");
  }

  showOfflineReward(data) {
    const goldEl = document.getElementById("offline-gold");
    goldEl.textContent = String(data.offlineGold);

    this.offlineEl.classList.remove("hidden");

    return new Promise((resolve) => {
      const claimBtn = document.getElementById("offline-claim");
      claimBtn.addEventListener(
        "click",
        () => {
          this.offlineEl.classList.add("hidden");
          resolve(data.offlineGold);
        },
        { once: true }
      );
    });
  }
}
