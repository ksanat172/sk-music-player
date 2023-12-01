const port = 5123;
const wordsJson = require('./words.json');
const io = require('socket.io')(port, {
    cors: {
        origin: ['http://localhost:3000', 'https://word-guess-sk.web.app']
    }
})

io.on('connection', (socket) => {
    socket.on('sendMessage', (message, roomID) => {
        socket.to(roomID).emit('receiveMessage', message)
    })

    socket.on('create-room', (playerObj, terminalMsg) => {
        const gameSettingsObj = { players: 2, drawTime: 80, rounds: 3, wordOptions: 3, hints: 2 }
        const roomID = generateRoomID();
        socket.join(roomID);
        socket.emit('getRoomID', roomID);
        const playersData = [{ ...playerObj, id: socket.id }];
        io.to(roomID).emit('sendPlayersData', playersData);
        const terminalMsgArray = [terminalMsg];
        io.to(roomID).emit('get-terminal-message', terminalMsgArray);
        io.to(roomID).emit('get-game-settings', gameSettingsObj)
        updateRoomData(roomID, { terminalMsgArray, playersData, gameSettingsObj, currentPhase: 'room-creation', guessSuccessCount: 0 });
    })

    socket.on('add-player', (playerObj, roomID) => {
        socket.join(roomID);
        const playersData = getRoomData(roomID)?.playersData || [];
        const gameSettingsObj = getRoomData(roomID)?.gameSettingsObj || {};
        const playerIndex = playersData.findIndex((player) => {
            return player.name === playerObj.name
        })
        if (playerIndex !== -1) {
            playersData[playerIndex] = { ...playersData[playerIndex], connectedStatus: true, id: socket.id }
        } else {
            playersData.push({ ...playerObj, id: socket.id })
        }

        if (roomID && getRoomData(roomID)) {
            getRoomData(roomID).playersData = playersData
            io.to(roomID).emit('sendPlayersData', playersData);
            io.to(roomID).emit('get-game-settings', gameSettingsObj)
            updateRoomData(roomID, { playersData })
        }
        socket.emit('set-view-from-server', getRoomData(roomID)?.view || 2);
    })

    socket.on('update-game-settings', (gameSettingsObj, roomID) => {
        io.to(roomID).emit('get-game-settings', gameSettingsObj)
        updateRoomData(roomID, { gameSettingsObj });
    })

    socket.on('start-game', async (roomID) => {
        const intervalFrequency = 1000;
        const wordSelectionTimeLimit = 20;
        const playersData = getRoomData(roomID)?.playersData || [];
        const gameSettingsObj = getRoomData(roomID)?.gameSettingsObj;
        const { drawTime, rounds, wordOptions, hints } = gameSettingsObj;
        io.to(roomID).emit('set-view-from-server', 3);
        updateRoomData(roomID, { view: 3, currentPhase: 'game-started' })
        for (let i = 0; i < rounds; i++) {
            await new Promise(async (resolve1) => {
                for (let j = 0; j < playersData.length; j++) {
                    getRoomData(roomID).resolve1 = () => null
                    getRoomData(roomID).resolve2 = () => null
                    const wordOptionsArray = [];
                    Array.from(Array(wordOptions)).forEach(() => {
                        wordOptionsArray.push(wordsJson[getRandomNumber(1, wordsJson.length)])
                    })
                    io.to(playersData[j].id).emit("receive-word-options", wordOptionsArray);
                    updateRoomData(roomID, { view: 3, currentPhase: 'word-selection', currentPlaying: playersData[j] })
                    io.to(roomID).emit('current-playing', playersData[j])
                    await new Promise((resolve2) => {
                        let count = 0;
                        getRoomData(roomID).interval1 = setInterval(() => {
                            if (count <= wordSelectionTimeLimit) {
                                io.to(roomID).emit('display-interval', { count: wordSelectionTimeLimit - count, totalRounds: rounds, currentRound: i })
                            } else {
                                clearInterval(getRoomData(roomID).interval1);
                                resolve2(true)
                            }
                            count++;
                        }, intervalFrequency);
                        getRoomData(roomID).resolve1 = resolve2;
                    })
                    updateRoomData(roomID, { view: 3, currentPhase: 'word-drawing' })
                    await new Promise((resolve3) => {
                        let count = 0;
                        getRoomData(roomID).interval2 = setInterval(() => {
                            if (count <= drawTime) {
                                io.to(roomID).emit('display-interval', { count: drawTime - count, totalRounds: rounds, currentRound: i })
                            } else {
                                clearInterval(getRoomData(roomID).interval2);
                                resolve3(true)
                            }
                            count++;
                        }, intervalFrequency);
                        getRoomData(roomID).resolve2 = resolve3;
                    })
                }
                resolve1(true);
            })
        }
    })

    socket.on('word-selected', (roomID, word) => {
        clearInterval(getRoomData(roomID).interval1);
        getRoomData(roomID).resolve1(true);
        updateRoomData(roomID, { guessWord: word });
        io.to(roomID).emit('set-guess-word', word)
    })

    socket.on('update-players', (playersData, roomID) => {
        io.to(roomID).emit('sendPlayersData', playersData);
        updateRoomData(roomID, { playersData });
    })

    socket.on('add-terminal-message', (terminalMsg, roomID) => {
        const terminalMsgArray = getRoomData(roomID)?.terminalMsgArray || []
        terminalMsgArray.push(terminalMsg);
        updateRoomData(roomID, { terminalMsgArray });
        io.to(roomID).emit('get-terminal-message', terminalMsgArray);
    })

    socket.on('disconnect', function () {
    })

    socket.on("disconnecting", () => {
        Array.from(socket.rooms).forEach((roomID) => {
            const room = getRoomData(roomID);
            if (room?.playersData) {
                const playersData = room.playersData;
                const disconnectedPlayerIndex = playersData.findIndex((player) => player.id === socket.id)
                playersData[disconnectedPlayerIndex].connectedStatus = false;
                io.to(roomID).emit('sendPlayersData', playersData);

                const terminalMsgArray = getRoomData(roomID)?.terminalMsgArray || []
                terminalMsgArray.push(`${playersData[disconnectedPlayerIndex].name} left the room`);
                updateRoomData(roomID, { terminalMsgArray });
                io.to(roomID).emit('get-terminal-message', terminalMsgArray);
                updateRoomData(roomID, { playersData, terminalMsgArray })
            }
        })
    });

    socket.on('stop-timer-2', (roomID) => {
        clearInterval(getRoomData(roomID).interval2);
        getRoomData(roomID).resolve2(true)
    })

    socket.on('set-view-from-client', (view) => {
        updateRoomData(roomID, { view });
        socket.to(roomID).emit('set-view-from-server', view);
    })

})

//console.log((new Date()) + " Server is listening on port " + port);

function generateRoomID() {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
    var result = '';
    for (var i = 6; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
    return result;
}

function getRoomData(roomID) {
    return io.sockets.adapter.rooms[roomID]
}

function updateRoomData(roomID, data) {
    io.sockets.adapter.rooms[roomID] = {
        ...getRoomData(roomID),
        ...data
    }
}

function getRandomNumber(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
