
document.addEventListener("DOMContentLoaded", () => {
  const tokenPrice = 0.0002;
  const hardCap = 16000000;
  let totalRaised = 0;

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

  let currentAccount = null;
  let exchangeRates = {
    ETH: 0,
    BNB: 0,
    USDC: 1,
  };

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

  async function loadTotalRaised() {
    try {
      const res = await fetch("http://localhost:3000/raised");
      const data = await res.json();
      totalRaised = data.raised;
      updateProgress();
    } catch (err) {
      console.error("❌ Failed to load total raised:", err);
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

  async function connectWallet() {
    if (!window.ethereum) {
      showToast("⚠️ MetaMask not found");
      return;
    }

    const requiredChainId = "0x61"; // BSC Testnet

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
        } catch (switchError) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: requiredChainId,
                  chainName: "Binance Smart Chain Testnet",
                  rpcUrls: ["https://data-seed-prebsc-1-s1.binance.org:8545"],
                  nativeCurrency: {
                    name: "tBNB",
                    symbol: "tBNB",
                    decimals: 18,
                  },
                  blockExplorerUrls: ["https://testnet.bscscan.com"],
                },
              ],
            });
          } else {
            showToast("⚠️ Please switch to BSC Testnet");
            return;
          }
        }
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      currentAccount = accounts[0];
      const shortAddress = `${currentAccount.slice(0, 6)}...${currentAccount.slice(-4)}`;
      connectBtn.textContent = shortAddress;
      connectBtn.style.borderColor = "#19c5ff";
      connectBtn.style.color = "#19c5ff";
      showToast("✅ Wallet connected");
    } catch (error) {
      console.error("Wallet connection error:", error);
      showToast("❌ Connection failed");
    }
  }

  buyButton.addEventListener("click", async () => {
    const amount = parseFloat(amountInput.value);
    const currency = currencySelect.value;

    if (!window.ethereum || !currentAccount) {
      showToast("⚠️ Please connect wallet first");
      return;
    }

    if (isNaN(amount) || amount <= 0 || !exchangeRates[currency]) {
      showToast("⚠️ Enter valid amount");
      return;
    }

    try {
      showToast("⏳ Waiting for confirmation...");
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      const tx = await signer.sendTransaction({
        to: "0x2E41c430CA8aa18bF32e1AFA926252865dBc0374",
        value: ethers.utils.parseEther(amount.toString()),
      });

      const usd = amount * exchangeRates[currency];
      totalRaised += usd;
      updateProgress();
      amountInput.value = "";
      tokenOutput.textContent = "0 tokens";
      usdDisplay.textContent = "≈ $0.00";
      showToast("🎉 Purchase sent!");

      await fetch("http://localhost:3000/save-buyer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: currentAccount, amount: usd.toFixed(2) }),
      });

      await fetch("http://localhost:3000/update-raised", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: usd }),
      });

    } catch (err) {
      console.error("TX Error:", err.code, err.message);
      if (err.code === 4001) {
        showToast("❌ Transaction rejected");
      } else {
        showToast("⚠️ Transaction failed");
      }
    }
  });

  connectBtn.addEventListener("click", (e) => {
    e.preventDefault();
    connectWallet();
  });

  amountInput.addEventListener("input", updateTokenOutput);
  currencySelect.addEventListener("change", updateTokenOutput);

  fetchExchangeRates();
  loadTotalRaised();
  loadLeaderboard();
  setInterval(loadLeaderboard, 10000);
});

async function loadLeaderboard() {
  try {
    const res = await fetch("http://localhost:3000/buyers");
    const text = await res.text();

    const rows = text.trim().split("\n");
    const list = document.getElementById("leaderboard-list");
    list.innerHTML = "";

    rows
      .map((row) => {
        const [wallet, amount] = row.split(" | ");
        return {
          wallet: wallet.trim(),
          amount: parseFloat(amount),
        };
      })
      .reverse()
      .slice(0, 10)
      .forEach((entry) => {
        const li = document.createElement("li");
        const short = `${entry.wallet.slice(0, 6)}...${entry.wallet.slice(-4)}`;
        li.innerHTML = `<div>${short}</div><span>$${entry.amount.toFixed(2)}</span>`;
        list.appendChild(li);
      });
  } catch (err) {
    console.error("❌ Failed to load leaderboard:", err);
  }
}
