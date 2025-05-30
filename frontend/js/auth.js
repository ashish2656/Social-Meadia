class Auth {
    constructor() {
        this.isAuthenticated = !!localStorage.getItem('token');
        this.currentUser = JSON.parse(localStorage.getItem('user'));
        this.bindEvents();
    }

    bindEvents() {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const showRegisterLink = document.getElementById('show-register');
        const showLoginLink = document.getElementById('show-login');
        const logoutLink = document.getElementById('logout-link');

        loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        showRegisterLink.addEventListener('click', () => this.toggleAuthForms());
        showLoginLink.addEventListener('click', () => this.toggleAuthForms());
        logoutLink.addEventListener('click', () => this.handleLogout());
    }

    async handleLogin(e) {
        e.preventDefault();
        const form = e.target;
        const email = form.querySelector('input[type="email"]').value;
        const password = form.querySelector('input[type="password"]').value;

        try {
            const response = await api.login({ email, password });
            this.setCurrentUser(response);
            this.showFeed();
        } catch (error) {
            alert(error.message);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const form = e.target;
        const username = form.querySelector('input[type="text"]').value;
        const email = form.querySelector('input[type="email"]').value;
        const password = form.querySelector('input[type="password"]').value;

        try {
            const response = await api.register({ username, email, password });
            this.setCurrentUser(response);
            this.showFeed();
        } catch (error) {
            alert(error.message);
        }
    }

    handleLogout() {
        api.clearToken();
        localStorage.removeItem('user');
        this.isAuthenticated = false;
        this.currentUser = null;
        this.showAuth();
    }

    setCurrentUser(userData) {
        this.currentUser = userData;
        this.isAuthenticated = true;
        localStorage.setItem('user', JSON.stringify(userData));
        api.setToken(userData.token);
    }

    toggleAuthForms() {
        const authForms = document.querySelectorAll('.auth-form');
        authForms.forEach(form => form.classList.toggle('hidden'));
    }

    showAuth() {
        document.getElementById('auth-container').classList.remove('hidden');
        document.getElementById('feed-container').classList.add('hidden');
        document.getElementById('profile-container').classList.add('hidden');
        document.getElementById('upload-container').classList.add('hidden');
        document.getElementById('nav-items').classList.add('hidden');
    }

    showFeed() {
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('feed-container').classList.remove('hidden');
        document.getElementById('nav-items').classList.remove('hidden');
        feed.loadPosts();
    }
}

const auth = new Auth(); 