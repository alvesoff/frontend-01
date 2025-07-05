// Furby Investment Platform - JavaScript

// Verificar autenticação antes de carregar a aplicação
if (!window.location.pathname.includes('login.html')) {
    // Verificar se já existe uma sessão válida antes de carregar o auth.js
    const existingSession = localStorage.getItem('furby_user_session');
    if (!existingSession) {
        window.location.href = 'login.html';
    } else {
        try {
            const session = JSON.parse(existingSession);
            if (!session || Date.now() > session.expiresAt) {
                localStorage.removeItem('furby_user_session');
                window.location.href = 'login.html';
            } else {
                // Carregar sistema de autenticação apenas se a sessão for válida
                const authScript = document.createElement('script');
                authScript.src = 'js/auth.js';
                authScript.onload = function() {
                    // Atualizar interface com dados do usuário
                    updateUserInterface();
                };
                document.head.appendChild(authScript);
            }
        } catch (e) {
            localStorage.removeItem('furby_user_session');
            window.location.href = 'login.html';
        }
    }
}

// DOM Elements
const tabButtons = document.querySelectorAll('.tab-btn');
const subscribeButtons = document.querySelectorAll('.subscribe-btn');
const actionButtons = document.querySelectorAll('.action-btn');
const navLinks = document.querySelectorAll('.nav-link');
const bottomNavItems = document.querySelectorAll('.nav-item');
const traderCards = document.querySelectorAll('.trader-card');
const statCards = document.querySelectorAll('.stat-card');

// Investment tracking
let userInvestments = JSON.parse(localStorage.getItem('userInvestments')) || [];

// Function to parse period to duration in milliseconds
function parsePeriodToDuration(period) {
    const periodLower = period.toLowerCase();
    
    if (periodLower.includes('dia')) {
        const days = parseInt(periodLower.match(/\d+/)[0]);
        return days * 24 * 60 * 60 * 1000; // days to milliseconds
    } else if (periodLower.includes('hora')) {
        const hours = parseInt(periodLower.match(/\d+/)[0]);
        return hours * 60 * 60 * 1000; // hours to milliseconds
    } else if (periodLower.includes('semana')) {
        const weeks = parseInt(periodLower.match(/\d+/)[0]);
        return weeks * 7 * 24 * 60 * 60 * 1000; // weeks to milliseconds
    } else if (periodLower.includes('mês') || periodLower.includes('mes')) {
        const months = parseInt(periodLower.match(/\d+/)[0]);
        return months * 30 * 24 * 60 * 60 * 1000; // months to milliseconds (approximation)
    }
    
    // Default to 1 day if can't parse
    return 24 * 60 * 60 * 1000;
}

// Function to calculate investment progress
function calculateProgress(investment) {
    const now = Date.now();
    const elapsed = now - investment.startTime;
    const progress = Math.min((elapsed / investment.duration) * 100, 100);
    return {
        progress: progress,
        isCompleted: progress >= 100,
        timeRemaining: Math.max(investment.duration - elapsed, 0)
    };
}

// Function to format time remaining
function formatTimeRemaining(milliseconds) {
    if (milliseconds <= 0) return 'Concluído';
    
    const days = Math.floor(milliseconds / (24 * 60 * 60 * 1000));
    const hours = Math.floor((milliseconds % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((milliseconds % (60 * 60 * 1000)) / (60 * 1000));
    
    if (days > 0) {
        return `${days}d ${hours}h restantes`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m restantes`;
    } else {
        return `${minutes}m restantes`;
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    animateElements();
    updateRealTimeData();
});

// Initialize application
function initializeApp() {
    console.log('🚀 Furby Investment Platform Initialized');
    
    // Set initial active states
    setActiveTab('Todos');
    
    // Load user data
    loadUserData();
    
    // Setup periodic updates
    setInterval(updateRealTimeData, 30000); // Update every 30 seconds
    
    // Initialize wallet animations if on wallet page
    initWalletAnimations();
}

// Wallet Page Functions
function copyReferralLink() {
    const referralLink = document.getElementById('referralLink');
    if (referralLink) {
        referralLink.select();
        referralLink.setSelectionRange(0, 99999); // For mobile devices
        
        navigator.clipboard.writeText(referralLink.value).then(() => {
            showNotification('Link copiado com sucesso!', 'success');
            
            // Update button text temporarily
            const copyBtn = document.querySelector('.copy-btn');
            if (copyBtn) {
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
                
                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                }, 2000);
            }
        }).catch(() => {
            showNotification('Erro ao copiar link', 'error');
        });
    }
}

function shareWhatsApp() {
    const referralLink = document.getElementById('referralLink');
    if (referralLink) {
        const message = `🚀 Venha investir comigo na Furby! Uma plataforma incrível de investimentos com ótimos retornos. Use meu link: ${referralLink.value}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    }
}

function shareTelegram() {
    const referralLink = document.getElementById('referralLink');
    if (referralLink) {
        const message = `🚀 Venha investir comigo na Furby! Uma plataforma incrível de investimentos com ótimos retornos. Use meu link: ${referralLink.value}`;
        const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink.value)}&text=${encodeURIComponent(message)}`;
        window.open(telegramUrl, '_blank');
    }
}

function shareFacebook() {
    const referralLink = document.getElementById('referralLink');
    if (referralLink) {
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink.value)}`;
        window.open(facebookUrl, '_blank');
    }
}

function shareTwitter() {
    const referralLink = document.getElementById('referralLink');
    if (referralLink) {
        const message = `🚀 Venha investir comigo na Furby! Uma plataforma incrível de investimentos com ótimos retornos.`;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(referralLink.value)}`;
        window.open(twitterUrl, '_blank');
    }
}

// Wallet page specific animations
function initWalletAnimations() {
    // Only run if we're on the wallet page
    const levelCards = document.querySelectorAll('.level-card');
    if (levelCards.length === 0) return;
    
    // Animate level cards on scroll
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    levelCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'all 0.6s ease';
        observer.observe(card);
    });

    // Animate referral items
    const referralItems = document.querySelectorAll('.referral-item');
    referralItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateX(-20px)';
        item.style.transition = 'all 0.6s ease';
        
        setTimeout(() => {
            item.style.opacity = '1';
            item.style.transform = 'translateX(0)';
        }, index * 100);
    });
}

// Setup event listeners
function setupEventListeners() {
    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.textContent;
            setActiveTab(tabName);
            filterTraders(tabName);
        });
    });
    
    // Subscribe buttons
    subscribeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const traderCard = this.closest('.trader-card');
            const traderName = traderCard.querySelector('h3').textContent;
            handleSubscription(traderName, this);
        });
    });
    
    // Action buttons (referral system)
    actionButtons.forEach(button => {
        button.addEventListener('click', function() {
            const action = this.textContent.toLowerCase();
            if (action.includes('copiar')) {
                copyReferralLink();
            } else if (action.includes('maneiras')) {
                showMoreOptions();
            }
        });
    });
    
    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('href').substring(1);
            navigateToSection(section);
        });
    });
    
    // Bottom navigation
    bottomNavItems.forEach(item => {
        item.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Only prevent default for items without href or with # href
            if (!href || href === '#') {
                e.preventDefault();
                setActiveBottomNav(this);
            } else {
                // For valid links, allow normal navigation
                // The browser will handle the navigation automatically
                setActiveBottomNav(this);
            }
        });
    });
    
    // Trader card interactions
    traderCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-4px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
    
    // Stat card interactions
    statCards.forEach(card => {
        card.addEventListener('click', function() {
            showStatDetails(this);
        });
    });
}

// Set active tab
function setActiveTab(tabName) {
    tabButtons.forEach(button => {
        button.classList.remove('active');
        if (button.textContent === tabName) {
            button.classList.add('active');
        }
    });
}

// Filter traders based on selected tab
function filterTraders(tabName) {
    const traders = document.querySelectorAll('.trader-card');
    
    traders.forEach(trader => {
        trader.style.display = 'block';
        trader.style.opacity = '0';
        
        setTimeout(() => {
            const successRate = parseFloat(trader.querySelector('.success-rate').textContent);
            let shouldShow = true;
            
            switch(tabName) {
                case 'Alto Retorno':
                    shouldShow = successRate >= 100;
                    break;
                case 'Lucros Estáveis':
                    shouldShow = successRate >= 50 && successRate < 100;
                    break;
                case 'Todos':
                default:
                    shouldShow = true;
                    break;
            }
            
            if (shouldShow) {
                trader.style.opacity = '1';
                trader.style.transform = 'translateY(0)';
            } else {
                trader.style.display = 'none';
            }
        }, 100);
    });
}

// Handle subscription
function handleSubscription(traderName, button) {
    // Get trader card data
    const traderCard = button.closest('.trader-card');
    const successRate = traderCard.querySelector('.success-rate').textContent;
    const period = traderCard.querySelector('.trader-period span').textContent;
    const minInvestment = traderCard.querySelector('.investment-value').textContent;
    const traderImage = traderCard.querySelector('.trader-avatar img').src;
    
    // Add loading state
    button.classList.add('loading');
    button.textContent = 'Processando...';
    
    // Simulate API call
    setTimeout(() => {
        button.classList.remove('loading');
        button.textContent = 'Subscrito ✓';
        button.style.background = 'linear-gradient(45deg, #059669, #047857)';
        
        // Add investment to user's portfolio
        const investment = {
            id: Date.now(),
            traderName: traderName,
            successRate: successRate,
            period: period,
            amount: minInvestment,
            traderImage: traderImage,
            date: new Date().toLocaleDateString('pt-BR'),
            status: 'Ativo',
            startTime: Date.now(),
            duration: parsePeriodToDuration(period)
        };
        
        userInvestments.push(investment);
        localStorage.setItem('userInvestments', JSON.stringify(userInvestments));
        
        // Show success notification
        showNotification(`Você se inscreveu com sucesso em ${traderName}!`, 'success');
        
        // Update user stats
        updateUserStats();
        
        // Reset button after 3 seconds
        setTimeout(() => {
            button.textContent = 'Subscrever';
            button.style.background = 'linear-gradient(45deg, #10b981, #059669)';
        }, 3000);
    }, 2000);
}

// Copy referral link
function copyReferralLink() {
    const referralLink = 'https://furby.investment/ref/user123';
    
    navigator.clipboard.writeText(referralLink).then(() => {
        showNotification('Link de indicação copiado!', 'success');
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = referralLink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Link de indicação copiado!', 'success');
    });
}

// Show investments modal
function showInvestmentsModal() {
    let investmentsHTML = '';
    
    if (userInvestments.length === 0) {
        investmentsHTML = `
            <div class="no-investments">
                <i class="fas fa-chart-line" style="font-size: 48px; color: #10b981; margin-bottom: 16px;"></i>
                <h3 style="color: #fff; margin-bottom: 8px;">Nenhum investimento ainda</h3>
                <p style="color: #94a3b8;">Comece investindo em um dos nossos traders!</p>
            </div>
        `;
    } else {
        investmentsHTML = `
            <div class="investments-summary">
                <div class="summary-item">
                    <span class="summary-label">Total de Investimentos:</span>
                    <span class="summary-value">${userInvestments.length}</span>
                </div>
            </div>
            <div class="investments-list">
        `;
        
        userInvestments.forEach(investment => {
            const progressData = calculateProgress(investment);
            const timeRemaining = formatTimeRemaining(progressData.timeRemaining);
            const statusText = progressData.isCompleted ? 'Concluído' : 'Ativo';
            const statusClass = progressData.isCompleted ? 'status-completed' : 'status-active';
            
            investmentsHTML += `
                <div class="investment-item">
                    <div class="investment-trader">
                        <img src="${investment.traderImage}" alt="${investment.traderName}" class="trader-thumb">
                        <div class="trader-details">
                            <h4>${investment.traderName}</h4>
                            <span class="trader-rate">${investment.successRate}</span>
                        </div>
                    </div>
                    <div class="investment-info">
                        <div class="info-item">
                            <span class="info-label">Valor:</span>
                            <span class="info-value">${investment.amount}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Prazo:</span>
                            <span class="info-value">${investment.period}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Data:</span>
                            <span class="info-value">${investment.date}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Status:</span>
                            <span class="info-value ${statusClass}">${statusText}</span>
                        </div>
                    </div>
                    <div class="investment-progress">
                        <div class="progress-header">
                            <span class="progress-label">Progresso</span>
                            <span class="progress-time">${timeRemaining}</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progressData.progress}%"></div>
                        </div>
                        <div class="progress-percentage">${Math.round(progressData.progress)}%</div>
                    </div>
                </div>
            `;
        });
        
        investmentsHTML += '</div>';
    }
    
    const modal = createModal('Meus Investimentos', investmentsHTML);
    
    // Add CSS for investment items only if not already added
    if (!document.getElementById('investment-styles')) {
        const investmentStyles = document.createElement('style');
        investmentStyles.id = 'investment-styles';
        investmentStyles.textContent = `
         .no-investments {
             text-align: center;
             padding: 60px 20px;
         }
         
         .investments-summary {
             background: rgba(16, 185, 129, 0.1);
             border: 1px solid rgba(16, 185, 129, 0.3);
             border-radius: 12px;
             padding: 20px;
             margin-bottom: 24px;
         }
         
         .summary-item {
             display: flex;
             justify-content: space-between;
             align-items: center;
         }
         
         .summary-label {
             color: #94a3b8;
             font-size: 16px;
         }
         
         .summary-value {
             color: #10b981;
             font-weight: bold;
             font-size: 20px;
         }
         
         .investments-list {
             display: flex;
             flex-direction: column;
             gap: 16px;
             min-height: 300px;
         }
         
         .investment-item {
             background: rgba(255, 255, 255, 0.05);
             border: 1px solid rgba(255, 255, 255, 0.1);
             border-radius: 16px;
             padding: 20px;
             display: flex;
             gap: 20px;
             transition: all 0.3s ease;
         }
         
         .investment-item:hover {
             background: rgba(255, 255, 255, 0.08);
             transform: translateY(-2px);
         }
         
         .investment-trader {
             display: flex;
             align-items: center;
             gap: 16px;
             min-width: 200px;
         }
         
         .trader-thumb {
             width: 50px;
             height: 50px;
             border-radius: 50%;
             object-fit: cover;
             border: 2px solid rgba(16, 185, 129, 0.3);
         }
         
         .trader-details h4 {
             color: #fff;
             margin: 0 0 6px 0;
             font-size: 16px;
             font-weight: 600;
         }
         
         .trader-rate {
             color: #10b981;
             font-size: 14px;
             font-weight: 500;
         }
         
         .investment-info {
              flex: 1;
              display: flex;
              flex-wrap: wrap;
              gap: 20px;
              align-items: center;
              justify-content: space-between;
          }
          
          .info-item {
              display: flex;
              flex-direction: column;
              gap: 4px;
              min-width: 100px;
              flex: 0 0 auto;
          }
          
          .info-label {
              color: #94a3b8;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              white-space: nowrap;
          }
          
          .info-value {
              color: #fff;
              font-size: 14px;
              font-weight: 600;
              white-space: nowrap;
          }
         
         .status-active {
             color: #10b981;
         }
         
         .status-completed {
             color: #f59e0b;
         }
         
         .investment-progress {
             margin-top: 16px;
             padding-top: 16px;
             border-top: 1px solid rgba(255, 255, 255, 0.1);
         }
         
         .progress-header {
             display: flex;
             justify-content: space-between;
             align-items: center;
             margin-bottom: 8px;
         }
         
         .progress-label {
             color: #94a3b8;
             font-size: 12px;
             text-transform: uppercase;
             letter-spacing: 0.5px;
         }
         
         .progress-time {
             color: #10b981;
             font-size: 12px;
             font-weight: 600;
             padding-left: 10px;
         }
         
         .progress-bar {
             width: 100%;
             height: 8px;
             background: rgba(255, 255, 255, 0.1);
             border-radius: 4px;
             overflow: hidden;
             margin-bottom: 8px;
         }
         
         .progress-fill {
             height: 100%;
             background: linear-gradient(90deg, #10b981, #059669);
             border-radius: 4px;
             transition: width 0.3s ease;
         }
         
         .progress-percentage {
             text-align: center;
             color: #fff;
             font-size: 12px;
             font-weight: 600;
         }
     `;
        document.head.appendChild(investmentStyles);
    }
    document.body.appendChild(modal);
    
    // Update progress every minute
    const progressInterval = setInterval(() => {
        updateInvestmentProgress();
    }, 60000); // Update every minute
    
    // Clear interval when modal is closed
    const closeBtn = modal.querySelector('.close-modal');
    const originalCloseHandler = closeBtn.onclick;
    closeBtn.onclick = function() {
        clearInterval(progressInterval);
        if (originalCloseHandler) originalCloseHandler();
    };
    
    modal.onclick = function(e) {
        if (e.target === modal) {
            clearInterval(progressInterval);
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        }
    };
}

// Function to update investment progress in real-time
function updateInvestmentProgress() {
    const investmentItems = document.querySelectorAll('.investment-item');
    const investments = JSON.parse(localStorage.getItem('userInvestments')) || [];
    
    investmentItems.forEach((item, index) => {
        if (investments[index]) {
            const investment = investments[index];
            const progressData = calculateProgress(investment);
            const timeRemaining = formatTimeRemaining(progressData.timeRemaining);
            const statusText = progressData.isCompleted ? 'Concluído' : 'Ativo';
            
            // Update progress bar
            const progressFill = item.querySelector('.progress-fill');
            if (progressFill) {
                progressFill.style.width = `${progressData.progress}%`;
            }
            
            // Update percentage
            const progressPercentage = item.querySelector('.progress-percentage');
            if (progressPercentage) {
                progressPercentage.textContent = `${Math.round(progressData.progress)}%`;
            }
            
            // Update time remaining
            const progressTime = item.querySelector('.progress-time');
            if (progressTime) {
                progressTime.textContent = timeRemaining;
            }
            
            // Update status
            const statusElement = item.querySelector('.info-value.status-active, .info-value.status-completed');
            if (statusElement) {
                statusElement.textContent = statusText;
                statusElement.className = progressData.isCompleted ? 'info-value status-completed' : 'info-value status-active';
            }
        }
    });
}

// Show more referral options
function showMoreOptions() {
    // Redirect to carteira.html and scroll to referral link section
    window.location.href = 'carteira.html#referral-link';
    
    // Show notification
    showNotification('Redirecionando para Seu Link de Indicação...', 'info');
}

// Navigate to section
function navigateToSection(section) {
    // Remove active class from all nav links
    navLinks.forEach(link => link.classList.remove('active'));
    
    // Add active class to clicked link
    const activeLink = document.querySelector(`[href="#${section}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    // Handle specific navigation for different sections
    if (section === 'traders') {
        // Find the "Mercados Estratégicos" section
        const marketSection = document.querySelector('.market-section');
        if (marketSection) {
            // Smooth scroll to the market section
            marketSection.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            
            // Show notification
            showNotification('Navegando para Traders...', 'info');
        }
    } else if (section === 'dashboard') {
        // Scroll to top of the page
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        
        // Show notification
        showNotification('Navegando para Dashboard...', 'info');
    } else if (section === 'depositos') {
        // Show investments modal
        showInvestmentsModal();
    } else if (section === 'indicacoes') {
        // Find the "Sistema de Indicações" section
        const referralSection = document.querySelector('.referral-section');
        if (referralSection) {
            // Smooth scroll to the referral section
            referralSection.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            
            // Show notification
            showNotification('Navegando para Indicações...', 'info');
        }
    } else {
        // Simulate section navigation for other sections
        showNotification(`Navegando para ${section}...`, 'info');
    }
}

// Set active bottom navigation
function setActiveBottomNav(activeItem) {
    bottomNavItems.forEach(item => item.classList.remove('active'));
    activeItem.classList.add('active');
}

// Show stat details
function showStatDetails(statCard) {
    const label = statCard.querySelector('.stat-label').textContent;
    const value = statCard.querySelector('.stat-value').textContent;
    
    const modal = createModal(`Detalhes - ${label}`, `
        <div class="stat-details">
            <div class="detail-item">
                <span class="detail-label">Valor Atual:</span>
                <span class="detail-value">${value}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Variação 24h:</span>
                <span class="detail-value positive">+2.5%</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Histórico 7 dias:</span>
                <span class="detail-value positive">+15.8%</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Melhor Performance:</span>
                <span class="detail-value positive">+45.2%</span>
            </div>
        </div>
    `);
    
    document.body.appendChild(modal);
}

// Create modal
function createModal(title, content) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
        </div>
    `;
    
    // Close modal functionality
    const closeBtn = overlay.querySelector('.close-modal');
    closeBtn.addEventListener('click', () => {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 300);
    });
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 300);
        }
    });
    
    // Animate in
    setTimeout(() => {
        overlay.classList.add('active');
    }, 10);
    
    return overlay;
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'linear-gradient(45deg, #10b981, #059669)' : 
                     type === 'error' ? 'linear-gradient(45deg, #ef4444, #dc2626)' : 
                     'linear-gradient(45deg, #3b82f6, #1d4ed8)'};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        font-weight: 500;
        z-index: 1001;
        animation: slideInRight 0.3s ease;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Load user data
function updateUserInterface() {
    // Aguardar o authManager estar disponível
    if (!window.authManager) {
        setTimeout(updateUserInterface, 100);
        return;
    }
    
    const currentUser = getCurrentUserSafe();
    if (currentUser) {
        // Atualizar nome do usuário no header se existir
        const userNameElement = document.querySelector('.user-name');
        if (userNameElement) {
            userNameElement.textContent = currentUser.name;
        }
        
        // Adicionar botão de logout se não existir
        addLogoutButton();
    }
}

// Função auxiliar para obter usuário de forma segura
function getCurrentUserSafe() {
    if (window.authManager && typeof window.authManager.getCurrentUser === 'function') {
        return window.authManager.getCurrentUser();
    }
    
    // Fallback: tentar obter diretamente do localStorage
    try {
        const session = localStorage.getItem('furby_user_session');
        if (session) {
            const parsedSession = JSON.parse(session);
            if (parsedSession && parsedSession.user && Date.now() <= parsedSession.expiresAt) {
                return parsedSession.user;
            }
        }
    } catch (e) {
        console.error('Erro ao obter usuário:', e);
    }
    
    return null;
}

function addLogoutButton() {
    const userInfo = document.querySelector('.user-info');
    if (userInfo && !document.querySelector('.logout-btn')) {
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'logout-btn';
        logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i>';
        logoutBtn.title = 'Sair';
        logoutBtn.onclick = function() {
            if (window.authManager && typeof window.authManager.logout === 'function') {
                window.authManager.logout();
            } else {
                // Fallback: limpar sessão e redirecionar
                localStorage.removeItem('furby_user_session');
                window.location.href = 'login.html';
            }
        };
        
        // Adicionar estilos
        logoutBtn.style.cssText = `
            background: transparent;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            padding: 8px;
            border-radius: 50%;
            transition: background-color 0.3s ease;
            margin-left: 10px;
        `;
        
        logoutBtn.addEventListener('mouseenter', () => {
            logoutBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        });
        
        logoutBtn.addEventListener('mouseleave', () => {
            logoutBtn.style.backgroundColor = 'transparent';
        });
        
        userInfo.appendChild(logoutBtn);
    }
}

function loadUserData() {
    // Simulate loading user data
    const userData = {
        balance: 0.44,
        todayEarnings: 0.00,
        totalEarnings: 0.00,
        deposited: 5.44,
        growth: 0.00
    };
    
    // Update UI with user data
    updateBalanceDisplay(userData.balance);
    updateStatsDisplay(userData);
}

// Update balance display
function updateBalanceDisplay(balance) {
    const balanceElement = document.querySelector('.balance-value');
    if (balanceElement) {
        balanceElement.textContent = `R$ ${balance.toFixed(2)}`;
    }
}

// Update stats display
function updateStatsDisplay(data) {
    const statValues = document.querySelectorAll('.stat-value');
    const values = [
        `+R$ ${data.todayEarnings.toFixed(2)}`,
        data.growth.toFixed(2),
        `+R$ ${data.totalEarnings.toFixed(2)}`,
        `+R$ ${data.deposited.toFixed(2)}`,
        `+R$ ${data.totalEarnings.toFixed(2)}`
    ];
    
    statValues.forEach((element, index) => {
        if (values[index]) {
            element.textContent = values[index];
        }
    });
}

// Update real-time data
function updateRealTimeData() {
    // Simulate real-time updates
    const randomChange = (Math.random() - 0.5) * 0.1;
    const currentBalance = parseFloat(document.querySelector('.balance-value').textContent.replace('R$ ', ''));
    const newBalance = Math.max(0, currentBalance + randomChange);
    
    updateBalanceDisplay(newBalance);
    
    // Update trader success rates slightly
    const successRates = document.querySelectorAll('.success-rate');
    successRates.forEach(rate => {
        const currentRate = parseFloat(rate.textContent);
        if (!isNaN(currentRate)) {
            const change = (Math.random() - 0.5) * 2;
            const newRate = Math.max(0, Math.min(300, currentRate + change));
            rate.textContent = `${newRate.toFixed(0)}% Taxa de lucro`;
        }
    });
}

// Update user stats after subscription
function updateUserStats() {
    const investmentTotal = document.querySelector('.referral-stat .stat-value');
    if (investmentTotal) {
        const current = parseFloat(investmentTotal.textContent) || 0;
        investmentTotal.textContent = (current + 5).toFixed(2);
    }
}

// Animate elements on scroll
function animateElements() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, {
        threshold: 0.1
    });
    
    // Observe all cards
    document.querySelectorAll('.stat-card, .trader-card, .referral-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'all 0.6s ease';
        observer.observe(card);
    });
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
    
    @keyframes slideUp {
        from { transform: translateY(30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
    
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .modal-close {
        background: none;
        border: none;
        color: #94a3b8;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.3s ease;
    }
    
    .modal-close:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
    }
    
    .referral-options {
        display: grid;
        gap: 12px;
    }
    
    .option {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
        border: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .option:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: translateX(5px);
    }
    
    .option i {
        font-size: 20px;
        color: #7c3aed;
    }
    
    .stat-details {
        display: grid;
        gap: 16px;
    }
    
    .detail-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .detail-item:last-child {
        border-bottom: none;
    }
    
    .detail-label {
        color: #94a3b8;
        font-weight: 500;
    }
    
    .detail-value {
        font-weight: bold;
        color: #ffffff;
    }
    
    .detail-value.positive {
        color: #10b981;
    }
    
    /* Estilos para modal PIX QR Code */
    .pix-qr-modal {
        max-width: 500px;
        width: 90%;
    }
    
    .pix-qr-content {
        text-align: center;
    }
    
    .pix-amount {
        background: linear-gradient(135deg, #7c3aed, #a855f7);
        padding: 20px;
        border-radius: 12px;
        margin-bottom: 20px;
    }
    
    .pix-amount h4 {
        margin: 0;
        color: white;
        font-size: 24px;
        font-weight: bold;
    }
    
    .qr-code-container {
        background: white;
        padding: 20px;
        border-radius: 12px;
        margin-bottom: 20px;
        display: inline-block;
    }
    
    .qr-code-image {
        width: 200px;
        height: 200px;
        border-radius: 8px;
    }
    
    .qr-instruction {
        margin: 10px 0 0 0;
        color: #666;
        font-size: 14px;
    }
    
    .pix-copy-paste {
        margin-bottom: 20px;
    }
    
    .pix-copy-paste label {
        display: block;
        margin-bottom: 10px;
        color: #94a3b8;
        font-weight: 500;
    }
    
    .copy-container {
        display: flex;
        gap: 10px;
        align-items: center;
    }
    
    .pix-code-input {
        flex: 1;
        padding: 12px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        color: #ffffff;
        font-family: monospace;
        font-size: 12px;
    }
    
    .copy-btn {
        padding: 12px 16px;
        background: #7c3aed;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.3s ease;
        white-space: nowrap;
    }
    
    .copy-btn:hover {
        background: #6d28d9;
        transform: translateY(-2px);
    }
    
    .pix-info {
        background: rgba(255, 255, 255, 0.05);
        padding: 20px;
        border-radius: 12px;
        margin-bottom: 20px;
    }
    
    .info-item {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
        color: #94a3b8;
    }
    
    .info-item:last-child {
        margin-bottom: 0;
    }
    
    .info-item i {
        color: #7c3aed;
        width: 16px;
        text-align: center;
    }
    
    .modal-actions {
        display: flex;
        gap: 12px;
        justify-content: center;
    }
    
    .btn-secondary {
        padding: 12px 24px;
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.3s ease;
    }
    
    .btn-secondary:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: translateY(-2px);
    }
    
    .btn-primary {
        padding: 12px 24px;
        background: linear-gradient(135deg, #7c3aed, #a855f7);
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.3s ease;
    }
    
    .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(124, 58, 237, 0.3);
    }
`;

document.head.appendChild(style);

// Wallet Action Functions
function openDepositModal() {
    showModal('deposit');
}

function openWithdrawModal() {
    showModal('withdraw');
}

function showModal(type) {
    const modalHtml = type === 'deposit' ? createDepositModal() : createWithdrawModal();
    
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = modalHtml;
    
    // Add to body
    document.body.appendChild(overlay);
    
    // Add event listeners
    setupModalEventListeners(overlay, type);
    
    // Animate in
    setTimeout(() => {
        overlay.classList.add('active');
    }, 10);
}

function createDepositModal() {
    return `
        <div class="modal deposit-modal">
            <div class="modal-header">
                <h3><i class="fas fa-plus-circle"></i> Depositar</h3>
                <button class="close-modal" onclick="closeModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="deposit-methods">
                    <h4>Método de depósito:</h4>
                    <div class="method-grid">
                        <div class="method-card selected" data-method="pix">
                            <i class="fas fa-qrcode"></i>
                            <span>PIX</span>
                            <small>Instantâneo e seguro</small>
                        </div>
                    </div>
                    <div class="pix-info">
                        <p><i class="fas fa-info-circle"></i> Depósitos via PIX são processados instantaneamente</p>
                    </div>
                </div>
                <div class="amount-input">
                    <label for="depositAmount">Valor do depósito:</label>
                    <div class="input-group">
                        <span class="currency">R$</span>
                        <input type="number" id="depositAmount" placeholder="0,00" min="25" step="0.01">
                    </div>
                    <small>Valor mínimo: R$ 25,00</small>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
                <button class="btn-primary" onclick="processDeposit()">Continuar</button>
            </div>
        </div>
    `;
}

function createWithdrawModal() {
    const hasPixKey = localStorage.getItem('userPixKey');
    
    if (!hasPixKey) {
        return createPixRegistrationModal();
    }
    
    return `
        <div class="modal withdraw-modal">
            <div class="modal-header">
                <h3><i class="fas fa-minus-circle"></i> Sacar</h3>
                <button class="close-modal" onclick="closeModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="balance-info">
                    <div class="available-balance">
                        <span class="label">Saldo disponível:</span>
                        <span class="amount">R$ 12.450,00</span>
                    </div>
                </div>
                <div class="amount-input">
                    <label for="withdrawAmount">Valor do saque:</label>
                    <div class="input-group">
                        <span class="currency">R$</span>
                        <input type="number" id="withdrawAmount" placeholder="0,00" min="50" step="0.01">
                    </div>
                    <small>Valor mínimo: R$ 50,00</small>
                </div>
                <div class="pix-info">
                    <h4>Chave PIX cadastrada:</h4>
                    <div class="pix-details">
                        <div class="pix-key-display">
                            <i class="fas fa-qrcode"></i>
                            <span class="pix-key">${hasPixKey}</span>
                        </div>
                        <button class="edit-pix-btn" onclick="editPixKey()">Alterar chave PIX</button>
                    </div>
                    <div class="pix-info-text">
                        <p><i class="fas fa-info-circle"></i> Saques são processados via PIX instantaneamente</p>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
                <button class="btn-primary" onclick="processWithdraw()">Solicitar Saque</button>
            </div>
        </div>
    `;
}

function createPixRegistrationModal() {
    return `
        <div class="modal pix-registration-modal">
            <div class="modal-header">
                <h3><i class="fas fa-qrcode"></i> Cadastrar Chave PIX</h3>
                <button class="close-modal" onclick="closeModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="pix-registration-info">
                    <div class="info-banner">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Para realizar saques, você precisa cadastrar uma chave PIX válida.</p>
                    </div>
                </div>
                <div class="pix-key-types">
                    <h4>Selecione o tipo de chave PIX:</h4>
                    <div class="key-type-grid">
                        <div class="key-type-card" data-type="cpf">
                            <i class="fas fa-id-card"></i>
                            <span>CPF</span>
                        </div>
                        <div class="key-type-card" data-type="email">
                            <i class="fas fa-envelope"></i>
                            <span>E-mail</span>
                        </div>
                        <div class="key-type-card" data-type="phone">
                            <i class="fas fa-phone"></i>
                            <span>Celular</span>
                        </div>
                        <div class="key-type-card" data-type="random">
                            <i class="fas fa-random"></i>
                            <span>Chave Aleatória</span>
                        </div>
                    </div>
                </div>
                <div class="pix-key-input" style="display: none;">
                    <label for="pixKeyValue">Digite sua chave PIX:</label>
                    <div class="input-group">
                        <input type="text" id="pixKeyValue" placeholder="Digite sua chave PIX">
                    </div>
                    <small class="key-format-hint"></small>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
                <button class="btn-primary" onclick="savePixKey()" disabled>Cadastrar Chave</button>
            </div>
        </div>
    `;
}

function setupModalEventListeners(overlay, type) {
    // Close modal when clicking overlay
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            closeModal();
        }
    });
    
    // Method selection for deposit
    if (type === 'deposit') {
        const methodCards = overlay.querySelectorAll('.method-card');
        methodCards.forEach(card => {
            card.addEventListener('click', function() {
                methodCards.forEach(c => c.classList.remove('selected'));
                this.classList.add('selected');
            });
        });
    }
    
    // PIX key type selection
    if (type === 'withdraw') {
        setupPixKeySelection(overlay);
    }
    
    // ESC key to close
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

function setupPixKeySelection(overlay) {
    const keyTypeCards = overlay.querySelectorAll('.key-type-card');
    const pixKeyInput = overlay.querySelector('.pix-key-input');
    const pixKeyValue = overlay.querySelector('#pixKeyValue');
    const keyFormatHint = overlay.querySelector('.key-format-hint');
    const saveButton = overlay.querySelector('.btn-primary');
    
    if (!keyTypeCards.length) return;
    
    keyTypeCards.forEach(card => {
        card.addEventListener('click', function() {
            keyTypeCards.forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
            
            const keyType = this.dataset.type;
            showPixKeyInput(keyType, pixKeyInput, pixKeyValue, keyFormatHint, saveButton);
        });
    });
    
    if (pixKeyValue) {
        pixKeyValue.addEventListener('input', function() {
            validatePixKey(this.value, keyFormatHint, saveButton);
        });
    }
}

function showPixKeyInput(keyType, pixKeyInput, pixKeyValue, keyFormatHint, saveButton) {
    pixKeyInput.style.display = 'block';
    pixKeyValue.dataset.type = keyType;
    
    const placeholders = {
        cpf: '000.000.000-00',
        email: 'seu@email.com',
        phone: '(11) 99999-9999',
        random: 'Chave será gerada automaticamente'
    };
    
    const hints = {
        cpf: 'Digite seu CPF (apenas números ou com formatação)',
        email: 'Digite um e-mail válido',
        phone: 'Digite seu celular com DDD',
        random: 'Uma chave aleatória será gerada para você'
    };
    
    pixKeyValue.placeholder = placeholders[keyType];
    keyFormatHint.textContent = hints[keyType];
    
    if (keyType === 'random') {
        pixKeyValue.value = generateRandomPixKey();
        pixKeyValue.disabled = true;
        saveButton.disabled = false;
    } else {
        pixKeyValue.disabled = false;
        pixKeyValue.value = '';
        saveButton.disabled = true;
    }
}

function generateRandomPixKey() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function validatePixKey(value, keyFormatHint, saveButton) {
    const keyType = document.querySelector('#pixKeyValue').dataset.type;
    let isValid = false;
    
    switch (keyType) {
        case 'cpf':
            isValid = validateCPF(value);
            break;
        case 'email':
            isValid = validateEmail(value);
            break;
        case 'phone':
            isValid = validatePhone(value);
            break;
        case 'random':
            isValid = true;
            break;
    }
    
    saveButton.disabled = !isValid;
    
    if (value && !isValid) {
        keyFormatHint.style.color = '#e74c3c';
        keyFormatHint.textContent = 'Formato inválido';
    } else {
        keyFormatHint.style.color = '#666';
        const hints = {
            cpf: 'Digite seu CPF (apenas números ou com formatação)',
            email: 'Digite um e-mail válido',
            phone: 'Digite seu celular com DDD',
            random: 'Uma chave aleatória será gerada para você'
        };
        keyFormatHint.textContent = hints[keyType];
    }
}

function validateCPF(cpf) {
    cpf = cpf.replace(/[^\d]/g, '');
    return cpf.length === 11 && /^\d{11}$/.test(cpf);
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePhone(phone) {
    const phoneRegex = /^\(?\d{2}\)?[\s-]?9?\d{4}[\s-]?\d{4}$/;
    return phoneRegex.test(phone);
}

function savePixKey() {
    const pixKeyValue = document.querySelector('#pixKeyValue').value;
    const keyType = document.querySelector('#pixKeyValue').dataset.type;
    
    if (!pixKeyValue) {
        showNotification('Digite uma chave PIX válida', 'error');
        return;
    }
    
    // Save to localStorage
    localStorage.setItem('userPixKey', pixKeyValue);
    localStorage.setItem('userPixKeyType', keyType);
    
    showNotification('Cadastrando chave PIX...', 'info');
    
    setTimeout(() => {
        closeModal();
        showNotification('Chave PIX cadastrada com sucesso!', 'success');
        // Reopen withdraw modal
        setTimeout(() => {
            openWithdrawModal();
        }, 1000);
    }, 2000);
}

function editPixKey() {
    localStorage.removeItem('userPixKey');
    localStorage.removeItem('userPixKeyType');
    closeModal();
    setTimeout(() => {
        openWithdrawModal();
    }, 300);
}

function closeModal() {
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => {
            overlay.remove();
        }, 300);
    }
}

async function processDeposit() {
    const amount = parseFloat(document.getElementById('depositAmount').value);
    const description = document.getElementById('depositDescription')?.value || '';
    
    if (!amount || amount < 1) {
        showNotification('Valor mínimo para depósito é R$ 1,00', 'error');
        return;
    }
    
    if (amount > 50000) {
        showNotification('Valor máximo é R$ 50.000,00', 'error');
        return;
    }
    
    try {
        showNotification('Gerando PIX...', 'info');
        
        // Usar ASAAS como provedor padrão
        const response = await apiRequest('/asaas/deposit', {
            method: 'POST',
            body: JSON.stringify({ amount, description })
        });

        if (response.success) {
            closeModal();
            showPixQRCode(response.transaction);
        } else {
            showNotification(response.error || 'Erro ao gerar PIX', 'error');
        }
    } catch (error) {
        console.error('Erro ao fazer depósito PIX:', error);
        showNotification('Erro ao processar depósito', 'error');
    }
}

async function processWithdraw() {
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const pixKey = localStorage.getItem('userPixKey');
    const password = prompt('Digite sua senha para confirmar o saque:');
    
    if (!amount || amount < 10) {
        showNotification('Valor mínimo para saque é R$ 10,00', 'error');
        return;
    }
    
    if (amount > 10000) {
        showNotification('Valor máximo para saque é R$ 10.000,00', 'error');
        return;
    }
    
    if (!pixKey) {
        showNotification('Chave PIX não encontrada', 'error');
        return;
    }
    
    if (!password) {
        showNotification('Senha é obrigatória', 'error');
        return;
    }
    
    try {
        showNotification('Processando saque via PIX...', 'info');
        
        const response = await apiRequest('/asaas/withdraw', {
            method: 'POST',
            body: JSON.stringify({ amount, pixKey, password })
        });

        if (response.success) {
            closeModal();
            showNotification(`Saque de R$ ${amount.toFixed(2)} processado com sucesso! O valor será creditado em ${response.transaction.estimatedTime}.`, 'success');
            // Atualizar saldo do usuário
            updateUserInterface();
        } else {
            showNotification(response.error || 'Erro ao processar saque', 'error');
        }
    } catch (error) {
        console.error('Erro ao fazer saque PIX:', error);
        showNotification('Erro ao processar saque', 'error');
    }
}

// Função para exibir QR Code PIX
function showPixQRCode(transaction) {
    const modalHtml = `
        <div class="modal-overlay active">
            <div class="modal pix-qr-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-qrcode"></i> PIX - Depósito</h3>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="pix-qr-content">
                    <div class="pix-amount">
                        <h4>Valor: ${formatCurrency(transaction.amount)}</h4>
                    </div>
                    
                    ${transaction.pixData?.qrCode ? `
                        <div class="qr-code-container">
                            <img src="${transaction.pixData.qrCode}" alt="QR Code PIX" class="qr-code-image">
                            <p class="qr-instruction">Escaneie o QR Code com seu app bancário</p>
                        </div>
                    ` : ''}
                    
                    ${transaction.pixData?.copyPaste ? `
                        <div class="pix-copy-paste">
                            <label>Ou copie o código PIX:</label>
                            <div class="copy-container">
                                <input type="text" value="${transaction.pixData.copyPaste}" readonly class="pix-code-input">
                                <button class="copy-btn" onclick="copyPixCode('${transaction.pixData.copyPaste}')">
                                    <i class="fas fa-copy"></i> Copiar
                                </button>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="pix-info">
                        <div class="info-item">
                            <i class="fas fa-clock"></i>
                            <span>Pagamento processado instantaneamente</span>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-shield-alt"></i>
                            <span>Transação segura via ASAAS</span>
                        </div>
                        ${transaction.pixData?.expiresAt ? `
                            <div class="info-item">
                                <i class="fas fa-hourglass-half"></i>
                                <span>Expira em: ${new Date(transaction.pixData.expiresAt).toLocaleString('pt-BR')}</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="modal-actions">
                        <button class="btn-secondary" onclick="closeModal()">Fechar</button>
                        <button class="btn-primary" onclick="checkPaymentStatus('${transaction.id}')">Verificar Pagamento</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Função para copiar código PIX
function copyPixCode(code) {
    navigator.clipboard.writeText(code).then(() => {
        showNotification('Código PIX copiado!', 'success');
        
        // Atualizar botão temporariamente
        const copyBtn = document.querySelector('.copy-btn');
        if (copyBtn) {
            const originalHTML = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
            copyBtn.style.background = '#10b981';
            
            setTimeout(() => {
                copyBtn.innerHTML = originalHTML;
                copyBtn.style.background = '';
            }, 2000);
        }
    }).catch(() => {
        showNotification('Erro ao copiar código', 'error');
    });
}

// Função para verificar status do pagamento
async function checkPaymentStatus(transactionId) {
    try {
        showNotification('Verificando pagamento...', 'info');
        
        const response = await apiRequest(`/transactions/${transactionId}`, {
            method: 'GET'
        });
        
        if (response.transaction) {
            if (response.transaction.status === 'completed') {
                closeModal();
                showNotification('Pagamento confirmado! Seu saldo foi atualizado.', 'success');
                updateUserInterface();
            } else {
                showNotification('Pagamento ainda não foi processado', 'info');
            }
        }
    } catch (error) {
        console.error('Erro ao verificar pagamento:', error);
        showNotification('Erro ao verificar pagamento', 'error');
    }
}

// Utility function to format currency
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// Utility function to format percentage
function formatPercentage(value) {
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}

// Utility function to generate random data for demo
function generateRandomData() {
    return {
        balance: Math.random() * 50000 + 10000,
        invested: Math.random() * 30000 + 5000,
        profit: (Math.random() - 0.5) * 2000,
        profitPercentage: (Math.random() - 0.5) * 20
    };
}

// Console welcome message
console.log(`
🚀 Furby Investment Platform
💜 Desenvolvido com tema roxo escuro
📈 Sistema de investimentos e trading
🔗 Sistema de indicações integrado

Versão: 1.0.0
Status: Ativo
`);