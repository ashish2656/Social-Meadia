class Feed {
    constructor() {
        this.postsContainer = document.querySelector('.posts');
    }

    async loadPosts() {
        try {
            const posts = await api.getFeed();
            this.renderPosts(posts);
        } catch (error) {
            console.error('Error loading feed:', error);
            alert('Error loading feed. Please try again later.');
        }
    }

    renderPosts(posts) {
        this.postsContainer.innerHTML = posts.map(post => this.createPostHTML(post)).join('');
        this.bindPostEvents();
    }

    createPostHTML(post) {
        const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:8000'
            : 'https://social-media-backend-fnjj.onrender.com';

        return `
            <div class="post" data-post-id="${post._id}">
                <div class="post-header">
                    <img src="${post.user.profilePicture || 'images/default-profile.png'}" alt="${post.user.username}">
                    <a href="#" class="profile-link" data-username="${post.user.username}">${post.user.username}</a>
                </div>
                <div class="post-image">
                    <img src="${baseUrl}/uploads/${post.image}" alt="Post">
                </div>
                <div class="post-actions">
                    <button class="like-button ${post.likes.includes(auth.currentUser._id) ? 'liked' : ''}">
                        <i class="fas ${post.likes.includes(auth.currentUser._id) ? 'fa-heart' : 'fa-heart-o'}"></i>
                    </button>
                    <button class="comment-button">
                        <i class="far fa-comment"></i>
                    </button>
                </div>
                <div class="post-likes">
                    ${post.likes.length} likes
                </div>
                <div class="post-caption">
                    <strong>${post.user.username}</strong> ${post.caption}
                </div>
                <div class="post-comments">
                    ${this.renderComments(post.comments)}
                    <form class="comment-form">
                        <input type="text" placeholder="Add a comment..." required>
                        <button type="submit">Post</button>
                    </form>
                </div>
            </div>
        `;
    }

    renderComments(comments) {
        return comments.map(comment => `
            <div class="comment" data-comment-id="${comment._id}">
                <strong>${comment.user.username}</strong> ${comment.text}
                ${comment.user._id === auth.currentUser._id ? 
                    `<button class="delete-comment">×</button>` : 
                    ''}
            </div>
        `).join('');
    }

    bindPostEvents() {
        // Like buttons
        this.postsContainer.querySelectorAll('.like-button').forEach(button => {
            button.addEventListener('click', async (e) => {
                const postId = e.target.closest('.post').dataset.postId;
                try {
                    await api.likePost(postId);
                    const isLiked = button.classList.toggle('liked');
                    button.querySelector('i').classList.toggle('fa-heart-o', !isLiked);
                    button.querySelector('i').classList.toggle('fa-heart', isLiked);
                    
                    const likesElement = button.closest('.post').querySelector('.post-likes');
                    const currentLikes = parseInt(likesElement.textContent);
                    likesElement.textContent = `${isLiked ? currentLikes + 1 : currentLikes - 1} likes`;
                } catch (error) {
                    alert('Error updating like. Please try again.');
                }
            });
        });

        // Comment forms
        this.postsContainer.querySelectorAll('.comment-form').forEach(form => {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const postId = e.target.closest('.post').dataset.postId;
                const input = e.target.querySelector('input');
                const text = input.value;

                try {
                    const comment = await api.addComment(postId, text);
                    const commentsContainer = e.target.closest('.post-comments');
                    const commentHTML = this.renderComments([comment]);
                    commentsContainer.insertAdjacentHTML('beforeend', commentHTML);
                    input.value = '';
                } catch (error) {
                    alert('Error adding comment. Please try again.');
                }
            });
        });

        // Delete comment buttons
        this.postsContainer.querySelectorAll('.delete-comment').forEach(button => {
            button.addEventListener('click', async (e) => {
                const postId = e.target.closest('.post').dataset.postId;
                const commentId = e.target.closest('.comment').dataset.commentId;

                try {
                    await api.deleteComment(postId, commentId);
                    e.target.closest('.comment').remove();
                } catch (error) {
                    alert('Error deleting comment. Please try again.');
                }
            });
        });

        // Profile links
        this.postsContainer.querySelectorAll('.profile-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const username = link.dataset.username;
                profile.loadProfile(username);
            });
        });
    }
}

const feed = new Feed(); 