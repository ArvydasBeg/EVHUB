const express = require("express");
const fs = require("fs");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const WALLET_LOG = "WalletCalc.txt";
const TOTAL_RAISED_FILE = "totalRaised.json";

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// === Wallet connect logging ===
app.post("/log-wallet-connect", (req, res) => {
  const date = new Date().toISOString();
  const logLine = `Wallet connect at: ${date}\n`;

  fs.appendFileSync(WALLET_LOG, logLine);
  console.log("✅ Wallet connect logged:", logLine.trim());

  res.sendStatus(200);
});

app.get("/wallet-connect-stats", (req, res) => {
  if (!fs.existsSync(WALLET_LOG)) return res.json({ totalConnects: 0, byDate: {} });

  const content = fs.readFileSync(WALLET_LOG, "utf8");
  const lines = content.trim().split("\n").filter(line => line.includes("Wallet connect at:"));
  const byDate = {};

  lines.forEach(line => {
    const date = line.split("Wallet connect at: ")[1].split("T")[0];
    byDate[date] = (byDate[date] || 0) + 1;
  });

  res.json({ totalConnects: lines.length, byDate });
});

app.get("/download-wallet-log", (req, res) => {
  const filePath = path.join(__dirname, WALLET_LOG);
  if (!fs.existsSync(filePath)) return res.status(404).send("Log file not found.");
  res.download(filePath);
});

// === POST /buy endpoint ===
app.post("/buy", (req, res) => {
  const { wallet, amount } = req.body;

  if (!wallet || !amount) return res.status(400).send("Invalid input");

  const entry = `${wallet} | ${amount}\n`;
  fs.appendFile("buyers.txt", entry, (err) => {
    if (err) {
      console.error("❌ Failed to write to file:", err);
      return res.status(500).send("Server error writing to file");
    }
    console.log("✅ Buyer saved:", entry.trim());
    res.status(200).send("Saved");
  });
});

// === GET /buyers
app.get("/buyers", (req, res) => {
  const filePath = path.join(__dirname, "buyers.txt");
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error("❌ Failed to read buyers file:", err);
      return res.status(500).send("Could not read buyers file");
    }
    res.send(data);
  });
});

// === GET /buyers.txt (be slaptažodžio)
app.get("/buyers.txt", (req, res) => {
  const filePath = path.join(__dirname, "buyers.txt");
  if (!fs.existsSync(filePath)) return res.status(404).send("buyers.txt not found");
  res.sendFile(filePath);
});

// === GET /raised
app.get("/raised", (req, res) => {
  try {
    if (!fs.existsSync(TOTAL_RAISED_FILE)) return res.json({ raised: 0 });

    const content = fs.readFileSync(TOTAL_RAISED_FILE, "utf8");
    const data = JSON.parse(content);
    res.json({ raised: data.total || 0 });
  } catch (e) {
    console.error("❌ Error reading totalRaised.json:", e);
    res.json({ raised: 0 });
  }
});

// === POST /update-raised
app.post("/update-raised", (req, res) => {
  const { amount } = req.body;
  if (!amount) return res.status(400).send("Missing amount");

  let current = 0;
  try {
    if (fs.existsSync(TOTAL_RAISED_FILE)) {
      const content = fs.readFileSync(TOTAL_RAISED_FILE, "utf8");
      current = JSON.parse(content).total || 0;
    }
  } catch (e) {
    console.error("❌ Error reading totalRaised.json:", e);
  }

  const updated = current + parseFloat(amount);
  fs.writeFileSync(TOTAL_RAISED_FILE, JSON.stringify({ total: updated }, null, 2));
  res.sendStatus(200);
});

// === /api/address (grąžina viešą adresą)
app.get("/api/address", (req, res) => {
  res.json({ address: "0x2E41c430CA8aa18bF32e1AFA926252865dBc0374" });
});

// === Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
