const WebSocket = require("ws");
const { loadConfig } = require("./config-loader");

async function startServer() {
    const config = await loadConfig();
    const port = config.port || 8080;
    const replyMessage = config.replyMessage || "默认回复内容";

    const wss = new WebSocket.Server({ port });
    console.log(`WS server running on port ${port}`);

    wss.on("connection", (ws) => {
        console.log("Client connected");
        ws.send(replyMessage);  // 固定回复，从 AppConfig 获取
        ws.send(`You have connected to server on port ${port}`);
        ws.on("message", (msg) => {
            console.log("Received from client:", msg.toString());
            const reply = "You said: "+msg.toString();
            ws.send(reply);
        });
    });
}

startServer().catch((err) => {
    console.error("Failed to start WS server:", err);
});
