const express = require("express");
const fs = require("fs");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const PASSWORD = "visiemsEVHUB";

app.post("/api/save", (req, res) => {
  const { data } = req.body;
  if (!data) {
    return res.status(400).send("Data is required");
  }

  fs.appendFile("buyers.txt", data + "\n", err => {
    if (err) {
      console.error("❌ Failed to write to buyers.txt:", err);
      return res.status(500).send("Failed to save data");
    }

    console.log("✅ Saved to buyers.txt:", data);
    res.sendStatus(200);
  });
});

app.get("/buyers.txt", (req, res) => {
  const password = req.query.password;
  if (password !== PASSWORD) {
    return res.status(403).send("Forbidden: Invalid password");
  }

  const filePath = path.join(__dirname, "buyers.txt");
  if (!fs.existsSync(filePath)) {
    return res.status(404).send("buyers.txt not found");
  }

  res.sendFile(filePath);
});

// ✅ POST: wallet connect log į WalletCalc.txt
app.post("/log-wallet-connect", (req, res) => {
  const date = new Date().toISOString();
  const logLine = `Wallet connect at: ${date}\n`;

  fs.appendFileSync("WalletCalc.txt", logLine);
  console.log("✅ Logged to WalletCalc.txt:", logLine.trim());

  res.sendStatus(200);
});

// ✅ GET: atsisiųsti WalletCalc.txt failą
app.get("/download-wallet-log", (req, res) => {
  const filePath = path.join(__dirname, "WalletCalc.txt");

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("No WalletCalc.txt log found.");
  }

  res.download(filePath);
});

// (likusi tavo logika)
app.post("/api/address", (req, res) => {
  const { address } = req.body;
  if (!address) {
    return res.status(400).send("Address is required");
  }

  fs.appendFile("wallets.txt", address + "\n", err => {
    if (err) {
      console.error("❌ Failed to write to wallets.txt:", err);
      return res.status(500).send("Failed to save address");
    }

    console.log("✅ Saved address:", address);
    res.sendStatus(200);
  });
});

// Botų blokavimas
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

// Paleidimas
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
