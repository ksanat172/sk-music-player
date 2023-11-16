const WebSocket = require('ws');

const port = 5000;

const wss = new WebSocket.Server({
    port: port
});

wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(data) {
        const stringifiedData = data.toString('utf-8')
        wss.clients.forEach(function each(client) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(stringifiedData);
            }
        })
    })
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send('Joined');
        }
    })
})

console.log((new Date()) + " Server is listening on port " + port);