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
            const data = JSON.parse(e.data);
            if (this.callbacks['message']) {
                this.callbacks['message'](data);
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
