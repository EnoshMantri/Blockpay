/**
 * @module wsServer
 * @description WebSocket server for real-time remittance stage updates
 */
const WebSocket = require('ws');

let wss;

function initWS(server) {
  wss = new WebSocket.Server({ server, path: '/ws' });
  
  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    
    // Optional: client can send { action: 'subscribe', remittanceId: '...' }
    // For now, we broadcast to all connected dashboard clients
  });

  // Keep-alive heartbeat
  const interval = setInterval(() => {
    wss.clients.forEach(ws => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));
  
  console.log(`[WebSocket] Attached to /ws`);
  return wss;
}

function broadcast(event) {
  if (!wss) return;
  const payload = JSON.stringify(event);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

module.exports = { initWS, broadcast };
