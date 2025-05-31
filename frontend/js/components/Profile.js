class Profile {
  constructor() {
    this.user = null;
    this.posts = [];
    this.currentTab = 'posts';
    this.profileUsername = document.getElementById('profile-username');
    this.profileBio = document.getElementById('profile-bio');
    this.profilePic = document.getElementById('profile-pic');
    this.coverPic = document.getElementById('cover-pic');
    this.postsCount = document.getElementById('posts-count');
    this.followersCount = document.getElementById('followers-count');
    this.followingCount = document.getElementById('following-count');
    this.editProfileBtn = document.getElementById('edit-profile-btn');
    this.postsGrid = document.getElementById('profile-posts');
    this.tabs = document.querySelectorAll('.tab');
  }

  async init(username) {
    if (!auth.isAuthenticated) {
      window.location.href = 'index.html';
      return;
    }

    try {
      // Load user profile
      const response = await api.get(`/api/users/${username}`);
      this.user = response.data;
      this.renderProfile();

      // Load user posts
      await this.loadPosts();

      // Add event listeners
      this.setupEventListeners();
    } catch (error) {
      console.error('Error loading profile:', error);
      window.location.href = 'index.html';
    }
  }

  renderProfile() {
    this.profileUsername.textContent = this.user.username;
    this.profileBio.textContent = this.user.bio || '';
    this.profilePic.src = this.user.profilePic || 'images/default-profile.png';
    this.coverPic.src = this.user.coverPic || 'images/default-cover.jpg';
    this.postsCount.textContent = this.user.postsCount || 0;
    this.followersCount.textContent = this.user.followersCount || 0;
    this.followingCount.textContent = this.user.followingCount || 0;

    // Show/hide edit button based on ownership
    if (this.user._id === auth.currentUser._id) {
      this.editProfileBtn.classList.remove('hidden');
    } else {
      this.editProfileBtn.classList.add('hidden');
      // Show follow button instead
      const followBtn = document.createElement('button');
      followBtn.className = `btn ${this.user.isFollowing ? 'btn-secondary' : 'btn-primary'}`;
      followBtn.textContent = this.user.isFollowing ? 'Following' : 'Follow';
      followBtn.onclick = () => this.handleFollow();
      this.editProfileBtn.parentNode.replaceChild(followBtn, this.editProfileBtn);
    }
  }

  async loadPosts() {
    try {
      const response = await api.get(`/api/users/${this.user.username}/posts`);
      this.posts = response.data;
      this.renderPosts();
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  }

  renderPosts() {
    this.postsGrid.innerHTML = '';
    this.posts.forEach(post => {
      const postEl = document.createElement('div');
      postEl.className = 'post-item';
      postEl.innerHTML = `
        <img src="${post.image}" alt="${post.caption || 'Post image'}">
        <div class="post-overlay">
          <div class="post-stat">
            <i class="fas fa-heart"></i>
            <span>${post.likesCount}</span>
          </div>
          <div class="post-stat">
            <i class="fas fa-comment"></i>
            <span>${post.commentsCount}</span>
          </div>
        </div>
      `;
      postEl.addEventListener('click', () => this.openPost(post));
      this.postsGrid.appendChild(postEl);
    });
  }

  setupEventListeners() {
    // Tab switching
    this.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentTab = tab.dataset.tab;
        this.loadTabContent();
      });
    });

    // Edit profile button
    if (this.editProfileBtn) {
      this.editProfileBtn.addEventListener('click', () => this.handleEditProfile());
    }

    // Profile picture upload
    this.profilePic.addEventListener('click', () => {
      if (this.user._id === auth.currentUser._id) {
        this.handleImageUpload('profile');
      }
    });

    // Cover photo upload
    this.coverPic.addEventListener('click', () => {
      if (this.user._id === auth.currentUser._id) {
        this.handleImageUpload('cover');
      }
    });
  }

  async loadTabContent() {
    switch (this.currentTab) {
      case 'posts':
        await this.loadPosts();
        break;
      case 'saved':
        await this.loadSavedPosts();
        break;
      case 'tagged':
        await this.loadTaggedPosts();
        break;
    }
  }

  async loadSavedPosts() {
    try {
      const response = await api.get('/api/posts/saved');
      this.posts = response.data;
      this.renderPosts();
    } catch (error) {
      console.error('Error loading saved posts:', error);
    }
  }

  async loadTaggedPosts() {
    try {
      const response = await api.get(`/api/users/${this.user.username}/tagged`);
      this.posts = response.data;
      this.renderPosts();
    } catch (error) {
      console.error('Error loading tagged posts:', error);
    }
  }

  async handleFollow() {
    try {
      const response = await api.post(`/api/users/${this.user.username}/follow`);
      this.user.isFollowing = response.data.isFollowing;
      this.user.followersCount = response.data.followersCount;
      this.renderProfile();
    } catch (error) {
      console.error('Error following user:', error);
    }
  }

  handleEditProfile() {
    // Create modal for editing profile
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h2>Edit Profile</h2>
        <form id="edit-profile-form">
          <input type="text" name="username" placeholder="Username" value="${this.user.username}">
          <textarea name="bio" placeholder="Bio">${this.user.bio || ''}</textarea>
          <button type="submit" class="btn btn-primary">Save Changes</button>
          <button type="button" class="btn" onclick="this.parentElement.parentElement.remove()">Cancel</button>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    const form = modal.querySelector('form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      try {
        const response = await api.put('/api/users/profile', {
          username: formData.get('username'),
          bio: formData.get('bio')
        });
        this.user = response.data;
        this.renderProfile();
        modal.remove();
      } catch (error) {
        console.error('Error updating profile:', error);
        alert('Error updating profile');
      }
    });
  }

  handleImageUpload(type) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('image', file);

      try {
        const response = await api.put(`/api/users/${type}-picture`, formData);
        this.user = response.data;
        this.renderProfile();
      } catch (error) {
        console.error(`Error uploading ${type} picture:`, error);
        alert(`Error uploading ${type} picture`);
      }
    };
    input.click();
  }

  openPost(post) {
    // Create modal for viewing post
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="post">
          <div class="post-header">
            <img src="${this.user.profilePic || 'images/default-profile.png'}" alt="${this.user.username}">
            <a href="profile.html?username=${this.user.username}">${this.user.username}</a>
          </div>
          <div class="post-image">
            <img src="${post.image}" alt="${post.caption || ''}">
          </div>
          <div class="post-actions">
            <button class="like-button ${post.isLiked ? 'active' : ''}">
              <i class="fas fa-heart"></i>
            </button>
            <button class="comment-button">
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
            <strong>${this.user.username}</strong> ${post.caption || ''}
          </div>
          <div class="post-comments">
            <!-- Comments will be loaded here -->
          </div>
        </div>
        <button class="btn" onclick="this.parentElement.parentElement.remove()">Close</button>
      </div>
    `;

    document.body.appendChild(modal);

    // Load comments
    this.loadComments(post._id, modal.querySelector('.post-comments'));

    // Add event listeners for like and comment
    const likeBtn = modal.querySelector('.like-button');
    likeBtn.addEventListener('click', () => this.handleLike(post._id, likeBtn));

    const commentBtn = modal.querySelector('.comment-button');
    commentBtn.addEventListener('click', () => {
      const commentInput = document.createElement('input');
      commentInput.type = 'text';
      commentInput.placeholder = 'Add a comment...';
      commentInput.onkeypress = (e) => {
        if (e.key === 'Enter') {
          this.handleComment(post._id, commentInput.value);
          commentInput.value = '';
        }
      };
      modal.querySelector('.post-comments').appendChild(commentInput);
      commentInput.focus();
    });
  }

  async loadComments(postId, container) {
    try {
      const response = await api.get(`/api/posts/${postId}/comments`);
      container.innerHTML = response.data.map(comment => `
        <div class="comment">
          <strong>${comment.user.username}</strong> ${comment.content}
        </div>
      `).join('');
    } catch (error) {
      console.error('Error loading comments:', error);
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

  async handleComment(postId, content) {
    try {
      const response = await api.post(`/api/posts/${postId}/comments`, { content });
      const commentEl = document.createElement('div');
      commentEl.className = 'comment';
      commentEl.innerHTML = `<strong>${auth.currentUser.username}</strong> ${content}`;
      document.querySelector('.post-comments').appendChild(commentEl);
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  }
}

// Make Profile globally available
window.Profile = Profile; 