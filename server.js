const port = 5123;
let globalObject = "";
const io = require('socket.io')(port, {
    cors: {
        origin: ['http://localhost:3000', 'https://word-guess-sk.web.app/']
    }
})

io.on('connection', (socket) => {
    console.log('joined')
    socket.on('message', function incoming(obj) {
        socket.broadcast.emit('message', obj)
    })
})

//console.log((new Date()) + " Server is listening on port " + port);