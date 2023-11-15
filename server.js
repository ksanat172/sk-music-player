const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const port = 5000;
const server = http.createServer(express);
const wss = new WebSocket.Server({ server })
wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(d) {
        const data = d.toString('utf-8')
        wss.clients.forEach(function each(client) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        })
    })
})

server.listen(port, function () {
    console.log(`Server is listening on ${port}!`)
})