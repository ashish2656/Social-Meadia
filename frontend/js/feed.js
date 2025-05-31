class Feed {
    constructor() {
        this.posts = [];
        this.container = document.querySelector('.posts');
        this.isLoading = false;
        this.page = 1;
        this.hasMore = true;
    }

    async loadPosts(page = 1) {
        if (this.isLoading || (!this.hasMore && page > 1)) return;

        try {
            this.isLoading = true;
            const response = await api.get(`/api/posts/feed?page=${page}`);
            const newPosts = response.data;

            if (page === 1) {
                this.posts = newPosts;
            } else {
                this.posts = [...this.posts, ...newPosts];
            }

            this.hasMore = newPosts.length === 10; // Assuming 10 posts per page
            this.page = page;
            this.render();
        } catch (error) {
            console.error('Error loading posts:', error);
        } finally {
            this.isLoading = false;
        }
    }

    render() {
        if (!this.container) return;

        if (this.posts.length === 0) {
            this.container.innerHTML = `
                <div class="text-center py-xl">
                    <i class="fas fa-camera text-4xl text-secondary"></i>
                    <p class="mt-md text-secondary">No posts yet</p>
                </div>
            `;
            return;
        }

        this.container.innerHTML = this.posts.map(post => `
            <div class="post">
                <div class="post-header">
                    <img src="${post.user.profilePic || 'images/default-profile.png'}" alt="${post.user.username}">
                    <a href="profile.html?username=${post.user.username}">${post.user.username}</a>
                </div>
                <div class="post-image">
                    <img src="${post.image}" alt="${post.caption || ''}">
                </div>
                <div class="post-actions">
                    <button class="like-button ${post.isLiked ? 'active' : ''}" onclick="feed.handleLike('${post._id}', this)">
                        <i class="fas fa-heart"></i>
                    </button>
                    <button class="comment-button" onclick="feed.showComments('${post._id}')">
                        <i class="fas fa-comment"></i>
                    </button>
                    <button class="share-button">
                        <i class="fas fa-share"></i>
                    </button>
                </div>
                <div class="post-likes">
                    ${post.likesCount} likes
                </div>
                <div class="post-caption">
                    <strong>${post.user.username}</strong> ${post.caption || ''}
                </div>
                <div class="post-comments" id="comments-${post._id}">
                    <!-- Comments will be loaded here -->
                </div>
            </div>
        `).join('');

        // Add infinite scroll
        if (this.hasMore) {
            const observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && !this.isLoading) {
                    this.loadPosts(this.page + 1);
                }
            });

            observer.observe(this.container.lastElementChild);
        }
    }

    async handleLike(postId, button) {
        try {
            const response = await api.post(`/api/posts/${postId}/like`);
            button.classList.toggle('active', response.data.isLiked);
            button.closest('.post').querySelector('.post-likes').textContent = 
                `${response.data.likesCount} likes`;
        } catch (error) {
            console.error('Error liking post:', error);
        }
    }

    async showComments(postId) {
        const commentsContainer = document.getElementById(`comments-${postId}`);
        if (!commentsContainer) return;

        try {
            const response = await api.get(`/api/posts/${postId}/comments`);
            commentsContainer.innerHTML = `
                ${response.data.map(comment => `
                    <div class="comment">
                        <strong>${comment.user.username}</strong> ${comment.content}
                    </div>
                `).join('')}
                <form onsubmit="feed.handleComment(event, '${postId}')" class="comment-form">
                    <input type="text" placeholder="Add a comment..." required>
                    <button type="submit" class="btn btn-primary">Post</button>
                </form>
            `;
        } catch (error) {
            console.error('Error loading comments:', error);
        }
    }

    async handleComment(event, postId) {
        event.preventDefault();
        const form = event.target;
        const input = form.querySelector('input');
        const content = input.value.trim();

        if (!content) return;

        try {
            const response = await api.post(`/api/posts/${postId}/comments`, { content });
            input.value = '';
            this.showComments(postId);
        } catch (error) {
            console.error('Error adding comment:', error);
        }
    }
}

// Initialize feed
window.feed = new Feed(); 