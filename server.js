// bendravimas su railway

// === BACKEND: server.js ===

const express = require("express");
const fs = require("fs");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors()); // Leisti užklausas iš kitos kilmės (pvz., 127.0.0.1:5500)
app.use(express.json()); // Suprasti JSON body

// Serve static files (jei reikia)
app.use(express.static("public")); // jei turi /public folderį

// === POST /buy endpoint ===
app.post("/buy", (req, res) => {
  const { wallet, amount } = req.body;

  if (!wallet || !amount) {
    return res.status(400).send("Invalid input");
  }

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

// === GET /buyers (to read the log file) ===
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

// === Start server ===
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

//
// ===== total raised =======
const TOTAL_RAISED_FILE = "totalRaised.json";
// Grąžina dabartinę sumą
app.get("/raised", (req, res) => {
  try {
    if (!fs.existsSync(TOTAL_RAISED_FILE)) {
      return res.json({ raised: 0 });
    }
    const content = fs.readFileSync(TOTAL_RAISED_FILE, "utf8");
    const data = JSON.parse(content);
    res.json({ raised: data.total || 0 });
  } catch (e) {
    console.error("❌ Error reading totalRaised.json:", e);
    res.json({ raised: 0 });
  }
});

// Atnaujina sumą (kai pirkimas įvykdomas)
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
  fs.writeFileSync(
    TOTAL_RAISED_FILE,
    JSON.stringify({ total: updated }, null, 2)
  );
  res.sendStatus(200);
});

// txt failo siuntimas

app.get("/buyers.txt", (req, res) => {
  const password = req.query.key;

  if (password !== "ArvydasBeg21.") {
    return res.status(403).send("❌ Unauthorized");
  }

  res.sendFile(path.join(__dirname, "buyers.txt"));
});
