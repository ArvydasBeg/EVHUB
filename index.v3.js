// index.v2.js - Atnaujinta su recipientAddress įkėlimu

// Paleidžiam po DOM užkrovimo
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ JS loaded and DOM fully parsed");
  const tokenPrice = 0.0002;
  const hardCap = 1600000;
  const MINIMUM_USD = 1; // <- minimumas

  let totalRaised = 0;
  let currentAccount = null;
  let recipientAddress = "";

  const amountInput = document.getElementById("amount");
  const tokenOutput = document.getElementById("token-output");
  const currencySelect = document.getElementById("payment-token");
  const progressFill = document.getElementById("progress-fill");
  const progressText = document.getElementById("progress-text");
  const buyButton = document.getElementById("buy-button");
  const connectBtn = document.querySelector(".connect_wallet_button");
  const usdDisplay = document.getElementById("usd-equivalent");
  const liveTotal = document.getElementById("live-total");
  const liveRemaining = document.getElementById("live-remaining");
  const capNotice = document.getElementById("hardcap-reached");

  let exchangeRates = { ETH: 0, BNB: 0, USDC: 1 };

  connectBtn.addEventListener("click", (e) => {
    e.preventDefault();
    connectWallet();
  });

  // ✅ ATNAUJINTA: vienas aiškus try/catch be pasikartojimų
  buyButton.addEventListener("click", async () => {
    const amount = parseFloat(amountInput.value);
    const currency = currencySelect.value;

    if (!window.ethereum || !currentAccount) {
      return showToast("⚠️ Please connect wallet first");
    }

    if (isNaN(amount) || amount <= 0 || !exchangeRates[currency]) {
      return showToast("⚠️ Enter valid amount");
    }

    const usd = amount * exchangeRates[currency];
    if (usd < MINIMUM_USD) {
      return showToast(`⚠️ Minimum contribution is $${MINIMUM_USD}`);
    }

    if (!recipientAddress) {
      return showToast("❌ Payment address not loaded yet");
    }

    try {
      showToast("⏳ Waiting for confirmation...");
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      const tx = await signer.sendTransaction({
        to: recipientAddress,
        value: ethers.utils.parseEther(amount.toString()),
      });

      await tx.wait();
      showToast("✅ Transaction confirmed!");

      totalRaised += usd;
      updateProgress();
      amountInput.value = "";
      tokenOutput.textContent = "0 tokens";
      usdDisplay.textContent = "≈ $0.00";

      await fetch("https://evhub-production.up.railway.app/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: currentAccount,
          amount: usd.toFixed(2),
        }),
      });

      await fetch("https://evhub-production.up.railway.app/update-raised", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: usd }),
      });

      loadLeaderboard();
    } catch (err) {
      console.error("TX Error:", err);
      if (err.code === 4001) {
        showToast("❌ Transaction rejected by user");
      } else {
        showToast(
          "⚠️ Transaction failed. Please check MetaMask and try again."
        );
      }
    }
  });

  amountInput.addEventListener("input", updateTokenOutput);
  currencySelect.addEventListener("change", updateTokenOutput);

  async function connectWallet() {
    console.log("🟢 connectWallet called");
    if (!window.ethereum) return showToast("⚠️ MetaMask not found");

    const requiredChainId = "0x38"; // BSC Mainnet

    try {
      const currentChainId = await window.ethereum.request({
        method: "eth_chainId",
      });
      if (currentChainId !== requiredChainId) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: requiredChainId }],
          });
        } catch (err) {
          if (err.code === 4902) {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: requiredChainId,
                  chainName: "Binance Smart Chain",
                  rpcUrls: ["https://bsc-dataseed.binance.org"],
                  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
                  blockExplorerUrls: ["https://bscscan.com"],
                },
              ],
            });
          } else {
            return showToast("⚠️ Please switch to BSC Mainnet manually");
          }
        }
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      currentAccount = accounts[0];
      connectBtn.textContent = `${currentAccount.slice(
        0,
        6
      )}...${currentAccount.slice(-4)}`;
      connectBtn.style.borderColor = "#19c5ff";
      connectBtn.style.color = "#19c5ff";
      showToast("✅ Wallet connected");
    } catch (error) {
      console.error("Wallet error:", error);
      showToast("❌ Connection failed");
    }
  }

  async function fetchExchangeRates() {
    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,binancecoin,usd-coin&vs_currencies=usd"
      );
      const data = await res.json();
      exchangeRates.ETH = data.ethereum.usd;
      exchangeRates.BNB = data.binancecoin.usd;
      exchangeRates.USDC = data["usd-coin"].usd;
      updateTokenOutput();
    } catch (err) {
      console.error("Failed to fetch exchange rates:", err);
    }
  }

  async function loadRecipientAddress() {
    try {
      const res = await fetch(
        "https://evhub-production.up.railway.app/api/address"
      );
      const data = await res.json();
      recipientAddress = data.address;
      console.log("✅ Recipient address loaded:", recipientAddress);
    } catch (err) {
      console.error("❌ Failed to load recipient address:", err);
      showToast("❌ Could not load payment address");
    }
  }

  async function loadTotalRaised() {
    try {
      const res = await fetch("https://evhub-production.up.railway.app/raised");
      const data = await res.json();
      totalRaised = data.raised || 0;
      updateProgress();
      updateTokenOutput();
    } catch (err) {
      console.error("❌ Failed to fetch total raised:", err);
    }
  }

  function updateTokenOutput() {
    const amount = parseFloat(amountInput.value);
    const currency = currencySelect.value;

    if (!isNaN(amount) && exchangeRates[currency]) {
      const usd = amount * exchangeRates[currency];
      const tokens = Math.floor(usd / tokenPrice);
      tokenOutput.textContent = `${tokens.toLocaleString()} tokens`;
      usdDisplay.textContent = `≈ $${usd.toFixed(2)}`;
      const projectedTotal = totalRaised + usd;
      if (projectedTotal >= hardCap) {
        buyButton.disabled = true;
        buyButton.textContent = "Hardcap Reached";
        capNotice.style.display = "block";
      } else {
        buyButton.disabled = false;
        buyButton.textContent = "Buy EVHUB";
        capNotice.style.display = "none";
      }
    } else {
      tokenOutput.textContent = "0 tokens";
      usdDisplay.textContent = "≈ $0.00";
      buyButton.disabled = true;
    }
  }

  function updateProgress() {
    const percent = Math.min((totalRaised / hardCap) * 100, 100);
    const remaining = Math.max(hardCap - totalRaised, 0);

    progressFill.style.width = percent + "%";
    progressText.textContent = `${percent.toFixed(2)}% completed`;
    liveTotal.textContent = totalRaised.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    liveRemaining.textContent = remaining.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.remove("hidden");
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
      toast.classList.add("hidden");
    }, 3000);
  }

  async function loadLeaderboard() {
    try {
      const res = await fetch("https://evhub-production.up.railway.app/buyers");
      const text = await res.text();

      const rows = text.trim().split("\n");
      const list = document.getElementById("leaderboard-list");
      list.innerHTML = "";

      const parsed = rows
        .map((row) => {
          const [wallet, amount] = row.split(" | ");
          return {
            wallet: wallet.trim(),
            amount: parseFloat(amount),
          };
        })
        .reverse()
        .slice(0, 7);

      parsed.forEach((entry, index) => {
        const li = document.createElement("li");
        const short = `${entry.wallet.slice(0, 6)}...${entry.wallet.slice(-4)}`;
        li.innerHTML = `<div>${short}</div><span>$${entry.amount.toFixed(
          2
        )}</span>`;

        if (index === 0 && entry.wallet !== lastTopWallet) {
          li.classList.add("new-entry");
          setTimeout(() => li.classList.remove("new-entry"), 2000);
          lastTopWallet = entry.wallet;
        }

        list.appendChild(li);
      });
    } catch (err) {
      console.error("❌ Failed to load leaderboard:", err);
    }
  }

  fetchExchangeRates();
  loadRecipientAddress();
  loadTotalRaised();
  loadLeaderboard();
  setInterval(loadLeaderboard, 10000);
});
