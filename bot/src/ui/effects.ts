interface EventBus {
  on(event: string, callback: (...args: any[]) => void): void;
  off(event: string, callback: (...args: any[]) => void): void;
  emit(event: string, data?: unknown): void;
}

interface DamageData {
  damage: number;
  isCrit: boolean;
}

interface MonsterDiedData {
  gold: number;
}

interface LevelUpData {
  level: number;
}

interface StageAdvancedData {
  stage: number;
}

export class Effects {
  layer: HTMLElement;
  events: EventBus;
  _maxVisible: number;

  constructor(container: HTMLElement, events: EventBus) {
    this.layer = container.querySelector("#effects-layer") || container;
    this.events = events;
    this._maxVisible = 6;
    this._listen();
  }

  _listen(): void {
    this.events.on("damage", (data: DamageData) => {
      this.showDamageNumber(data.damage, data.isCrit);
    });

    this.events.on("monsterDied", (data: MonsterDiedData) => {
      this.showGoldDrop(data.gold);
    });

    this.events.on("levelUp", (data: LevelUpData) => {
      this.showAnnounce(`LEVEL ${data.level}!`);
    });

    this.events.on("stageAdvanced", (data: StageAdvancedData) => {
      this.showAnnounce(`STAGE ${data.stage}`);
    });
  }

  showDamageNumber(amount: number, isCrit: boolean): void {
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

  showGoldDrop(amount: number): void {
    const el = document.createElement("div");
    el.className = "float-gold";
    el.textContent = `+${amount}g`;
    el.style.left = "65%";
    el.style.top = "60%";
    this.layer.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
  }

  showAnnounce(text: string): void {
    const el = document.createElement("div");
    el.className = "announce";
    el.textContent = text;
    this.layer.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
  }
}
