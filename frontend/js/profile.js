class Profile {
    constructor() {
        this.profileContainer = document.getElementById('profile-container');
        this.profileUsername = document.getElementById('profile-username');
        this.profilePic = document.getElementById('profile-pic');
        this.postsCount = document.getElementById('posts-count');
        this.followersCount = document.getElementById('followers-count');
        this.followingCount = document.getElementById('following-count');
        this.profileBio = document.getElementById('profile-bio');
        this.profilePosts = document.querySelector('.profile-posts');
    }

    async loadProfile(username) {
        try {
            const userData = await api.getProfile(username);
            const posts = await api.getUserPosts(userData._id);
            this.renderProfile(userData, posts);
            this.showProfile();
        } catch (error) {
            console.error('Error loading profile:', error);
            alert('Error loading profile. Please try again later.');
        }
    }

    renderProfile(userData, posts) {
        this.profileUsername.textContent = userData.username;
        this.profilePic.src = userData.profilePicture;
        this.postsCount.textContent = `${posts.length} posts`;
        this.followersCount.textContent = `${userData.followers.length} followers`;
        this.followingCount.textContent = `${userData.following.length} following`;
        this.profileBio.textContent = userData.bio || '';

        // Add follow/unfollow button if not viewing own profile
        if (userData._id !== auth.currentUser._id) {
            const isFollowing = userData.followers.includes(auth.currentUser._id);
            const followButton = document.createElement('button');
            followButton.id = 'follow-button';
            followButton.textContent = isFollowing ? 'Unfollow' : 'Follow';
            followButton.classList.add('follow-button', isFollowing ? 'following' : '');
            followButton.addEventListener('click', () => this.handleFollowClick(userData._id, followButton));
            this.profileUsername.parentNode.insertBefore(followButton, this.profileUsername.nextSibling);
        }

        this.renderProfilePosts(posts);
    }

    renderProfilePosts(posts) {
        const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:8000'
            : 'https://social-media-backend-fnjj.onrender.com';

        this.profilePosts.innerHTML = posts.map(post => `
            <div class="profile-post" data-post-id="${post._id}">
                <img src="${baseUrl}/uploads/${post.image}" alt="Post">
                <div class="profile-post-overlay">
                    <div class="profile-post-stats">
                        <span><i class="fas fa-heart"></i> ${post.likes.length}</span>
                        <span><i class="fas fa-comment"></i> ${post.comments.length}</span>
                    </div>
                </div>
            </div>
        `).join('');

        this.bindProfilePostEvents();
    }

    async handleFollowClick(userId, button) {
        try {
            const isFollowing = button.classList.contains('following');
            if (isFollowing) {
                await api.unfollowUser(userId);
                button.textContent = 'Follow';
                button.classList.remove('following');
            } else {
                await api.followUser(userId);
                button.textContent = 'Unfollow';
                button.classList.add('following');
            }

            // Update followers count
            const currentCount = parseInt(this.followersCount.textContent);
            this.followersCount.textContent = `${isFollowing ? currentCount - 1 : currentCount + 1} followers`;
        } catch (error) {
            alert('Error updating follow status. Please try again.');
        }
    }

    bindProfilePostEvents() {
        this.profilePosts.querySelectorAll('.profile-post').forEach(post => {
            post.addEventListener('click', () => {
                // TODO: Show post detail modal
                console.log('Show post detail:', post.dataset.postId);
            });
        });
    }

    showProfile() {
        document.getElementById('feed-container').classList.add('hidden');
        document.getElementById('upload-container').classList.add('hidden');
        this.profileContainer.classList.remove('hidden');
    }
}

const profile = new Profile(); 