// const tokenPrice = 0.0002;
// const amountInput = document.getElementById("amount");
// const tokenOutput = document.getElementById("token-output");

// amountInput.addEventListener("input", () => {
//   const amount = parseFloat(amountInput.value);
//   if (!isNaN(amount)) {
//     const tokens = Math.floor(amount / tokenPrice);
//     tokenOutput.textContent = `You will receive: ${tokens.toLocaleString()} tokens`;
//   } else {
//     tokenOutput.textContent = "You will receive: 0 tokens";
//   }
// });

// const input = document.getElementById("amount-input");
// const receive = document.getElementById("token-receive");

// input.addEventListener("input", () => {
//   const value = parseFloat(input.value);
//   const rate = 0.0002;
//   if (!isNaN(value) && value > 0) {
//     receive.textContent = Math.floor(value / rate);
//   } else {
//     receive.textContent = 0;
//   }
// });
const tokenPrice = 0.0002;
const hardCap = 16000000;
let totalRaised = 0;

const amountInput = document.getElementById("amount");
const tokenOutput = document.getElementById("token-output");
const progressFill = document.getElementById("progress-fill");
const progressText = document.getElementById("progress-text");
const buyButton = document.getElementById("buy-button");

function updateProgress() {
  const percent = Math.min((totalRaised / hardCap) * 100, 100);
  progressFill.style.width = percent + "%";
  progressText.textContent = `${Math.floor(percent)}% completed`;
}

amountInput.addEventListener("input", () => {
  const amount = parseFloat(amountInput.value);
  if (!isNaN(amount)) {
    const tokens = Math.floor(amount / tokenPrice);
    tokenOutput.textContent = `${tokens.toLocaleString()} tokens`;
  } else {
    tokenOutput.textContent = "0 tokens";
  }
});

buyButton.addEventListener("click", () => {
  const amount = parseFloat(amountInput.value);
  if (!isNaN(amount) && amount > 0) {
    totalRaised += amount;
    updateProgress();
    amountInput.value = "";
    tokenOutput.textContent = "0 tokens";
  }
});

updateProgress();
