class WebSocketService {
    constructor() {
        this.socket = null;
        this.callbacks = {}; // event -> [callback1, callback2, ...]
    }

    connect(url) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) return;
        
        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
            console.log('WebSocket Connected to:', url);
        };

        this.socket.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                const eventType = data.type || 'message';
                
                // Dispatch to specific event listeners
                if (this.callbacks[eventType]) {
                    this.callbacks[eventType].forEach(cb => cb(data));
                }
                
                // Also dispatch to a general 'message' listener
                if (eventType !== 'message' && this.callbacks['message']) {
                    this.callbacks['message'].forEach(cb => cb(data));
                }
            } catch (err) {
                console.error("Error parsing WebSocket message:", err);
            }
        };

        this.socket.onclose = () => {
            console.log('WebSocket Disconnected');
        };
    }

    send(data) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            console.log("[WS OUTGOING]:", JSON.stringify(data, null, 2));
            this.socket.send(JSON.stringify(data));
        } else {
            console.error("[WS ERROR]: Send Failed. Socket state:", this.socket?.readyState);
        }
    }

    on(event, callback) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(callback);
    }

    off(event, callback) {
        if (!this.callbacks[event]) return;
        this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback);
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }
}

const chatSocket = new WebSocketService();
const notificationSocket = new WebSocketService();

export { chatSocket, notificationSocket };
