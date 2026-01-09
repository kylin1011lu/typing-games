const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// ============ 内存数据存储 ============
const rooms = new Map();        // 存储所有房间 {roomId: roomData}
const players = new Map();      // 存储所有在线玩家 {socketId: playerData}

// ============ 单词库 ============
const wordBank = {
    easy: ['cat', 'dog', 'sun', 'run', 'fun', 'hat', 'pen', 'cup', 'fox', 'box', 'car', 'eye', 'red', 'day', 'boy'],
    medium: ['apple', 'happy', 'water', 'hello', 'world', 'house', 'mouse', 'bread', 'cloud', 'tiger', 'green', 'smile', 'table', 'phone', 'music'],
    hard: ['computer', 'rainbow', 'elephant', 'butterfly', 'mountain', 'sunshine', 'playground', 'wonderful', 'keyboard', 'adventure', 'chocolate', 'basketball', 'library', 'umbrella', 'vegetable']
};

// ============ 工具函数 ============

// 生成6位房间号
function generateRoomId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let roomId = '';
    for (let i = 0; i < 6; i++) {
        roomId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // 确保房间号唯一
    if (rooms.has(roomId)) {
        return generateRoomId();
    }
    return roomId;
}

// 生成单词列表
function generateWords(difficulty, count) {
    const words = [];
    const bank = wordBank[difficulty] || wordBank.medium;

    for (let i = 0; i < count; i++) {
        words.push(bank[Math.floor(Math.random() * bank.length)]);
    }

    return words;
}

// 清理房间数据，移除不可序列化的字段
function cleanRoomData(room) {
    return {
        roomId: room.roomId,
        roomName: room.roomName,
        hostId: room.hostId,
        hostName: room.hostName,
        players: room.players,
        maxPlayers: room.maxPlayers,
        difficulty: room.difficulty,
        status: room.status,
        createdAt: room.createdAt,
        expiresAt: room.expiresAt
        // 故意不包含 gameState（包含不可序列化的定时器）
    };
}

// 广播房间列表更新
function broadcastRoomList() {
    const allRooms = Array.from(rooms.values())
        .map(room => ({
            roomId: room.roomId,
            roomName: room.roomName,
            hostName: room.hostName,
            playerCount: room.players.length,
            maxPlayers: room.maxPlayers,
            difficulty: room.difficulty,
            createdAt: room.createdAt,
            status: room.status,  // 包含房间状态
            canJoin: room.status === 'waiting'  // 是否可以加入
        }));

    io.emit('ROOM_LIST_UPDATE', { rooms: allRooms });
}

// 计算排名
function calculateRankings(room) {
    const rankings = room.players.map(player => {
        const progress = room.gameState.playerProgress[player.playerId];
        return {
            playerId: player.playerId,
            nickname: player.nickname,
            completedWords: progress.completedWords,
            progress: (progress.completedWords / room.words.length) * 100
        };
    }).sort((a, b) => b.completedWords - a.completedWords);

    // 添加排名
    rankings.forEach((player, index) => {
        player.rank = index + 1;
    });

    return rankings;
}

// ============ 房间清理任务 ============
// 每5分钟清理过期房间
setInterval(() => {
    const now = Date.now();
    const expiredRooms = [];

    rooms.forEach((room, roomId) => {
        if (now > room.expiresAt) {
            // 通知房间内所有玩家
            io.to(roomId).emit('ROOM_EXPIRED', {
                message: '房间已过期（超过1小时），将自动关闭'
            });
            expiredRooms.push(roomId);
        }
    });

    // 删除过期房间
    expiredRooms.forEach(roomId => {
        rooms.delete(roomId);
        console.log(`🗑️  房间 ${roomId} 已过期删除`);
    });

    if (expiredRooms.length > 0) {
        broadcastRoomList();
    }
}, 5 * 60 * 1000); // 每5分钟

// ============ Socket.io 事件处理 ============
io.on('connection', (socket) => {
    const playerId = socket.id; // 使用socket.id作为玩家ID
    console.log('✅ 玩家连接:', playerId);

    // 添加到在线玩家列表
    players.set(playerId, {
        playerId,
        nickname: '',
        roomId: null,
        connectedAt: Date.now()
    });

    // 1. 获取房间列表
    socket.on('GET_ROOM_LIST', () => {
        broadcastRoomList();
    });

    // 2. 创建房间
    socket.on('CREATE_ROOM', (data) => {
        try {
            const roomId = generateRoomId();
            const now = Date.now();

            const room = {
                roomId,
                roomName: data.roomName || `${data.nickname}的房间`,
                hostId: playerId,
                hostName: data.nickname,
                players: [{
                    playerId,
                    nickname: data.nickname,
                    ready: true,
                    isHost: true,
                    laneIndex: 0
                }],
                maxPlayers: data.maxPlayers || 4,
                difficulty: data.difficulty || 'medium',
                status: 'waiting',
                words: [],
                gameState: {
                    startTime: null,
                    playerProgress: {}
                },
                createdAt: now,
                expiresAt: now + (60 * 60 * 1000) // 1小时后过期
            };

            rooms.set(roomId, room);
            socket.join(roomId);

            // 更新玩家信息
            const player = players.get(playerId);
            player.nickname = data.nickname;
            player.roomId = roomId;

            socket.emit('ROOM_CREATED', {
                success: true,
                roomId,
                room: cleanRoomData(room)
            });

            broadcastRoomList();
            console.log(`🏠 房间创建: ${roomId} by ${data.nickname}`);
        } catch (error) {
            socket.emit('ERROR', {
                code: 'CREATE_ROOM_FAILED',
                message: error.message
            });
        }
    });

    // 3. 加入房间
    socket.on('JOIN_ROOM', (data) => {
        try {
            const room = rooms.get(data.roomId);

            if (!room) {
                throw new Error('房间不存在');
            }

            if (room.status !== 'waiting') {
                throw new Error('游戏已开始');
            }

            // 检查是否是同一个昵称的玩家（可能是重新连接）
            const existingPlayer = room.players.find(p => p.nickname === data.nickname);

            if (existingPlayer) {
                // 更新玩家的 socket ID（重新连接的情况）
                console.log(`🔄 玩家 ${data.nickname} 重新连接房间 ${data.roomId}`);
                console.log(`   旧ID: ${existingPlayer.playerId}, 新ID: ${playerId}`);
                console.log(`   是否房主: ${existingPlayer.isHost}`);
                existingPlayer.playerId = playerId;

                // 如果是房主重新连接，更新房主ID
                if (existingPlayer.isHost) {
                    const oldHostId = room.hostId;
                    room.hostId = playerId;
                    console.log(`👑 房主ID已更新: ${oldHostId} -> ${playerId}`);
                }

                socket.join(data.roomId);

                // 更新玩家信息
                const player = players.get(playerId);
                player.nickname = data.nickname;
                player.roomId = data.roomId;

                // 通知房间内所有人（房间信息更新）
                io.to(data.roomId).emit('PLAYER_JOINED', {
                    player: {
                        playerId,
                        nickname: data.nickname
                    },
                    room: cleanRoomData(room)
                });

                console.log(`✅ 玩家 ${data.nickname} 已更新连接`);
            } else {
                // 新玩家加入
                if (room.players.length >= room.maxPlayers) {
                    throw new Error('房间已满');
                }

                // 添加玩家到房间
                room.players.push({
                    playerId,
                    nickname: data.nickname,
                    ready: false,
                    isHost: false,
                    laneIndex: room.players.length
                });

                socket.join(data.roomId);

                // 更新玩家信息
                const player = players.get(playerId);
                player.nickname = data.nickname;
                player.roomId = data.roomId;

                // 通知房间内所有人
                io.to(data.roomId).emit('PLAYER_JOINED', {
                    player: {
                        playerId,
                        nickname: data.nickname
                    },
                    room: cleanRoomData(room)
                });

                console.log(`👤 玩家 ${data.nickname} 加入房间 ${data.roomId}`);
            }

            broadcastRoomList();
        } catch (error) {
            socket.emit('ERROR', {
                code: 'JOIN_ROOM_FAILED',
                message: error.message
            });
        }
    });

    // 4. 准备/取消准备
    socket.on('TOGGLE_READY', (data) => {
        try {
            const room = rooms.get(data.roomId);
            if (!room) throw new Error('房间不存在');

            const player = room.players.find(p => p.playerId === playerId);
            if (player && !player.isHost) {
                player.ready = !player.ready;

                io.to(data.roomId).emit('PLAYER_READY_CHANGED', {
                    playerId,
                    ready: player.ready,
                    room: cleanRoomData(room)
                });

                console.log(`✋ 玩家 ${player.nickname} ${player.ready ? '准备' : '取消准备'}`);
            }
        } catch (error) {
            socket.emit('ERROR', {
                code: 'TOGGLE_READY_FAILED',
                message: error.message
            });
        }
    });

    // 5. 开始游戏（房主）
    socket.on('START_GAME', async (data) => {
        try {
            const room = rooms.get(data.roomId);

            // 验证是否为房主
            if (room.hostId !== playerId) {
                throw new Error('只有房主可以开始游戏');
            }

            // 检查所有玩家是否准备
            const allReady = room.players
                .filter(p => !p.isHost)
                .every(p => p.ready);

            if (!allReady && room.players.length > 1) {
                throw new Error('还有玩家未准备');
            }

            // 3秒倒计时
            for (let i = 3; i > 0; i--) {
                io.to(data.roomId).emit('GAME_COUNTDOWN', { countdown: i });
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // 发送 GO!
            io.to(data.roomId).emit('GAME_COUNTDOWN', { countdown: 0 });
            await new Promise(resolve => setTimeout(resolve, 800));

            // 生成单词列表
            const words = generateWords(room.difficulty, 20);
            const startTime = Date.now();

            // 根据难度设置游戏时间限制
            const timeLimits = {
                easy: 5 * 60 * 1000,      // 5分钟
                medium: 10 * 60 * 1000,   // 10分钟
                hard: 15 * 60 * 1000      // 15分钟
            };
            const timeLimit = timeLimits[room.difficulty] || 10 * 60 * 1000;

            room.status = 'playing';
            room.words = words;
            room.gameState.startTime = startTime;
            room.gameState.timeLimit = timeLimit;

            // 初始化每个玩家的进度
            room.players.forEach(player => {
                room.gameState.playerProgress[player.playerId] = {
                    completedWords: 0,
                    correctCount: 0,
                    wrongCount: 0,
                    currentWordIndex: 0,
                    finishTime: null,
                    rank: 0
                };
            });

            io.to(data.roomId).emit('GAME_START', {
                words,
                startTime,
                room: cleanRoomData(room),
                timeLimit  // 发送时间限制给前端
            });

            // 设置游戏超时
            const gameTimeout = setTimeout(() => {
                if (room.status !== 'playing') return;

                console.log(`⏰ 房间 ${data.roomId} 游戏时间到达，自动结束游戏`);

                // 为所有未完成的非离线玩家标记为完成
                room.players.forEach(player => {
                    if (!player.isOffline && !room.gameState.playerProgress[player.playerId].finishTime) {
                        room.gameState.playerProgress[player.playerId].finishTime = Date.now();
                        room.gameState.playerProgress[player.playerId].stats = {
                            totalTime: timeLimit,
                            correctCount: 0,
                            wrongCount: 0,
                            accuracy: 0,
                            wpm: 0
                        };
                    }
                });

                handleGameEnd(room, data.roomId, io);
            }, timeLimit);

            // 保存超时ID以便后续取消
            room.gameState.gameTimeout = gameTimeout;

            broadcastRoomList();
            console.log(`🚀 游戏开始: 房间 ${data.roomId}, 难度: ${room.difficulty}, 时间限制: ${timeLimit / 60000}分钟`);
        } catch (error) {
            socket.emit('ERROR', {
                code: 'START_GAME_FAILED',
                message: error.message
            });
        }
    });

    // 6. 更新游戏进度
    socket.on('UPDATE_PROGRESS', (data) => {
        try {
            const room = rooms.get(data.roomId);
            if (!room || room.status !== 'playing') return;

            // 广播进度更新
            io.to(data.roomId).emit('PROGRESS_UPDATE', {
                playerId,
                progress: data.progress
            });

            console.log(`📊 玩家 ${playerId} 进度: ${data.progress}%`);
        } catch (error) {
            console.error('更新进度失败:', error);
        }
    });

    // 7. 完成游戏
    socket.on('FINISH_GAME', (data) => {
        try {
            const room = rooms.get(data.roomId);
            if (!room) return;

            const finishTime = Date.now();
            const startTime = room.gameState.startTime;
            const totalTime = finishTime - startTime;

            // 计算统计数据
            const stats = {
                totalTime,
                correctCount: data.correctCount,
                wrongCount: data.wrongCount,
                accuracy: Math.round((data.correctCount / (data.correctCount + data.wrongCount)) * 100),
                wpm: Math.round((data.correctCount / (totalTime / 1000)) * 60)
            };

            // 记录完成信息
            room.gameState.playerProgress[playerId].finishTime = finishTime;
            room.gameState.playerProgress[playerId].stats = stats;

            // 计算排名
            const finishedPlayers = Object.entries(room.gameState.playerProgress)
                .filter(([_, p]) => p.finishTime)
                .sort((a, b) => a[1].finishTime - b[1].finishTime);

            const rank = finishedPlayers.length;
            room.gameState.playerProgress[playerId].rank = rank;

            // 通知该玩家
            socket.emit('PLAYER_FINISHED', {
                rank,
                stats
            });

            // 广播给房间内所有人
            const player = room.players.find(p => p.playerId === playerId);
            io.to(data.roomId).emit('PLAYER_FINISHED_BROADCAST', {
                playerId,
                nickname: player.nickname,
                rank,
                stats
            });

            // 检查是否所有非离线玩家都完成了
            const nonOfflinePlayers = room.players.filter(p => !p.isOffline);
            const allNonOfflineFinished = nonOfflinePlayers.length > 0 && nonOfflinePlayers.every(p => {
                const progress = room.gameState.playerProgress[p.playerId];
                return progress && progress.finishTime !== null;
            });

            if (allNonOfflineFinished) {
                handleGameEnd(room, data.roomId, io);
            }
        } catch (error) {
            console.error('完成游戏失败:', error);
        }
    });

    // 8. 离开房间
    socket.on('LEAVE_ROOM', (data) => {
        handlePlayerLeave(playerId, data.roomId);
    });

    // 9. 心跳检测
    socket.on('HEARTBEAT', () => {
        socket.emit('HEARTBEAT_ACK', { serverTime: Date.now() });
    });

    // 10. 断开连接
    socket.on('disconnect', () => {
        console.log('❌ 玩家断开:', playerId);
        const player = players.get(playerId);
        if (player && player.roomId) {
            handlePlayerLeave(playerId, player.roomId);
        }
        players.delete(playerId);
    });
});

// 处理游戏结束逻辑
function handleGameEnd(room, roomId, io) {
    // 取消游戏超时定时器
    if (room.gameState.gameTimeout) {
        clearTimeout(room.gameState.gameTimeout);
        room.gameState.gameTimeout = null;
    }

    // 生成最终结果
    const results = room.players.map(player => {
        const progress = room.gameState.playerProgress[player.playerId];
        if (!progress || !progress.stats) return null;

        return {
            playerId: player.playerId,
            nickname: player.nickname,
            isOffline: player.isOffline || false,
            completionTime: progress.stats.totalTime / 1000,
            wpm: progress.stats.wpm,
            accuracy: progress.stats.accuracy,
            progress: progress.progress || 100,
            rank: progress.rank || 0
        };
    }).filter(r => r !== null).sort((a, b) => {
        if (a.isOffline && !b.isOffline) return 1;
        if (!a.isOffline && b.isOffline) return -1;
        return a.rank - b.rank;
    });

    io.to(roomId).emit('GAME_OVER', { rankings: results });
    console.log(`🏁 游戏结束: 房间 ${roomId}`, results);

    // 5秒后删除房间
    setTimeout(() => {
        rooms.delete(roomId);
        console.log(`🗑️  房间 ${roomId} 已销毁（游戏结束）`);
        broadcastRoomList();
    }, 5000);
}

// 处理玩家离开
function handlePlayerLeave(playerId, roomId) {
    try {
        const room = rooms.get(roomId);
        if (!room) return;

        const player = room.players.find(p => p.playerId === playerId);
        const playerNickname = player ? player.nickname : '未知玩家';
        const wasHost = room.hostId === playerId;

        // 如果游戏进行中，标记玩家为离线而不是删除
        if (room.status === 'playing' && player) {
            player.isOffline = true;
            console.log(`🔌 玩家 ${playerNickname} 在游戏中离线 (房间 ${roomId})`);

            // 广播玩家离线事件
            io.to(roomId).emit('PLAYER_OFFLINE', {
                playerId,
                nickname: playerNickname,
                room: cleanRoomData(room)
            });

            // 检查是否所有玩家都离线了
            const allOffline = room.players.every(p => p.isOffline);
            console.log(`📊 房间 ${roomId} 离线状态检查:`, {
                totalPlayers: room.players.length,
                offlinePlayers: room.players.filter(p => p.isOffline).length,
                allOffline: allOffline,
                players: room.players.map(p => ({ name: p.nickname, offline: p.isOffline }))
            });
            
            if (allOffline) {
                console.log(`🔌 房间 ${roomId} 所有玩家都已离线，删除房间`);
                rooms.delete(roomId);
                broadcastRoomList();
                return;
            }

            // 检查是否所有非离线玩家都完成了
            const nonOfflinePlayers = room.players.filter(p => !p.isOffline);
            if (nonOfflinePlayers.length > 0) {
                const allNonOfflineFinished = nonOfflinePlayers.every(p => {
                    const progress = room.gameState.playerProgress[p.playerId];
                    return progress && progress.finishTime !== null;
                });

                if (allNonOfflineFinished) {
                    console.log(`✅ 所有非离线玩家已完成，结束游戏`);
                    handleGameEnd(room, roomId, io);
                }
            }
            return;
        }

        // 游戏未进行时，正常删除玩家
        room.players = room.players.filter(p => p.playerId !== playerId);

        // 通知房间内其他人
        io.to(roomId).emit('PLAYER_LEFT', {
            playerId,
            nickname: playerNickname,
            room: cleanRoomData(room)
        });

        console.log(`👋 玩家 ${playerNickname} 离开房间 ${roomId}`);

        // 如果房主离开
        if (wasHost) {
            if (room.players.length > 0) {
                // 转让给第一个非离线玩家，或第一个玩家
                let newHost = room.players.find(p => !p.isOffline) || room.players[0];
                newHost.isHost = true;
                newHost.ready = true;
                room.hostId = newHost.playerId;
                room.hostName = newHost.nickname;

                io.to(roomId).emit('HOST_TRANSFERRED', {
                    newHostId: newHost.playerId,
                    newHostName: newHost.nickname,
                    room: cleanRoomData(room)
                });

                console.log(`👑 房主转让: ${newHost.nickname}`);
            } else {
                // 立即删除旧房间
                rooms.delete(roomId);
                console.log(`🗑️  房间 ${roomId} 已删除（无玩家）`);
            }
        }

        // 如果房间空了且不是刚创建的
        if (room.players && room.players.length === 0) {
            const roomAge = Date.now() - room.createdAt;
            if (roomAge >= 10000) {
                rooms.delete(roomId);
                console.log(`🗑️  房间 ${roomId} 已删除（无玩家）`);
            }
        }

        broadcastRoomList();
    } catch (error) {
        console.error('处理玩家离开失败:', error);
    }
}

// HTTP 健康检查
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: Date.now(),
        rooms: rooms.size,
        players: players.size
    });
});

// 启动服务器
const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
    console.log(`🚀 打字赛车服务器运行在端口 ${PORT}`);
});
