// Sistema de Autenticação - Furby Investimentos
// Integrado com o novo sistema de API centralizado

// Configurações
const AUTH_CONFIG = {
    SESSION_KEY: 'furby_user_session',
    USERS_KEY: 'furby_users',
    SESSION_DURATION: 24 * 60 * 60 * 1000, // 24 horas em millisegundos
    MIN_PASSWORD_LENGTH: 6,
    MIN_NAME_LENGTH: 3
};

// Classe para gerenciar autenticação
class AuthManager {
    constructor() {
        this.init();
    }
    
    init() {
        // Verificar se estamos na página de login
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
            this.setupLoginPage();
        } else {
            // Verificar autenticação em outras páginas
            this.checkAuthentication();
        }
    }
    
    setupLoginPage() {
        // Se já estiver logado, redirecionar
        if (this.isAuthenticated()) {
            window.location.href = 'dashboard.html';
            return;
        }
        
        // Setup dos formulários
        this.setupForms();
    }
    
    setupForms() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }
        
        // Setup validação em tempo real
        this.setupRealTimeValidation();
    }
    
    setupRealTimeValidation() {
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });
    }
    
    validateField(input) {
        const formGroup = input.closest('.form-group');
        let isValid = true;
        
        switch (input.type) {
            case 'email':
                isValid = this.validateEmail(input.value);
                break;
            case 'password':
                isValid = input.value.length >= AUTH_CONFIG.MIN_PASSWORD_LENGTH;
                break;
            case 'text':
                if (input.id.includes('Name')) {
                    isValid = input.value.length >= AUTH_CONFIG.MIN_NAME_LENGTH;
                }
                break;
        }
        
        // Validação especial para confirmação de senha
        if (input.id === 'confirmPassword') {
            const password = document.getElementById('registerPassword').value;
            isValid = input.value === password && input.value.length > 0;
        }
        
        if (!isValid) {
            formGroup.classList.add('error');
        } else {
            formGroup.classList.remove('error');
        }
        
        return isValid;
    }
    
    clearFieldError(input) {
        const formGroup = input.closest('.form-group');
        formGroup.classList.remove('error');
    }
    
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        // Validar campos
        if (!this.validateLoginForm(email, password)) {
            return;
        }
        
        this.showLoading(true);
        
        try {
            const response = await window.API.Auth.login(email, password);
            
            if (response.success) {
                // Salvar tokens e dados do usuário
                window.API.TokenManager.setTokens(response.data.token, response.data.refreshToken);
                
                this.createSession(response.data.user);
                this.showSuccess('Login realizado com sucesso!');
                
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
            } else {
                this.showError(response.message || 'Email ou senha incorretos');
            }
        } catch (error) {
            console.error('Erro no login:', error);
            this.showError('Erro interno. Tente novamente.');
        } finally {
            this.showLoading(false);
        }
    }
    
    async handleRegister(e) {
        e.preventDefault();
        
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const referralCode = document.getElementById('referralCode')?.value || '';
        
        // Validar campos
        if (!this.validateRegisterForm(name, email, password, confirmPassword)) {
            return;
        }
        
        this.showLoading(true);
        
        try {
            const requestBody = { name, email, password, confirmPassword };
            if (referralCode.trim()) {
                requestBody.referralCode = referralCode.trim();
            }
            
            const response = await window.API.Auth.register(requestBody);
            
            if (response.success) {
                // Salvar tokens e dados do usuário
                window.API.TokenManager.setTokens(response.data.token, response.data.refreshToken);
                
                this.createSession(response.data.user);
                this.showSuccess('Cadastro realizado com sucesso!');
                
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
            } else {
                // Mostrar erros de validação
                if (response.errors && response.errors.length > 0) {
                    const errorMessages = response.errors.map(err => err.msg).join('\n');
                    this.showError(errorMessages);
                } else {
                    this.showError(response.message || 'Erro ao criar conta');
                }
            }
        } catch (error) {
            console.error('Erro no registro:', error);
            this.showError('Erro interno. Tente novamente.');
        } finally {
            this.showLoading(false);
        }
    }
    
    validateLoginForm(email, password) {
        let isValid = true;
        
        if (!this.validateEmail(email)) {
            this.setFieldError('loginEmail');
            isValid = false;
        }
        
        if (password.length < AUTH_CONFIG.MIN_PASSWORD_LENGTH) {
            this.setFieldError('loginPassword');
            isValid = false;
        }
        
        return isValid;
    }
    
    validateRegisterForm(name, email, password, confirmPassword) {
        let isValid = true;
        
        if (name.length < AUTH_CONFIG.MIN_NAME_LENGTH) {
            this.setFieldError('registerName');
            isValid = false;
        }
        
        if (!this.validateEmail(email)) {
            this.setFieldError('registerEmail');
            isValid = false;
        }
        
        if (password.length < AUTH_CONFIG.MIN_PASSWORD_LENGTH) {
            this.setFieldError('registerPassword');
            isValid = false;
        }
        
        if (password !== confirmPassword) {
            this.setFieldError('confirmPassword');
            isValid = false;
        }
        
        return isValid;
    }
    
    setFieldError(fieldId) {
        const field = document.getElementById(fieldId);
        const formGroup = field.closest('.form-group');
        formGroup.classList.add('error');
    }
    
    authenticateUser(email, password) {
        const users = this.getUsers();
        const user = users.find(u => u.email === email);
        
        if (!user) {
            return { success: false, message: 'Email não encontrado' };
        }
        
        if (user.password !== this.hashPassword(password)) {
            return { success: false, message: 'Senha incorreta' };
        }
        
        return { success: true, user: { id: user.id, name: user.name, email: user.email } };
    }
    
    registerUser(name, email, password) {
        const users = this.getUsers();
        
        // Verificar se email já existe
        if (users.find(u => u.email === email)) {
            return { success: false, message: 'Email já cadastrado' };
        }
        
        // Criar novo usuário
        const newUser = {
            id: Date.now().toString(),
            name: name,
            email: email,
            password: this.hashPassword(password),
            createdAt: new Date().toISOString()
        };
        
        users.push(newUser);
        this.saveUsers(users);
        
        return { success: true, user: { id: newUser.id, name: newUser.name, email: newUser.email } };
    }
    
    hashPassword(password) {
        // Simulação de hash simples (em produção usar bcrypt ou similar)
        return btoa(password + 'furby_salt');
    }
    
    getUsers() {
        const users = localStorage.getItem(AUTH_CONFIG.USERS_KEY);
        return users ? JSON.parse(users) : [];
    }
    
    saveUsers(users) {
        localStorage.setItem(AUTH_CONFIG.USERS_KEY, JSON.stringify(users));
    }
    
    createSession(user) {
        const session = {
            user: user,
            loginTime: Date.now(),
            expiresAt: Date.now() + AUTH_CONFIG.SESSION_DURATION
        };
        
        localStorage.setItem(AUTH_CONFIG.SESSION_KEY, JSON.stringify(session));
    }
    
    isAuthenticated() {
        const session = this.getSession();
        
        if (!session) {
            return false;
        }
        
        // Verificar se a sessão expirou
        if (Date.now() > session.expiresAt) {
            this.logout();
            return false;
        }
        
        return true;
    }
    
    getSession() {
        const session = localStorage.getItem(AUTH_CONFIG.SESSION_KEY);
        return session ? JSON.parse(session) : null;
    }
    
    getCurrentUser() {
        const session = this.getSession();
        return session ? session.user : null;
    }
    
    checkAuthentication() {
        if (!this.isAuthenticated()) {
            // Redirecionar para login se não estiver autenticado
            window.location.href = 'index.html';
        }
    }
    
    async logout() {
        try {
            // Tentar fazer logout no servidor
            if (window.API.TokenManager.getToken()) {
                await window.API.Auth.logout();
            }
        } catch (error) {
            console.error('Erro no logout:', error);
            // Limpar dados locais mesmo se houver erro no servidor
            window.API.TokenManager.clearTokens();
            localStorage.removeItem(AUTH_CONFIG.SESSION_KEY);
            window.location.href = 'index.html';
        }
    }
    
    showLoading(show) {
        const loading = document.getElementById('loading');
        const forms = document.querySelectorAll('.login-form');
        
        if (show) {
            loading.classList.add('show');
            forms.forEach(form => {
                form.style.display = 'none';
            });
        } else {
            loading.classList.remove('show');
            forms.forEach(form => {
                // Remover o style inline para deixar o CSS controlar
                form.style.display = '';
            });
        }
    }
    
    showSuccess(message) {
        const successDiv = document.getElementById('successMessage');
        successDiv.textContent = message;
        successDiv.classList.add('show');
        
        setTimeout(() => {
            successDiv.classList.remove('show');
        }, 5000);
    }
    
    showError(message) {
        // Criar notificação de erro
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(45deg, #ef4444, #dc2626);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            font-weight: 500;
            z-index: 1001;
            animation: slideInRight 0.3s ease;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }
}

// Funções globais para a interface
function switchTab(tab) {
    // Remover active de todas as abas
    document.querySelectorAll('.login-tab').forEach(t => {
        t.classList.remove('active');
    });
    
    // Remover active de todos os formulários e limpar estilos inline
    document.querySelectorAll('.login-form').forEach(f => {
        f.classList.remove('active');
        f.style.display = ''; // Limpar qualquer style inline
    });
    
    // Adicionar active na aba clicada
    if (tab === 'login') {
        document.querySelector('[onclick="switchTab(\'login\')"]').classList.add('active');
        document.getElementById('loginForm').classList.add('active');
    } else if (tab === 'register') {
        document.querySelector('[onclick="switchTab(\'register\')"]').classList.add('active');
        document.getElementById('registerForm').classList.add('active');
    }
    
    // Limpar mensagens de erro
    document.querySelectorAll('.form-group').forEach(group => {
        group.classList.remove('error');
    });
    
    // Limpar mensagem de sucesso
    const successMessage = document.getElementById('successMessage');
    if (successMessage) {
        successMessage.classList.remove('show');
    }
    
    // Limpar campos dos formulários
    if (tab === 'register') {
        document.getElementById('registerForm').reset();
    }
}

function showForgotPassword() {
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) {
        modal.style.display = 'block';
        modal.style.pointerEvents = 'auto';
    }
}

function closeForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) {
        modal.style.display = 'none';
        modal.style.pointerEvents = 'none';
    }
}

// Fechar modal ao clicar fora dele
window.onclick = function(event) {
    const modal = document.getElementById('forgotPasswordModal');
    if (event.target === modal) {
        closeForgotPasswordModal();
    }
}

// Função para logout (para ser usada em outras páginas)
async function logout() {
    if (window.authManager) {
        await window.authManager.logout();
    } else {
        // Fallback para usar API diretamente
        await window.API.Auth.logout();
    }
}

// Função para obter dados atualizados do usuário
const refreshUserData = async () => {
    try {
        const response = await window.API.Auth.me();
        
        if (response.success) {
            const currentUser = getCurrentUser();
            localStorage.setItem(AUTH_CONFIG.SESSION_KEY, JSON.stringify({
                user: response.data.user,
                loginTime: currentUser?.loginTime || Date.now(),
                expiresAt: Date.now() + AUTH_CONFIG.SESSION_DURATION
            }));
            return response.data;
        } else {
            console.error('Erro ao obter dados do usuário:', response.message);
            return null;
        }
    } catch (error) {
        console.error('Erro ao obter dados do usuário:', error);
        return null;
    }
};

// Função para obter usuário atual (para ser usada em outras páginas)
function getCurrentUser() {
    if (window.authManager) {
        return window.authManager.getCurrentUser();
    }
    return null;
}

// Inicializar o sistema de autenticação
window.authManager = new AuthManager();

// Adicionar event listeners para as abas quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    // Adicionar event listeners para os botões de aba
    const loginTab = document.querySelector('[onclick="switchTab(\'login\')"]');
    const registerTab = document.querySelector('[onclick="switchTab(\'register\')"]');
    
    if (loginTab) {
        loginTab.addEventListener('click', function(e) {
            e.preventDefault();
            switchTab('login');
        });
    }
    
    if (registerTab) {
        registerTab.addEventListener('click', function(e) {
            e.preventDefault();
            switchTab('register');
        });
    }
    
    // Adicionar event listener para o link "Criar agora"
    const createAccountLink = document.querySelector('.create-account a');
    if (createAccountLink) {
        createAccountLink.addEventListener('click', function(e) {
            e.preventDefault();
            switchTab('register');
        });
    }
});

// Adicionar animações CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);