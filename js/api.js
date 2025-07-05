// API Configuration and Services - Furby Investimentos
// Baseado na documentação completa da API

// Configurações da API
const API_CONFIG = {
    BASE_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3000/api' 
        : 'https://backend-01-teq9.onrender.com/api',
    TIMEOUT: 30000, // 30 segundos
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000 // 1 segundo
};

// Gerenciamento de tokens
class TokenManager {
    static getToken() {
        return localStorage.getItem('authToken');
    }

    static getRefreshToken() {
        return localStorage.getItem('refreshToken');
    }

    static setTokens(token, refreshToken) {
        localStorage.setItem('authToken', token);
        if (refreshToken) {
            localStorage.setItem('refreshToken', refreshToken);
        }
    }

    static clearTokens() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
    }

    static isTokenExpired(token) {
        if (!token) return true;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return Date.now() >= payload.exp * 1000;
        } catch {
            return true;
        }
    }
}

// Cliente HTTP principal
class APIClient {
    constructor() {
        this.baseURL = API_CONFIG.BASE_URL;
        this.timeout = API_CONFIG.TIMEOUT;
    }

    // Headers padrão para requisições
    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (includeAuth) {
            const token = TokenManager.getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }
        
        return headers;
    }

    // Método principal para fazer requisições
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getHeaders(options.includeAuth !== false),
            timeout: this.timeout,
            ...options
        };

        try {
            const response = await this.fetchWithTimeout(url, config);
            const data = await response.json();
            
            // Se token expirou, tentar renovar
            if (response.status === 401 && data.code === 'TOKEN_EXPIRED') {
                const renewed = await this.renewToken();
                if (renewed) {
                    // Repetir requisição com novo token
                    config.headers = this.getHeaders(options.includeAuth !== false);
                    const retryResponse = await this.fetchWithTimeout(url, config);
                    return await retryResponse.json();
                }
            }
            
            return { ...data, status: response.status };
        } catch (error) {
            console.error('Erro na requisição:', error);
            return {
                success: false,
                message: 'Erro de conexão com o servidor',
                error: error.message
            };
        }
    }

    // Fetch com timeout
    async fetchWithTimeout(url, config) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        try {
            const response = await fetch(url, {
                ...config,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    // Renovar token
    async renewToken() {
        try {
            const refreshToken = TokenManager.getRefreshToken();
            if (!refreshToken) {
                this.logout();
                return false;
            }

            const response = await fetch(`${this.baseURL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken })
            });
            
            const data = await response.json();
            
            if (data.success) {
                TokenManager.setTokens(data.data.token, data.data.refreshToken);
                return true;
            } else {
                this.logout();
                return false;
            }
        } catch (error) {
            console.error('Erro ao renovar token:', error);
            this.logout();
            return false;
        }
    }

    // Logout
    logout() {
        TokenManager.clearTokens();
        localStorage.removeItem('furby_user_session');
        window.location.href = 'index.html';
    }
}

// Instância global do cliente API
const apiClient = new APIClient();

// Serviços da API organizados por módulo

// 🔐 AUTENTICAÇÃO
class AuthService {
    // Registrar novo usuário
    static async register(userData) {
        return apiClient.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
            includeAuth: false
        });
    }

    // Login do usuário
    static async login(email, password) {
        return apiClient.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
            includeAuth: false
        });
    }

    // Renovar token de acesso
    static async refresh() {
        return apiClient.renewToken();
    }

    // Logout do usuário
    static async logout() {
        const response = await apiClient.request('/auth/logout', {
            method: 'POST'
        });
        apiClient.logout();
        return response;
    }

    // Solicitar recuperação de senha
    static async forgotPassword(email) {
        return apiClient.request('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email }),
            includeAuth: false
        });
    }

    // Redefinir senha
    static async resetPassword(token, password) {
        return apiClient.request('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, password }),
            includeAuth: false
        });
    }

    // Obter dados do usuário logado
    static async me() {
        return apiClient.request('/auth/me');
    }
}

// 👤 USUÁRIOS
class UserService {
    // Obter perfil completo com estatísticas
    static async getProfile() {
        return apiClient.request('/users/profile');
    }

    // Atualizar dados do perfil
    static async updateProfile(userData) {
        return apiClient.request('/users/profile', {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    }

    // Alterar senha
    static async changePassword(currentPassword, newPassword) {
        return apiClient.request('/users/password', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword })
        });
    }

    // Dados do dashboard
    static async getDashboard() {
        return apiClient.request('/users/dashboard');
    }

    // Listar indicações
    static async getReferrals() {
        return apiClient.request('/users/referrals');
    }

    // Desativar conta
    static async deleteAccount() {
        return apiClient.request('/users/account', {
            method: 'DELETE'
        });
    }
}

// 💰 INVESTIMENTOS
class InvestmentService {
    // Listar traders disponíveis
    static async getTraders() {
        return apiClient.request('/investments/traders');
    }

    // Criar novo investimento
    static async create(traderId, amount) {
        return apiClient.request('/investments', {
            method: 'POST',
            body: JSON.stringify({ traderId, amount })
        });
    }

    // Listar investimentos do usuário
    static async getAll(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        return apiClient.request(`/investments?${queryParams}`);
    }

    // Obter investimento específico
    static async getById(id) {
        return apiClient.request(`/investments/${id}`);
    }

    // Cancelar investimento
    static async cancel(id) {
        return apiClient.request(`/investments/${id}/cancel`, {
            method: 'PUT'
        });
    }

    // Estatísticas de investimentos
    static async getStats() {
        return apiClient.request('/investments/stats/summary');
    }
}

// 🏦 PIX
class PixService {
    // Criar depósito via PIX
    static async createDeposit(amount) {
        return apiClient.request('/pix/deposit', {
            method: 'POST',
            body: JSON.stringify({ amount })
        });
    }

    // Criar saque via PIX
    static async createWithdrawal(amount, pixKey) {
        return apiClient.request('/pix/withdrawal', {
            method: 'POST',
            body: JSON.stringify({ amount, pixKey })
        });
    }

    // Listar transações PIX
    static async getTransactions(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        return apiClient.request(`/pix/transactions?${queryParams}`);
    }

    // Obter transação PIX específica
    static async getTransaction(id) {
        return apiClient.request(`/pix/transaction/${id}`);
    }
}

// 📊 TRANSAÇÕES
class TransactionService {
    // Listar transações com filtros
    static async getAll(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        return apiClient.request(`/transactions?${queryParams}`);
    }

    // Obter transação específica
    static async getById(id) {
        return apiClient.request(`/transactions/${id}`);
    }

    // Estatísticas de transações
    static async getStats() {
        return apiClient.request('/transactions/stats/summary');
    }

    // Exportar transações
    static async export(format = 'json', filters = {}) {
        const queryParams = new URLSearchParams({ ...filters, format }).toString();
        return apiClient.request(`/transactions/export?${queryParams}`);
    }

    // Cancelar transação
    static async cancel(id) {
        return apiClient.request(`/transactions/${id}/cancel`, {
            method: 'PUT'
        });
    }
}

// 🔗 ASAAS
class AsaasService {
    // Criar depósito via ASAAS
    static async createDeposit(amount, paymentMethod = 'pix') {
        return apiClient.request('/asaas/deposit', {
            method: 'POST',
            body: JSON.stringify({ amount, paymentMethod })
        });
    }

    // Solicitar saque via ASAAS
    static async createWithdrawal(amount, bankData) {
        return apiClient.request('/asaas/withdraw', {
            method: 'POST',
            body: JSON.stringify({ amount, bankData })
        });
    }

    // Listar transações ASAAS
    static async getTransactions(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        return apiClient.request(`/asaas/transactions?${queryParams}`);
    }

    // Obter transação ASAAS específica
    static async getTransaction(id) {
        return apiClient.request(`/asaas/transaction/${id}`);
    }

    // Status do pagamento ASAAS
    static async getPaymentStatus(asaasId) {
        return apiClient.request(`/asaas/payment/${asaasId}/status`);
    }
}

// 🏥 SISTEMA
class SystemService {
    // Status da API e banco de dados
    static async healthCheck() {
        return apiClient.request('/health', {
            includeAuth: false
        });
    }

    // Informações gerais da API
    static async getInfo() {
        return apiClient.request('/', {
            includeAuth: false
        });
    }
}

// Traders disponíveis (conforme documentação)
const AVAILABLE_TRADERS = [
    {
        id: "trader_1",
        name: "Carlos Silva",
        avatar: "/img/traders/carlos.jpg",
        successRate: 85.5,
        period: "30 dias",
        periodInDays: 30,
        minInvestment: 100,
        maxInvestment: 10000,
        description: "Especialista em day trade com foco em ações de tecnologia"
    },
    {
        id: "trader_2",
        name: "Ana Costa",
        avatar: "/img/traders/ana.jpg",
        successRate: 92.3,
        period: "45 dias",
        periodInDays: 45,
        minInvestment: 500,
        maxInvestment: 25000,
        description: "Expert em forex e commodities com 10 anos de experiência"
    },
    {
        id: "trader_3",
        name: "Roberto Santos",
        avatar: "/img/traders/roberto.jpg",
        successRate: 78.9,
        period: "60 dias",
        periodInDays: 60,
        minInvestment: 200,
        maxInvestment: 15000,
        description: "Especialista em criptomoedas e ativos digitais"
    },
    {
        id: "trader_4",
        name: "Marina Oliveira",
        avatar: "/img/traders/marina.jpg",
        successRate: 88.7,
        period: "90 dias",
        periodInDays: 90,
        minInvestment: 1000,
        maxInvestment: 50000,
        description: "Gestora de fundos com foco em investimentos de longo prazo"
    }
];

// Constantes de tipos de dados
const TRANSACTION_TYPES = {
    DEPOSIT: 'deposit',
    WITHDRAWAL: 'withdrawal',
    INVESTMENT: 'investment',
    RETURN: 'return',
    REFERRAL: 'referral',
    BONUS: 'bonus'
};

const PAYMENT_METHODS = {
    PIX: 'pix',
    BANK_TRANSFER: 'bank_transfer',
    CREDIT_CARD: 'credit_card',
    SYSTEM: 'system'
};

const TRANSACTION_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
};

// Utilitários
class APIUtils {
    // Formatar moeda
    static formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    // Formatar porcentagem
    static formatPercentage(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'percent',
            minimumFractionDigits: 1,
            maximumFractionDigits: 2
        }).format(value / 100);
    }

    // Validar email
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Validar CPF
    static validateCPF(cpf) {
        const cleanCPF = cpf.replace(/\D/g, '');
        return cleanCPF.length === 11;
    }

    // Validar telefone
    static validatePhone(phone) {
        const cleanPhone = phone.replace(/\D/g, '');
        return cleanPhone.length >= 10 && cleanPhone.length <= 11;
    }

    // Debounce para otimizar requisições
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Retry para requisições que falharam
    static async retry(fn, attempts = API_CONFIG.RETRY_ATTEMPTS, delay = API_CONFIG.RETRY_DELAY) {
        try {
            return await fn();
        } catch (error) {
            if (attempts > 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
                return APIUtils.retry(fn, attempts - 1, delay * 2);
            }
            throw error;
        }
    }
}

// Exportar serviços para uso global
window.API = {
    // Serviços
    Auth: AuthService,
    User: UserService,
    Investment: InvestmentService,
    Pix: PixService,
    Transaction: TransactionService,
    Asaas: AsaasService,
    System: SystemService,
    
    // Utilitários
    Utils: APIUtils,
    TokenManager,
    
    // Constantes
    TRADERS: AVAILABLE_TRADERS,
    TRANSACTION_TYPES,
    PAYMENT_METHODS,
    TRANSACTION_STATUS,
    
    // Cliente base
    client: apiClient
};

// Função de compatibilidade com o código existente
window.apiRequest = (endpoint, options = {}) => {
    return apiClient.request(endpoint, options);
};

console.log('🚀 API Client inicializado com sucesso!');
console.log('📡 Base URL:', API_CONFIG.BASE_URL);
console.log('🔧 Serviços disponíveis:', Object.keys(window.API));