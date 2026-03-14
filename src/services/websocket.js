class WebSocketService {
    constructor() {
        this.socket = null;
        this.callbacks = {};
    }

    connect(url) {
        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
            console.log('WebSocket Connected');
        };

        this.socket.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                const eventType = data.type || 'message';
                
                // Dispatch specific event type
                if (this.callbacks[eventType]) {
                    this.callbacks[eventType](data);
                }
                
                // Also dispatch to a general 'message' listener if it exists
                if (eventType !== 'message' && this.callbacks['message']) {
                    this.callbacks['message'](data);
                }
            } catch (err) {
                console.error("Error parsing WebSocket message:", err);
            }
        };

        this.socket.onclose = () => {
            console.log('WebSocket Disconnected');
            // Reconnect logic could go here
        };
    }

    send(data) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
        }
    }

    on(event, callback) {
        this.callbacks[event] = callback;
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
        }
    }
}

const chatSocket = new WebSocketService();
const notificationSocket = new WebSocketService();

export { chatSocket, notificationSocket };
