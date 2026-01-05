// Socket.io 客户端工具类
class GameClient {
    constructor(serverUrl) {
        this.serverUrl = serverUrl;
        this.socket = null;
        this.nickname = '';
    }

    connect() {
        this.socket = io(this.serverUrl);
        return this.socket;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }

    // 发送心跳
    sendHeartbeat() {
        if (this.socket && this.socket.connected) {
            this.socket.emit('HEARTBEAT');
        }
    }

    // 创建房间
    createRoom(data) {
        this.socket.emit('CREATE_ROOM', data);
    }

    // 加入房间
    joinRoom(roomId, nickname) {
        this.socket.emit('JOIN_ROOM', { roomId, nickname });
    }

    // 离开房间
    leaveRoom(roomId) {
        this.socket.emit('LEAVE_ROOM', { roomId });
    }

    // 切换准备状态
    toggleReady(roomId) {
        this.socket.emit('TOGGLE_READY', { roomId });
    }

    // 开始游戏
    startGame(roomId) {
        this.socket.emit('START_GAME', { roomId });
    }

    // 更新进度
    updateProgress(roomId, progress) {
        this.socket.emit('UPDATE_PROGRESS', { roomId, ...progress });
    }

    // 完成游戏
    finishGame(roomId, stats) {
        this.socket.emit('FINISH_GAME', { roomId, ...stats });
    }

    // 获取房间列表
    getRoomList() {
        this.socket.emit('GET_ROOM_LIST');
    }
}

// 导出（如果使用模块化）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameClient;
}
