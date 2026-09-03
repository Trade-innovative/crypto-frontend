const token = localStorage.getItem('token');
if (!token) {
  window.location.href = 'login.html';
}

// Handle Logout
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
  });
}

// Fetch Portfolio & Live Prices
async function loadDashboardData() {
  try {
    const [portfolioRes, priceRes] = await Promise.all([
      fetch(`${API_BASE_URL}/portfolio`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch(`${API_BASE_URL}/crypto/prices`)
    ]);

    if (portfolioRes.status === 401 || portfolioRes.status === 403) {
      localStorage.clear();
      window.location.href = 'login.html';
      return;
    }

    const portfolio = await portfolioRes.json();
    const prices = await priceRes.json();

    const balanceEl = document.getElementById('cash-balance');
    if (balanceEl) balanceEl.textContent = `$${portfolio.cashBalance.toLocaleString()}`;

    const holdingsTable = document.getElementById('holdings-table-body');
    if (holdingsTable && portfolio.holdings) {
      holdingsTable.innerHTML = portfolio.holdings.map(h => {
        const currentPrice = prices[h.coin]?.usd || h.avgBuyPrice;
        const totalVal = (currentPrice * h.amount).toFixed(2);
        return `
          <tr>
            <td>${h.symbol}</td>
            <td>${h.amount}</td>
            <td>$${h.avgBuyPrice.toLocaleString()}</td>
            <td>$${currentPrice.toLocaleString()}</td>
            <td>$${Number(totalVal).toLocaleString()}</td>
          </tr>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Failed to load dashboard data:', err);
  }
}

loadDashboardData();
