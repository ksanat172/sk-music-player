const port = 5123;
const io = require('socket.io')(port, {
    cors: {
        origin: ['http://localhost:3000', 'https://word-guess-sk.web.app']
    }
})

io.on('connection', (socket) => {

    socket.on('sendMessage', (message, roomID) => {
        console.log('here', { message, roomID })
        socket.to(roomID).emit('receiveMessage', message)
    })

    socket.on('create-room', () => {
        const roomID = generateRoomID();
        socket.join(roomID);
        socket.emit('getRoomID', roomID);
        io.sockets.adapter.rooms[roomID] = {
            playersData: []
        }
    })

    socket.on('join-room', (room) => {
        console.log('Joined', room)
        socket.join(room);
    })

    socket.on('add-player', (playerObj, roomID) => {
        const playersData = getRoomData(roomID)?.playersData || [];
        if (!playersData.find((player) => player.name.toLowerCase() === playerObj.name.toLowerCase())) {
            playersData.push(playerObj)
            if (roomID)
                getRoomData(roomID).playersData = playersData
        }
        io.emit('receivePlayersData', playersData);
        io.sockets.adapter.rooms[roomID] = {
            playersData
        }
        console.log(playersData)
    })

    socket.on('disconnect', function () {

    })

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