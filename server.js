const express = require("express");
const fs = require("fs");
const cors = require("cors");
const path = require("path");

const app = express();
const walletLogPath = path.join(__dirname, "WalletCalc.txt");

if (!fs.existsSync(walletLogPath)) {
  fs.writeFileSync(walletLogPath, "", "utf8");
  console.log("📁 WalletCalc.txt was created automatically.");
}

app.use(cors());
app.use(express.json());
app.use(express.static("public"));



// === BUYERS ===
app.post("/api/save", (req, res) => {
  const { data } = req.body;
  if (!data) return res.status(400).send("Data is required");

  fs.appendFile("buyers.txt", data + "\n", err => {
    if (err) return res.status(500).send("Failed to save data");
    console.log("✅ Saved to buyers.txt:", data);
    res.sendStatus(200);
  });
});

app.get("/buyers.txt", (req, res) => {
  const filePath = path.join(__dirname, "buyers.txt");
  if (!fs.existsSync(filePath)) return res.status(404).send("buyers.txt not found");

  res.sendFile(filePath);
});


  const filePath = path.join(__dirname, "buyers.txt");
  if (!fs.existsSync(filePath)) return res.status(404).send("buyers.txt not found");

  res.sendFile(filePath);
});

// === WALLET CONNECT logging ===
app.post("/log-wallet-connect", (req, res) => {
  const date = new Date().toISOString();
  const logLine = `Wallet connect at: ${date}\n`;

  fs.appendFileSync("WalletCalc.txt", logLine);
  console.log("✅ Logged to WalletCalc.txt:", logLine.trim());
  res.sendStatus(200);
});

app.get("/download-wallet-log", (req, res) => {
  const filePath = path.join(__dirname, "WalletCalc.txt");
  if (!fs.existsSync(filePath)) return res.status(404).send("WalletCalc.txt not found");

  res.download(filePath);
});

app.get("/wallet-connect-stats", (req, res) => {
  const filePath = path.join(__dirname, "WalletCalc.txt");
  if (!fs.existsSync(filePath)) return res.json({ totalConnects: 0, byDate: {} });

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.trim().split("\n").filter(line => line.includes("Wallet connect at:"));
  const byDate = {};

  lines.forEach(line => {
    const date = line.split("Wallet connect at: ")[1].split("T")[0];
    byDate[date] = (byDate[date] || 0) + 1;
  });

  res.json({ totalConnects: lines.length, byDate });
});

// === WALLET ADDRESS logging ===
app.post("/api/address", (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).send("Address is required");

  fs.appendFile("wallets.txt", address + "\n", err => {
    if (err) return res.status(500).send("Failed to save address");
    console.log("✅ Saved address:", address);
    res.sendStatus(200);
  });
});

// === BLOCK BOTS ===
app.use((req, res, next) => {
  const blockedPaths = [
    "/wp-admin/setup-config.php",
    "/wordpress/wp-admin/setup-config.php",
    "/.env",
    "/config.php"
  ];

  if (blockedPaths.includes(req.path)) {
    console.log(`Blocked bot attempt on: ${req.path}`);
    return res.status(403).send("Forbidden");
  }

  next();
});
app.get("/test", (req, res) => {
  res.send("Test OK");
});

// === START SERVER ===
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
