const WebSocket = require('ws');

const port = 5000;
let concatStr = "";
const wss = new WebSocket.Server({
    port: port
});

wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(data) {
        concatStr += data;
        const stringifiedData = data.toString('utf-8')
        wss.clients.forEach(function each(client) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(stringifiedData);
            }
        })
    })


    ws.send(concatStr);

})


wss.on('close', () => {
    concatStr = ""
})

console.log((new Date()) + " Server is listening on port " + port);