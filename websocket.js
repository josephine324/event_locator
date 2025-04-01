let wss;

function setWebSocketServer(server) {
  const WebSocket = require('ws');
  wss = new WebSocket.Server({ server });
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    ws.on('message', (message) => {
      console.log('Received from client:', message);
    });
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });
}

function broadcast(data) {
  if (!wss) {
    throw new Error('WebSocket server not initialized');
  }
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

module.exports = { setWebSocketServer, broadcast };