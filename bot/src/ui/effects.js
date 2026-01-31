export class Effects {
  constructor(container, events) {
    this.layer = container.querySelector("#effects-layer") || container;
    this.events = events;
    this._maxVisible = 6;
    this._listen();
  }

  _listen() {
    this.events.on("damage", (data) => {
      this.showDamageNumber(data.damage, data.isCrit);
    });

    this.events.on("monsterDied", (data) => {
      this.showGoldDrop(data.gold);
    });

    this.events.on("levelUp", (data) => {
      this.showAnnounce(`LEVEL ${data.level}!`);
    });

    this.events.on("stageAdvanced", (data) => {
      this.showAnnounce(`STAGE ${data.stage}`);
    });
  }

  showDamageNumber(amount, isCrit) {
    // Limit visible floating texts
    const existing = this.layer.querySelectorAll(".float-damage");
    if (existing.length >= this._maxVisible) {
      existing[0].remove();
    }

    const el = document.createElement("div");
    el.className = `float-damage ${isCrit ? "crit" : ""}`;
    el.textContent = isCrit ? `-${amount}!` : `-${amount}`;
    el.style.left = `${55 + Math.random() * 30}%`;
    el.style.top = `${30 + Math.random() * 20}%`;
    this.layer.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
  }

  showGoldDrop(amount) {
    const el = document.createElement("div");
    el.className = "float-gold";
    el.textContent = `+${amount}g`;
    el.style.left = "65%";
    el.style.top = "60%";
    this.layer.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
  }

  showAnnounce(text) {
    const el = document.createElement("div");
    el.className = "announce";
    el.textContent = text;
    this.layer.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
  }
}
