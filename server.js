const WebSocket = require('ws');

const port = 5000;
let globalObject = "";
const wss = new WebSocket.Server({
    port: port
});

wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(obj) {
        const stringifiedObj = JSON.parse(obj.toString('utf-8'));
        wss.clients.forEach(function each(client) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(stringifiedObj.data).toString());
            }
        })
    })
})


console.log((new Date()) + " Server is listening on port " + port);