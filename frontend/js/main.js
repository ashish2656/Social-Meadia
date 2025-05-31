document.addEventListener('DOMContentLoaded', () => {
    // Initialize components
    const chat = new Chat();
    
    // Initialize navigation
    const homeLink = document.getElementById('home-link');
    const chatLink = document.getElementById('chat-link');
    const profileLink = document.getElementById('profile-link');
    const uploadLink = document.getElementById('upload-link');

    // Hide all containers
    function hideAllContainers() {
        document.getElementById('feed-container').classList.add('hidden');
        document.getElementById('chat-container').classList.add('hidden');
        document.getElementById('profile-container').classList.add('hidden');
        document.getElementById('upload-container').classList.add('hidden');
    }

    homeLink.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllContainers();
        feed.loadPosts();
        document.getElementById('feed-container').classList.remove('hidden');
    });

    chatLink.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllContainers();
        chat.init();
        document.getElementById('chat-container').classList.remove('hidden');
    });

    profileLink.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllContainers();
        profile.loadProfile(auth.currentUser.username);
        document.getElementById('profile-container').classList.remove('hidden');
    });

    uploadLink.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllContainers();
        document.getElementById('upload-container').classList.remove('hidden');
    });

    // Check authentication status and show appropriate view
    if (auth.isAuthenticated) {
        feed.loadPosts();
        document.getElementById('feed-container').classList.remove('hidden');
    } else {
        auth.showAuth();
    }

    // Initialize WebSocket connection if authenticated
    if (auth.isAuthenticated) {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}/ws?token=${auth.getToken()}`;
        chat.setupWebSocket(wsUrl);
    }
}); 