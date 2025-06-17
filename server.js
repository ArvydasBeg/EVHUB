const express = require("express");
const fs = require("fs");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(
  cors({
    origin: ["https://evhub.space", "https://www.evhub.space"],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json());

app.use(express.static("public"));

// WALLET-BASED AIRDROP REFERRAL SYSTEM
const WALLET_REFERRAL_FILE = "walletAirdropReferrals.json";

function readWalletReferrals() {
  if (!fs.existsSync(WALLET_REFERRAL_FILE)) return {};
  return JSON.parse(fs.readFileSync(WALLET_REFERRAL_FILE, "utf8"));
}
function writeWalletReferrals(data) {
  fs.writeFileSync(WALLET_REFERRAL_FILE, JSON.stringify(data, null, 2));
}

app.post("/api/airdrop/register-wallet", (req, res) => {
  const { wallet } = req.body;
  if (!wallet) return res.status(400).json({ error: "Wallet missing" });
  const address = wallet.toLowerCase();
  const data = readWalletReferrals();

  if (data[address]) {
    return res.json({ code: data[address].code });
  }
  let code;
  let usedCodes = Object.values(data).map((u) => u.code);
  do {
    code = "evhub" + Math.floor(10000 + Math.random() * 90000);
  } while (usedCodes.includes(code));

  data[address] = { code, invited: [], invitedBy: null };
  writeWalletReferrals(data);
  res.json({ code });
});

app.post("/api/airdrop/refer-wallet", (req, res) => {
  const { wallet, friendCode } = req.body;
  if (!wallet || !friendCode)
    return res.status(400).json({ error: "Missing data" });
  const address = wallet.toLowerCase();
  const data = readWalletReferrals();

  if (!data[address]) return res.status(400).json({ error: "Not registered" });
  if (data[address].invitedBy)
    return res.status(400).json({ error: "You already used a friend code" });

  if (data[address].code === friendCode)
    return res.status(400).json({ error: "Cannot refer yourself" });

  const friendWallet = Object.keys(data).find(
    (addr) => data[addr].code === friendCode
  );
  if (!friendWallet)
    return res.status(400).json({ error: "Friend code not found" });

  if (!data[friendWallet].invited.includes(address)) {
    data[friendWallet].invited.push(address);
    data[address].invitedBy = friendCode;
    writeWalletReferrals(data);
    return res.json({ ok: true });
  } else {
    return res.status(400).json({ error: "Already invited by this friend" });
  }
});

app.get("/api/airdrop/wallet-stats/:wallet", (req, res) => {
  const address = req.params.wallet.toLowerCase();
  const data = readWalletReferrals();
  if (!data[address])
    return res.json({ invited: 0, invitedBy: null, code: null, invites: [] });
  res.json({
    code: data[address].code,
    invited: data[address].invited.length,
    invitedBy: data[address].invitedBy || null,
    invites: data[address].invited,
    claimed: data[address].claimed || false,
    claimInfo: data[address].claimInfo || null,
    presaleAtClaim: data[address].presaleAtClaim || false,
    invitedAtClaim: data[address].invitedAtClaim || 0,
  });
});

// PALIEKAM VISUS TAVO KITUS ENDPOINTUS
// --- žemiau gali būti visi pirkimai, presale ir t.t. ---

// === POST /buy endpoint ===
app.post("/buy", (req, res) => {
  const { wallet, amount } = req.body;
  if (!wallet || !amount) {
    return res.status(400).send("Invalid input");
  }
  const entry = `${wallet.trim().toLowerCase()} | ${parseFloat(amount).toFixed(
    2
  )}\n`;
  fs.appendFile("buyers.txt", entry, (err) => {
    if (err) {
      console.error("❌ Failed to write to file:", err);
      return res.status(500).send("Server error writing to file");
    }
    console.log("✅ Buyer saved:", entry.trim());
    res.status(200).send("Saved");
  });
});

app.get("/buyers", (req, res) => {
  const filePath = path.join(__dirname, "buyers.txt");
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error("❌ Failed to read buyers file:", err);
      return res.status(500).send("Could not read buyers file");
    }
    const formatted = data
      .trim()
      .split("\n")
      .map((line) => `<div>${line}</div>`)
      .join("");
    res.send(formatted);
  });
});

const TOTAL_RAISED_FILE = "totalRaised.json";
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

app.get("/buyers.txt", (req, res) => {
  const password = req.query.key;
  if (password !== "ArvydasBeg21.") {
    return res.status(403).send("❌ Unauthorized");
  }
  res.sendFile(path.join(__dirname, "buyers.txt"));
});

app.get("/api/address", (req, res) => {
  res.json({ address: "0x2E41c430CA8aa18bF32e1AFA926252865dBc0374" });
});

app.get("/api/address", (req, res) => {
  res.json({ address: "0x2E41c430CA8aa18bF32e1AFA926252865dBc0374" });
});

app.get("/invite/:code", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// airdrop claim

app.post("/api/airdrop/claim", (req, res) => {
  const { wallet } = req.body;
  if (!wallet) return res.status(400).json({ error: "Wallet missing" });
  const address = wallet.toLowerCase();
  const data = readWalletReferrals();

  if (!data[address]) return res.status(400).json({ error: "Not registered" });

  let invitedAtClaim = data[address].invitedAtClaim || 0;
  const totalInvited = data[address].invited?.length || 0;
  const newInvites = totalInvited - invitedAtClaim;

  // Jeigu jau claiminta, neduodam dar kartą
  if (data[address].claimed && newInvites > 0) {
    // Tikrinam ar po claim buvo padarytas presale (jei tuo metu dar nebuvo)
    const buyersRaw = fs.readFileSync("buyers.txt", "utf8");
    const nowHasPresale = buyersRaw
      .split("\n")
      .map((line) => line.split("|")[0].trim().toLowerCase())
      .some((addr) => addr === address);

    let bonusPerInvite = 100; // default — nebuvo ir nepadarė presale

    if (data[address].presaleAtClaim) {
      bonusPerInvite = 1000; // jei turėjo presale iki claim
    } else if (!data[address].presaleAtClaim && nowHasPresale) {
      bonusPerInvite = 500; // jei padarė presale po claim
    }

    const extraBonus = newInvites * bonusPerInvite;

    data[address].claimInfo.friendReward += extraBonus;
    data[address].claimInfo.total += extraBonus;
    data[address].invitedAtClaim = totalInvited;

    console.log(
      `🎁 Auto-bonus: ${newInvites} invites × ${bonusPerInvite} = ${extraBonus} EVHUB`
    );
    writeWalletReferrals(data);
  }
  const buyersRaw = fs.readFileSync("buyers.txt", "utf8");
  console.log("📂 BUYERS CONTENT:\n", buyersRaw);
  // Presale statusas claim'o metu (ar yra pirkęs)
  let hasPresale = false;
  try {
    const buyersRaw = fs.readFileSync("buyers.txt", "utf8");
    hasPresale = buyersRaw
      .split("\n")
      .map((line) => line.split("|")[0].trim().toLowerCase())
      .some((addr) => addr === address);
  } catch (e) {}

  invitedAtClaim = data[address].invited.length;
  const claimDate = Date.now();

  // Apskaičiuojam kiek gaus claim metu
  let total = 50000;
  if (hasPresale) total += 25000;
  total += invitedAtClaim * (hasPresale ? 1000 : 100);

  data[address].claimed = true;
  data[address].claimDate = claimDate;
  data[address].presaleAtClaim = hasPresale;
  data[address].invitedAtClaim = invitedAtClaim;
  data[address].claimInfo = {
    base: 50000,
    presaleBonus: hasPresale ? 25000 : 0,
    friendReward: invitedAtClaim * (hasPresale ? 1000 : 100),
    total,
  };

  writeWalletReferrals(data);
  res.json({ claimed: true, claimInfo: data[address].claimInfo });
});

// servo paleidimas

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
