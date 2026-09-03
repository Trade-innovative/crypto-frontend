const token = localStorage.getItem('token');
if (!token) {
  window.location.href = 'login.html';
}

let marketPrices = {};
let currentBalance = 10000.00;

// Logout
document.getElementById('logout-btn')?.addEventListener('click', () => {
  localStorage.clear();
  window.location.href = 'login.html';
});

// Modal Helpers
const modals = {
  deposit: document.getElementById('deposit-modal'),
  withdraw: document.getElementById('withdraw-modal'),
  kyc: document.getElementById('kyc-modal')
};

document.getElementById('open-deposit-btn')?.addEventListener('click', () => {
  renderDepositInfo('btc');
  modals.deposit.classList.add('active');
});

document.getElementById('open-withdraw-btn')?.addEventListener('click', () => {
  modals.withdraw.classList.add('active');
});

document.getElementById('kyc-btn')?.addEventListener('click', () => {
  modals.kyc.classList.add('active');
});

document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => {
    const modalId = btn.getAttribute('data-close');
    document.getElementById(modalId)?.classList.remove('active');
  });
});

// Deposit Info Handler
const depositSelect = document.getElementById('deposit-method');
depositSelect?.addEventListener('change', (e) => renderDepositInfo(e.target.value));

function renderDepositInfo(method) {
  const box = document.getElementById('deposit-details');
  if (method === 'btc') {
    box.innerHTML = `<strong>Network:</strong> Bitcoin<br><strong>Deposit Address:</strong> bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh<br><small style="color:#f59e0b">Send only BTC to this address.</small>`;
  } else if (method === 'usdt') {
    box.innerHTML = `<strong>Network:</strong> TRON (TRC-20)<br><strong>Deposit Address:</strong> TJY8b8p6Dq3WzYfUjK7hQoB21v6g8N5pLe<br><small style="color:#f59e0b">Send only USDT TRC-20 to this address.</small>`;
  } else {
    box.innerHTML = `<strong>Apex Bank Wire Details:</strong><br>Bank: Apex Global Reserve<br>Account Name: Apex Exchange Custody<br>Account Number: 0192847101<br>Routing / Swift: APEXUS33`;
  }
}

// Withdraw Handler
document.getElementById('withdraw-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const amount = parseFloat(document.getElementById('withdraw-amount').value);
  if (amount > currentBalance) {
    alert('Insufficient USD funds for this withdrawal.');
    return;
  }
  currentBalance -= amount;
  document.getElementById('cash-balance').textContent = `$${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  modals.withdraw.classList.remove('active');
  alert(`Withdrawal request of $${amount} submitted for processing.`);
});

// KYC Handler
const kycBadge = document.getElementById('kyc-badge');
if (localStorage.getItem('kyc_verified') === 'true') {
  kycBadge.textContent = 'KYC: Verified';
  kycBadge.className = 'badge badge-verified';
}

document.getElementById('kyc-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  localStorage.setItem('kyc_verified', 'true');
  kycBadge.textContent = 'KYC: Verified';
  kycBadge.className = 'badge badge-verified';
  modals.kyc.classList.remove('active');
  alert('KYC documentation submitted and approved!');
});

// Trade Terminal & Portfolio Loading
async function initDashboard() {
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

    currentBalance = portfolio.cashBalance;
    document.getElementById('cash-balance').textContent = `$${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    // Render Holdings
    const holdingsTable = document.getElementById('holdings-table-body');
    if (holdingsTable && portfolio.holdings) {
      holdingsTable.innerHTML = portfolio.holdings.map(h => {
        const live = marketPrices[h.coin]?.usd || h.avgBuyPrice;
        const total = (live * h.amount).toFixed(2);
        return `
          <tr>
            <td><strong>${h.symbol}</strong></td>
            <td>${h.amount}</td>
            <td>$${h.avgBuyPrice.toLocaleString()}</td>
            <td>$${Number(total).toLocaleString()}</td>
          </tr>
        `;
      }).join('');
    }

    // Update Trade Price on change
    const coinSelect = document.getElementById('trade-coin');
    const updateTradePrice = () => {
      const selected = coinSelect.value;
      const price = marketPrices[selected]?.usd || 0;
      document.getElementById('trade-price').value = `$${price.toLocaleString()}`;
    };
    coinSelect?.addEventListener('change', updateTradePrice);
    updateTradePrice();

  } catch (err) {
    console.error('Failed loading dashboard:', err);
  }
}

// Execute Buy Order
document.getElementById('trade-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const coin = document.getElementById('trade-coin').value;
  const amount = parseFloat(document.getElementById('trade-amount').value);
  const price = marketPrices[coin]?.usd || 0;
  const cost = amount * price;

  if (cost > currentBalance) {
    alert(`Insufficient funds. Order total is $${cost.toFixed(2)}, but you only have $${currentBalance.toFixed(2)}.`);
    return;
  }

  const symbolMap = { bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL', tether: 'USDT' };

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
      alert(`Successfully bought ${amount} ${symbolMap[coin]}!`);
      initDashboard();
    }
  } catch (err) {
    alert('Trade execution failed. Verify connection to backend.');
  }
});

initDashboard();
