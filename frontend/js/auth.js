class Auth {
    constructor() {
        this.token = localStorage.getItem('token');
        this.currentUser = null;
        this.isAuthenticated = !!this.token;

        // Get DOM elements
        this.authContainer = document.getElementById('auth-container');
        this.feedContainer = document.getElementById('feed-container');
        this.navItems = document.getElementById('nav-items');
        this.loginForm = document.getElementById('login-form');
        this.registerForm = document.getElementById('register-form');
        this.showLoginBtn = document.getElementById('show-login');
        this.showRegisterBtn = document.getElementById('show-register');
        this.logoutBtn = document.getElementById('logout-link');

        // Initialize
        this.init();
    }

    init() {
        // Add event listeners
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        if (this.registerForm) {
            this.registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }
        if (this.showLoginBtn) {
            this.showLoginBtn.addEventListener('click', () => this.toggleAuthForms('login'));
        }
        if (this.showRegisterBtn) {
            this.showRegisterBtn.addEventListener('click', () => this.toggleAuthForms('register'));
        }
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', (e) => this.handleLogout(e));
        }

        // Check authentication status
        if (this.isAuthenticated) {
            this.loadUser();
        }
    }

    async loadUser() {
        try {
            const user = await api.getCurrentUser();
            this.setAuthState(true, user);
        } catch (error) {
            console.error('Error loading user:', error);
            this.logout();
        }
    }

    setAuthState(isAuthenticated, user = null) {
        this.isAuthenticated = isAuthenticated;
        this.currentUser = user;
        this.updateUI();
        this.onAuthStateChange();
    }

    updateUI() {
        if (this.isAuthenticated) {
            this.feedContainer?.classList.remove('hidden');
            this.authContainer?.classList.add('hidden');
            this.navItems?.classList.remove('hidden');
        } else {
            this.feedContainer?.classList.add('hidden');
            this.authContainer?.classList.remove('hidden');
            this.navItems?.classList.add('hidden');
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const form = e.target;
        const errorDiv = form.querySelector('.error-message');
        errorDiv.style.display = 'none';

        try {
            const formData = new FormData(form);
            const credentials = {
                email: formData.get('email'),
                password: formData.get('password')
            };

            const user = await api.login(credentials);
            this.setAuthState(true, user);

            // Clear form
            form.reset();

            // Redirect to home page
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Login error:', error);
            errorDiv.textContent = error.message || 'Invalid email or password';
            errorDiv.style.display = 'block';
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const form = e.target;
        const errorDiv = form.querySelector('.error-message');
        errorDiv.style.display = 'none';

        try {
            const formData = new FormData(form);
            const userData = {
                username: formData.get('username'),
                email: formData.get('email'),
                password: formData.get('password')
            };

            const user = await api.register(userData);
            this.setAuthState(true, user);

            // Clear form
            form.reset();

            // Redirect to home page
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Registration error:', error);
            errorDiv.textContent = error.message || 'Error creating account. Please try again.';
            errorDiv.style.display = 'block';
        }
    }

    async handleLogout(e) {
        e.preventDefault();
        await this.logout();
        window.location.href = 'index.html';
    }

    async logout() {
        api.clearToken();
        this.setAuthState(false, null);
    }

    toggleAuthForms(show) {
        const forms = this.authContainer.querySelectorAll('.auth-form');
        forms.forEach(form => {
            form.classList.add('hidden');
        });
        if (show === 'login') {
            forms[0].classList.remove('hidden');
        } else {
            forms[1].classList.remove('hidden');
        }
    }

    showAuth() {
        if (this.authContainer) {
            this.authContainer.classList.remove('hidden');
        }
    }

    onAuthStateChange() {
        const event = new CustomEvent('authStateChange', {
            detail: {
                isAuthenticated: this.isAuthenticated,
                user: this.currentUser
            }
        });
        window.dispatchEvent(event);
    }
}

// Initialize auth
window.auth = new Auth(); 