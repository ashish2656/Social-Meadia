class Auth {
    constructor() {
        this.token = localStorage.getItem('token');
        this.currentUser = null;
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
            const { data } = await api.get('/api/users/me');
            this.currentUser = data;
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
        errorDiv.style.display = 'none';

        try {
            const formData = new FormData(form);
            const credentials = {
                email: formData.get('email'),
                password: formData.get('password')
            };

            console.log('Login attempt with:', credentials);

            const data = await api.login(credentials);
            console.log('Login response:', data);

            this.currentUser = {
                _id: data._id,
                username: data.username,
                email: data.email
            };
            this.isAuthenticated = true;
            this.onAuthStateChange();

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

            // Debug logging
            console.log('Form data entries:', Object.fromEntries(formData.entries()));
            console.log('Registration data being sent:', JSON.stringify(userData, null, 2));

            const data = await api.register(userData);
            console.log('Registration response:', data);

            this.currentUser = {
                _id: data._id,
                username: data.username,
                email: data.email
            };
            this.isAuthenticated = true;
            this.onAuthStateChange();

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

    handleLogout(e) {
        e.preventDefault();
        this.logout();
        window.location.href = 'index.html';
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

        // Update UI based on auth state
        if (this.isAuthenticated) {
            document.getElementById('feed-container')?.classList.remove('hidden');
            document.getElementById('auth-container')?.classList.add('hidden');
            document.getElementById('nav-items')?.classList.remove('hidden');
        } else {
            document.getElementById('feed-container')?.classList.add('hidden');
            document.getElementById('auth-container')?.classList.remove('hidden');
            document.getElementById('nav-items')?.classList.add('hidden');
        }
    }
}

// Initialize auth
window.auth = new Auth(); 