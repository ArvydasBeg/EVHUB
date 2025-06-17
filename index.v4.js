// index.v2.js - Atnaujinta su recipientAddress įkėlimu

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ JS loaded and DOM fully parsed");
  const tokenPrice = 0.0002;
  const hardCap = 1600000;
  const MINIMUM_USD = 20; // <- minimumas
  const claimBtn = document.querySelector(".claim-btn");
  const API_URL = "https://evhub-production.up.railway.app";

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

  // Presale logic...
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

      if (currency === "BNB") {
        // Native BNB pavedimas
        const tx = await signer.sendTransaction({
          to: recipientAddress,
          value: ethers.utils.parseEther(amount.toString()),
        });
        await tx.wait();
      } else if (currency === "USDC") {
        // USDC (BEP-20) pavedimas
        const USDC_ADDRESS = "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d";
        const ERC20_ABI = [
          "function transfer(address to, uint256 value) public returns (bool)",
        ];
        const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
        // Dauguma BSC USDC turi 18 decimalų. Jei sumą rodo keistai – pabandyk pakeisti į 6.
        const decimals = 18;
        const amountInWei = ethers.utils.parseUnits(
          amount.toString(),
          decimals
        );
        const tx = await usdc.transfer(recipientAddress, amountInWei);
        await tx.wait();
      } else {
        return showToast("❌ Only BNB or USDC supported");
      }

      showToast("✅ Transaction confirmed!");

      totalRaised += usd;
      updateProgress();
      amountInput.value = "";
      tokenOutput.textContent = "0 tokens";
      usdDisplay.textContent = "≈ $0.00";

      if (!currentAccount || isNaN(usd)) {
        console.error("❌ Missing wallet or amount before /buy");
        return;
      }

      await fetch(`${API_URL}/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: currentAccount,
          amount: usd.toFixed(2),
        }),
      });

      await fetch(`${API_URL}/update-raised`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: usd }),
      });

      // loadLeaderboard();
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
    // console.log("🟢 connectWallet called");
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

      // AIRDROP: Connect wallet ir atvaizduok airdrop dashboard
      await airdropOnConnect(currentAccount);
      document.querySelector(".airdrop-dashboard").classList.add("expanded");
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
      const res = await fetch(`${API_URL}/api/address`);
      const data = await res.json();
      recipientAddress = data.address;
      // console.log("✅ Recipient address loaded:", recipientAddress);
    } catch (err) {
      console.error("❌ Failed to load recipient address:", err);
      showToast("❌ Could not load payment address");
    }
  }

  async function loadTotalRaised() {
    try {
      const res = await fetch(`${API_URL}/raised`);
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

  fetchExchangeRates();
  loadRecipientAddress();
  loadTotalRaised();

  // ========================
  // ==== AIRDROP ZONA ======
  // ========================

  // UI elementai
  const airdropCodeInput = document.getElementById("user-code");
  const airdropLinkInput = document.getElementById("invite-link");
  const friendCodeInput = document.getElementById("friend-code");
  const airdropSubmitBtn = document.querySelector(".submit-btn");
  const airdropDetails = document.querySelector(".details");
  const friendStatus = document.getElementById("friend-status");

  // Register wallet and get/generate code
  async function airdropOnConnect(wallet) {
    if (!wallet) return;
    // Užregistruoti ar gauti kodą
    const res = await fetch(`${API_URL}/api/airdrop/register-wallet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet }),
    });
    const data = await res.json();
    if (airdropCodeInput) airdropCodeInput.value = data.code;
    if (airdropLinkInput)
      airdropLinkInput.value = `https://evhub.space/invite/${data.code}`;
    // Autofill draugo kodą jei atėjai su /invite/ kodu
    const match = window.location.pathname.match(/^\/invite\/(evhub\d{5})/);
    if (match && friendCodeInput) friendCodeInput.value = match[1];
    await updateAirdropStats(wallet);
  }

  // Pakviestų žmonių atvaizdavimas
  async function updateAirdropStats(wallet) {
    if (!wallet) return;

    const res = await fetch(`${API_URL}/api/airdrop/wallet-stats/${wallet}`);
    const data = await res.json();

    // Jei jau buvo claiminta
    if (data.claimed && data.claimInfo) {
      // Jei yra naujų pakviestų draugų po claim
      const newInvites = data.invited - data.invitedAtClaim;
      if (newInvites > 0) {
        // console.log("⏳ Claiming extra bonus for new invites...");
        await fetch(`${API_URL}/api/airdrop/claim`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet }),
        });

        // Pakartotinai užkraunam atnaujintą info
        const recheck = await fetch(
          `${API_URL}/api/airdrop/wallet-stats/${wallet}`
        );
        Object.assign(data, await recheck.json());
      }

      // Atvaizduojam claim info
      airdropDetails.innerHTML = `
      <div>
        <b>You already claimed:</b><br>
        Base: <span>${data.claimInfo.base.toLocaleString()}</span> EVHUB<br>
        Presale bonus: <span>${data.claimInfo.presaleBonus.toLocaleString()}</span> EVHUB<br>
        Friend reward: <span>${data.claimInfo.friendReward.toLocaleString()}</span> EVHUB<br>
        <b>Total claimed: <span>${data.claimInfo.total.toLocaleString()} EVHUB</span></b>
      </div>
      <div>
        <b>You have invited: <span>${
          data.invitedAtClaim
        }</span> (auto claim)</b>
      </div>
      <div>
        <b>New invites after claim:</b> 
        <span>${data.invited - data.invitedAtClaim || 0}</span>
        <br>
        ${
          data.presaleAtClaim
            ? "Now you get +1,000 EVHUB per friend after claim"
            : "Now you get +100 EVHUB per friend (or +500 if do presale after claim)"
        }
      </div>
    `;
      if (claimBtn) claimBtn.disabled = true;
      return;
    }

    // Jei dar neclaimino – senoji logika
    let hasPresale = false;
    try {
      const buyersRes = await fetch(`${API_URL}/buyers`);
      const buyersText = await buyersRes.text();
      hasPresale = buyersText.toLowerCase().includes(wallet.toLowerCase());
    } catch (e) {}

    const invitedCount = data.invited || 0;
    let total = 50000;
    if (hasPresale) total += 25000;
    total += invitedCount * (hasPresale ? 1000 : 100);

    airdropDetails.innerHTML = `
    You will claim: <span class="claim-amount">50,000 EVHUB</span><br>
    <span class="presale-bonus">+25,000 with presale</span><br>
    Invite friends: <span>${
      hasPresale ? "1,000" : "100"
    } EVHUB per friend</span><br>
    Presale: <span class="yes">${hasPresale ? "YES" : "NO"}</span><br>
    You have invited: <span>${invitedCount}</span><br>
    <div class="total-get"><b>Total get: ${total.toLocaleString()} EVHUB</b></div>
  `;
  }

  // Draugo kodo submit eventas
  if (airdropSubmitBtn) {
    airdropSubmitBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!currentAccount) {
        await connectWallet();
        // connectWallet iškvies airdropOnConnect automatiškai
        return;
      }
      const friendCode = friendCodeInput.value.trim();
      if (!friendCode) {
        alert("Įvesk draugo kodą!");
        return;
      }
      const res = await fetch(`${API_URL}/api/airdrop/refer-wallet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: currentAccount, friendCode }),
      });
      let data = {};
      if (res.status !== 204) {
        data = await res.json();
      }

      if (res.ok) {
        showToast("✅ Friend added!");
        await updateAirdropStats(currentAccount);
        friendCodeInput.disabled = true;
        airdropSubmitBtn.disabled = true;
      } else {
        showToast("❌ " + (data.error || "Referral klaida."));
      }
    });
    if (claimBtn) {
      claimBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("Claim mygtukas paspaustas!");
        if (!currentAccount) {
          showToast("Please connect wallet first");
          return;
        }
        try {
          const res = await fetch(`${API_URL}/api/airdrop/claim`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ wallet: currentAccount.toLowerCase() }),
          });
          const data = await res.json();

          if (data.claimed || data.alreadyClaimed) {
            showToast("🎉 Claimed successfully!");
            await updateAirdropStats(currentAccount);
          } else {
            showToast("❌ Claim failed!");
          }
        } catch (err) {
          console.error("❌ Claim klaida:", err);
          showToast("❌ Server error. Try again later.");
        }
      });
    }
  }
});
console.log("🟢 Loading airdrop dashboard...");
// Copy funkcijos (likusios nuo seno)
function copyCode() {
  const codeInput = document.getElementById("user-code");
  codeInput.select();
  document.execCommand("copy");
}
function copyLink() {
  const linkInput = document.getElementById("invite-link");
  linkInput.select();
  document.execCommand("copy");
}
