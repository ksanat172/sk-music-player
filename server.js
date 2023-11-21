const port = 5123;
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
        const roomID = generateRoomID();
        socket.join(roomID);
        socket.emit('getRoomID', roomID);
        const playersData = [{ ...playerObj, id: socket.id }];
        io.to(roomID).emit('sendPlayersData', playersData);
        const terminalMsgArray = [terminalMsg];
        io.to(roomID).emit('get-terminal-message', terminalMsgArray);
        updateRoomData(roomID, { terminalMsgArray, playersData });
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

    socket.on('add-player', (playerObj, roomID) => {
        socket.join(roomID);
        const playersData = getRoomData(roomID)?.playersData || [];
        const playerIndex = playersData.findIndex((player) => {
            return player.name === playerObj.name
        })
        if (playerIndex !== -1) {
            playersData[playerIndex] = { ...playersData[playerIndex], connectedStatus: true, id: socket.id }
        } else {
            playersData.push({ ...playerObj, id: socket.id })
        }

        if (roomID)
            getRoomData(roomID).playersData = playersData

        io.to(roomID).emit('sendPlayersData', playersData);
        updateRoomData(roomID, { playersData })
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

    socket.on('start-timer', () => {
        console.log('started')
        let time = 0;
        let interval = setInterval(() => {
            if (time < 60) {
                io.emit('run-timer', time)
                console.log('running-timer', time)
            }
            else {
                clearInterval(interval);
            }

            time += 1;
        }, 1000)
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