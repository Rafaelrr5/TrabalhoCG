export class SimpleEventEmitter {
  constructor() {
    this.events = new Map();
  }

  on(eventName, callback) {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, new Set());
    }
    this.events.get(eventName).add(callback);
    return this;
  }

  off(eventName, callback) {
    if (this.events.has(eventName)) {
      this.events.get(eventName).delete(callback);
    }
    return this;
  }

  emit(eventName, data) {
    if (this.events.has(eventName)) {
      this.events.get(eventName).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[EVENT] Error in ${eventName} callback:`, error);
        }
      });
    }
    return this;
  }

  once(eventName, callback) {
    const onceWrapper = (data) => {
      this.off(eventName, onceWrapper);
      callback(data);
    };
    return this.on(eventName, onceWrapper);
  }

  removeAllListeners(eventName) {
    if (eventName) {
      this.events.delete(eventName);
    } else {
      this.events.clear();
    }
    return this;
  }
}
