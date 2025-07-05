// Mercados JavaScript - Furby Trading Platform

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    updateCurrentTime();
    initializeTradingViewChart();
    setupEventListeners();
});

// Initialize page components
function initializePage() {
    console.log('Mercados page initialized');
    
    // Simulate real-time price updates
    setInterval(updateCryptoPrices, 5000);
    
    // Update time every second
    setInterval(updateCurrentTime, 1000);
}

// Update current time display
function updateCurrentTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('pt-BR', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    const timeElement = document.getElementById('current-time');
    if (timeElement) {
        timeElement.textContent = timeString;
    }
}

// Initialize TradingView Chart
function initializeTradingViewChart() {
    try {
        // Check if TradingView is available
        if (typeof TradingView !== 'undefined') {
            new TradingView.widget({
                "width": "100%",
                "height": 500,
                "symbol": "BINANCE:BTCUSDT",
                "interval": "1",
                "timezone": "Etc/UTC",
                "theme": "dark",
                "style": "1",
                "locale": "pt_BR",
                "toolbar_bg": "#0d1323",
                "enable_publishing": false,
                "hide_side_toolbar": true,
                "allow_symbol_change": true,
                "container_id": "tradingview_chart",
                "studies": [],
                "disabled_features": [
                    "use_localstorage_for_settings",
                    "volume_force_overlay"
                ],
                "enabled_features": [
                    "study_templates"
                ]
            });
        }
    } catch (error) {
        console.log('TradingView widget not loaded yet, chart will show coming soon overlay');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Timeframe selector
    const timeframeSelect = document.querySelector('.timeframe-select');
    if (timeframeSelect) {
        timeframeSelect.addEventListener('change', function(e) {
            console.log('Timeframe changed to:', e.target.value);
            // In a real implementation, this would update the chart
        });
    }
    
    // Buy button
    const buyBtn = document.querySelector('.buy-btn');
    if (buyBtn) {
        buyBtn.addEventListener('click', handleBuyClick);
    }
    
    // Sell button
    const sellBtn = document.querySelector('.sell-btn');
    if (sellBtn) {
        sellBtn.addEventListener('click', handleSellClick);
    }
    
    // Notify button
    const notifyBtn = document.querySelector('.notify-btn');
    if (notifyBtn) {
        notifyBtn.addEventListener('click', handleNotifyClick);
    }
    
    // Crypto items click handlers
    const cryptoItems = document.querySelectorAll('.crypto-item');
    cryptoItems.forEach(item => {
        item.addEventListener('click', function() {
            const symbol = this.querySelector('.crypto-symbol').textContent;
            console.log('Selected crypto:', symbol);
            // In a real implementation, this would change the chart symbol
        });
    });
}

// Função para mostrar overlay "Em Breve"
function showComingSoon() {
    const overlay = document.getElementById('comingSoonOverlay');
    overlay.classList.add('show');
    
    // Remove o overlay após 3 segundos
    setTimeout(() => {
        overlay.classList.remove('show');
    }, 3000);
}

// Handle buy button click
function handleBuyClick() {
    showComingSoon();
}

// Handle sell button click
function handleSellClick() {
    showComingSoon();
}

// Handle notify button click
function handleNotifyClick() {
    const button = document.querySelector('.notify-btn');
    const originalText = button.innerHTML;
    
    // Show loading state
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
    button.disabled = true;
    
    // Simulate API call
    setTimeout(() => {
        button.innerHTML = '<i class="fas fa-check"></i> Notificação ativada!';
        button.classList.add('success');
        
        // Reset after 3 seconds
        setTimeout(() => {
            button.innerHTML = originalText;
            button.disabled = false;
            button.classList.remove('success');
        }, 3000);
    }, 1500);
}

// Simulate real-time price updates
function updateCryptoPrices() {
    const cryptoItems = document.querySelectorAll('.crypto-item');
    
    cryptoItems.forEach(item => {
        const priceElement = item.querySelector('.price');
        const changeElement = item.querySelector('.change');
        
        if (priceElement && changeElement) {
            // Get current price and simulate small changes
            const currentPrice = parseFloat(priceElement.textContent.replace('$', '').replace(',', ''));
            const changePercent = (Math.random() - 0.5) * 2; // Random change between -1% and +1%
            const newPrice = currentPrice * (1 + changePercent / 100);
            
            // Update price
            priceElement.textContent = `$${newPrice.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })}`;
            
            // Update change percentage
            const isPositive = changePercent > 0;
            changeElement.textContent = `${isPositive ? '+' : ''}${changePercent.toFixed(2)}%`;
            changeElement.className = `change ${isPositive ? 'positive' : 'negative'}`;
            
            // Add flash effect
            item.classList.add('price-updated');
            setTimeout(() => {
                item.classList.remove('price-updated');
            }, 1000);
            
            // Update trading controls price (use Bitcoin as reference)
            const symbol = item.querySelector('.crypto-symbol');
            if (symbol && symbol.textContent === 'BTC') {
                // Trading price update removed
            }
        }
    });
}



// Market data simulation
const marketData = {
    btc: {
        name: 'Bitcoin',
        symbol: 'BTC/USDT',
        basePrice: 68933.70,
        volatility: 0.02
    },
    eth: {
        name: 'Ethereum', 
        symbol: 'ETH/USDT',
        basePrice: 3200.45,
        volatility: 0.03
    },
    bnb: {
        name: 'Binance Coin',
        symbol: 'BNB/USDT', 
        basePrice: 687.20,
        volatility: 0.025
    }
};

// Utility functions
function formatPrice(price) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(price).replace('US$', '$');
}

function formatPercentage(value) {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
}

// Error handling
window.addEventListener('error', function(e) {
    console.error('Mercados page error:', e.error);
});

// Export functions for potential external use
window.MercadosPage = {
    updateCryptoPrices,
    formatPrice,
    formatPercentage
};