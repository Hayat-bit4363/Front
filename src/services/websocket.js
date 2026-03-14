class WebSocketService {
    constructor() {
        this.socket = null;
        this.callbacks = {};
        this.url = null;
        this.reconnectTimeout = null;
        this.manualDisconnect = false;
        this.messageQueue = []; // Queue messages while connecting
    }

    connect(url) {
        this.url = url;
        this.manualDisconnect = false;
        this._connect();
    }

    _connect() {
        if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
            return;
        }

        console.log('[WS]: Connecting to', this.url);
        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
            console.log('[WS]: Connected successfully');
            if (this.reconnectTimeout) {
                clearTimeout(this.reconnectTimeout);
                this.reconnectTimeout = null;
            }
            // Flush queue
            while (this.messageQueue.length > 0) {
                const queuedMsg = this.messageQueue.shift();
                console.log("[WS]: Flushing queued message", queuedMsg.type || 'unknown');
                this.socket.send(JSON.stringify(queuedMsg));
            }
        };

        this.socket.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                const eventType = data.type || 'message';
                if (this.callbacks[eventType]) {
                    this.callbacks[eventType].forEach(cb => cb(data));
                }
                if (eventType !== 'message' && this.callbacks['message']) {
                    this.callbacks['message'].forEach(cb => cb(data));
                }
            } catch (err) {
                console.error("[WS ERROR]:", err);
            }
        };

        this.socket.onclose = (e) => {
            if (!this.manualDisconnect) {
                console.warn(`[WS]: Disconnected (Code: ${e.code}). Reconnecting in 3s...`);
                this.socket = null;
                if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
                this.reconnectTimeout = setTimeout(() => this._connect(), 3000);
            } else {
                console.log('[WS]: Manual disconnect');
            }
        };

        this.socket.onerror = (err) => {
            console.error('[WS ERROR]: Socket error encountered');
            this.socket.close();
        };
    }

    send(data) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
        } else if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
            console.warn("[WS]: Socket is connecting. Queuing message...");
            this.messageQueue.push(data);
        } else {
            console.error("[WS ERROR]: Send Failed. Socket state:", this.socket?.readyState);
            // Try to reconnect if it's dead
            if (!this.manualDisconnect) this._connect();
        }
    }

    on(event, callback) {
        if (!this.callbacks[event]) this.callbacks[event] = [];
        this.callbacks[event].push(callback);
    }

    off(event, callback) {
        if (!this.callbacks[event]) return;
        this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback);
    }

    disconnect() {
        this.manualDisconnect = true;
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }
}

const chatSocket = new WebSocketService();
const notificationSocket = new WebSocketService();

export { chatSocket, notificationSocket };
