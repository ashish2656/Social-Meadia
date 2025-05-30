document.addEventListener('DOMContentLoaded', () => {
    // Initialize navigation
    const homeLink = document.getElementById('home-link');
    const profileLink = document.getElementById('profile-link');

    homeLink.addEventListener('click', (e) => {
        e.preventDefault();
        feed.loadPosts();
        document.getElementById('feed-container').classList.remove('hidden');
        document.getElementById('profile-container').classList.add('hidden');
        document.getElementById('upload-container').classList.add('hidden');
    });

    profileLink.addEventListener('click', (e) => {
        e.preventDefault();
        profile.loadProfile(auth.currentUser.username);
    });

    // Check authentication status and show appropriate view
    if (auth.isAuthenticated) {
        feed.loadPosts();
    } else {
        auth.showAuth();
    }
}); 