const token = localStorage.getItem('token');
if (!token) {
  window.location.href = 'login.html';
}

const user = JSON.parse(localStorage.getItem('user') || '{}');
if (user.name) {
  document.getElementById('user-display-name').textContent = user.name;
}

let marketPrices = {};
let currentBalance = 10000.00;

// Tab Navigation Switching
const navItems = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');

navItems.forEach(item => {
  item.addEventListener('click', () => {
    navItems.forEach(i => i.classList.remove('active'));
    tabContents.forEach(t => t.classList.remove('active'));
    
    item.classList.add('active');
    const target = item.getAttribute('data-tab');
    document.getElementById(target)?.classList.add('active');
  });
});

// Logout
document.getElementById('logout-btn')?.addEventListener('click', () => {
  localStorage.clear();
  window.location.href = 'login.html';
});

// Deposit Methods Setup
const depositGateways = {
  btc: `<strong>Method:</strong> Bitcoin (BTC Network)<br>
        <strong>Wallet Address:</strong> <code style="color:#06b6d4">bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh</code><br>
        <small style="color:#f59e0b">Send only BTC to this wallet. Credited after 2 network confirmations.</small>`,
  usdt: `<strong>Method:</strong> Tether USDT (TRON TRC-20 Network)<br>
        <strong>Wallet Address:</strong> <code style="color:#06b6d4">TJY8b8p6Dq3WzYfUjK7hQoB21v6g8N5pLe</code><br>
        <small style="color:#f59e0b">Send only TRC-20 USDT. Instant automated processing.</small>`,
  bank: `<strong>Method:</strong> International Wire Transfer<br>
        <strong>Beneficiary Bank:</strong> Ultimax Global Clearing Bank<br>
        <strong>Account Name:</strong> Ultimax Custody Holding LLC<br>
        <strong>SWIFT / BIC:</strong> ULTXUS33XXX<br>
        <strong>Account Number:</strong> 44920193821`
};

const gatewayBtns = document.querySelectorAll('.gateway-btn');
const depositInstructions = document.getElementById('deposit-instructions');

function setDepositGateway(method) {
  if (depositInstructions) {
    depositInstructions.innerHTML = depositGateways[method];
  }
}
setDepositGateway('btc');

gatewayBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    gatewayBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    setDepositGateway(btn.getAttribute('data-method'));
  });
});

// KYC Handling
const kycPill = document.getElementById('kyc-pill');
if (localStorage.getItem('kyc_verified') === 'true') {
  kycPill.textContent = 'KYC Verified';
  kycPill.className = 'badge badge-verified';
}

document.getElementById('kyc-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  localStorage.setItem('kyc_verified', 'true');
  kycPill.textContent = 'KYC Verified';
  kycPill.className = 'badge badge-verified';
  alert('Verification submitted! Your KYC profile is now Level 1 verified.');
});

// Withdrawals
document.getElementById('withdraw-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const amount = parseFloat(document.getElementById('withdraw-amount').value);
  if (amount > currentBalance) {
    alert('Insufficient funds available for this withdrawal.');
    return;
  }
  currentBalance -= amount;
  document.getElementById('cash-balance').textContent = `$${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  alert(`Withdrawal request of $${amount} submitted for processing.`);
  e.target.reset();
});

// Real-Time Data & Tickers
async function loadPlatformData() {
  try {
    const [portfolioRes, priceRes] = await Promise.all([
      fetch(`${API_BASE_URL}/portfolio`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch(`${API_BASE_URL}/crypto/prices`)
    ]);

    if (portfolioRes.status === 401) {
      localStorage.clear();
      window.location.href = 'login.html';
      return;
    }

    const portfolio = await portfolioRes.json();
    marketPrices = await priceRes.json();

    // Set Balance
    currentBalance = portfolio.cashBalance;
    document.getElementById('cash-balance').textContent = `$${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    // Top Ticker updates
    if (marketPrices.bitcoin?.usd) document.getElementById('ticker-btc').textContent = `$${marketPrices.bitcoin.usd.toLocaleString()}`;
    if (marketPrices.ethereum?.usd) document.getElementById('ticker-eth').textContent = `$${marketPrices.ethereum.usd.toLocaleString()}`;
    if (marketPrices.solana?.usd) document.getElementById('ticker-sol').textContent = `$${marketPrices.solana.usd.toLocaleString()}`;

    // Render Holdings Table
    const holdingsTable = document.getElementById('holdings-table-body');
    if (holdingsTable && portfolio.holdings) {
      holdingsTable.innerHTML = portfolio.holdings.map(h => {
        const live = marketPrices[h.coin]?.usd || h.avgBuyPrice;
        const total = (live * h.amount).toFixed(2);
        return `
          <tr>
            <td><strong>${h.symbol}</strong></td>
            <td>${h.amount}</td>
            <td>$${Number(total).toLocaleString()}</td>
          </tr>
        `;
      }).join('');
    }

    // Update Live Terminal Price
    const coinSelect = document.getElementById('trade-coin');
    const updateTradePrice = () => {
      const selected = coinSelect.value;
      const price = marketPrices[selected]?.usd || 0;
      document.getElementById('trade-price').value = `$${price.toLocaleString()}`;
    };
    coinSelect?.addEventListener('change', updateTradePrice);
    updateTradePrice();

  } catch (err) {
    console.error('Failed loading platform data:', err);
  }
}

// Trade Execution
document.getElementById('trade-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const coin = document.getElementById('trade-coin').value;
  const amount = parseFloat(document.getElementById('trade-amount').value);
  const price = marketPrices[coin]?.usd || 0;
  const cost = amount * price;

  if (cost > currentBalance) {
    alert(`Insufficient funds. Cost: $${cost.toFixed(2)}, Available: $${currentBalance.toFixed(2)}`);
    return;
  }

  const symbolMap = { bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL' };

  try {
    const res = await fetch(`${API_BASE_URL}/portfolio/buy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ symbol: symbolMap[coin], amount, price })
    });

    if (res.ok) {
      alert(`Order filled: Bought ${amount} ${symbolMap[coin]}`);
      loadPlatformData();
    }
  } catch (err) {
    alert('Trade execution failed. Check backend connection.');
  }
});

loadPlatformData();
