// src/sdk/event-bus.js

class EventBus {
    constructor() {
        this.events = {};
    }

    // Lắng nghe sự kiện
    on(eventName, callback) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(callback);
    }

    // Hủy lắng nghe
    off(eventName, callback) {
        if (!this.events[eventName]) return;
        this.events[eventName] = this.events[eventName].filter(cb => cb !== callback);
    }

    // Phát tín hiệu
    emit(eventName, data) {
        if (!this.events[eventName]) return;
        this.events[eventName].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`[EventBus] Lỗi khi thực thi sự kiện ${eventName}:`, error);
            }
        });
    }
}

export const systemBus = new EventBus();