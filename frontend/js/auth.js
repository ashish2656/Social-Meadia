class Auth {
    constructor() {
        this.currentUser = null;
        this.token = localStorage.getItem('token');
        this.isAuthenticated = !!this.token;

        // Get DOM elements
        this.authContainer = document.getElementById('auth-container');
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
            const response = await api.get('/api/users/me');
            this.currentUser = response.data;
            this.isAuthenticated = true;
            this.onAuthStateChange();
        } catch (error) {
            console.error('Error loading user:', error);
            this.logout();
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const form = e.target;
        const errorDiv = form.querySelector('.error-message');
        const email = form.querySelector('input[type="email"]').value;
        const password = form.querySelector('input[type="password"]').value;

        try {
            const { data } = await api.post('/api/auth/login', { email, password });
            this.setSession(data.token);
            this.currentUser = {
                _id: data._id,
                username: data.username,
                email: data.email
            };
            this.isAuthenticated = true;
            this.onAuthStateChange();
            window.location.reload();
        } catch (error) {
            console.error('Login error:', error);
            errorDiv.textContent = error.response?.data?.message || 'Invalid email or password';
            errorDiv.style.display = 'block';
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const form = e.target;
        const username = form.querySelector('input[type="text"]').value;
        const email = form.querySelector('input[type="email"]').value;
        const password = form.querySelector('input[type="password"]').value;
        const fullName = username; // Use username as fullName if not provided

        try {
            const response = await api.post('/api/auth/register', {
                username,
                email,
                password,
                fullName
            });
            this.setSession(response.data.token);
            this.currentUser = response.data.user;
            this.isAuthenticated = true;
            this.onAuthStateChange();
            window.location.reload();
        } catch (error) {
            console.error('Registration error:', error);
            alert('Error creating account. Please try again.');
        }
    }

    handleLogout(e) {
        e.preventDefault();
        this.logout();
        window.location.href = 'index.html';
    }

    setSession(token) {
        localStorage.setItem('token', token);
        this.token = token;
    }

    logout() {
        localStorage.removeItem('token');
        this.token = null;
        this.currentUser = null;
        this.isAuthenticated = false;
        this.onAuthStateChange();
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

const auth = new Auth(); 