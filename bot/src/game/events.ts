export class EventBus {
  private _listeners: Record<string, Array<(data: any) => void>>;

  constructor() {
    this._listeners = {};
  }

  on(event: string, callback: (data: any) => void): void {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    const list = this._listeners[event];
    if (!list) return;
    this._listeners[event] = list.filter((cb) => cb !== callback);
  }

  emit(event: string, data?: any): void {
    const list = this._listeners[event];
    if (!list) return;
    for (const cb of list) {
      try {
        cb(data);
      } catch (err) {
        console.error(`[EventBus] Error in "${event}" handler:`, err);
      }
    }
  }
}
