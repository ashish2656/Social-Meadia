class Profile {
  constructor() {
    this.currentUser = JSON.parse(localStorage.getItem('user'));
    this.profileData = null;
    this.activeTab = 'posts';
    this.isEditing = false;
  }

  async init(username) {
    try {
      // Fetch profile data
      const response = await fetch(`${API_URL}/users/profile/${username}`);
      this.profileData = await response.json();
      
      this.render();
      this.attachEventListeners();
    } catch (error) {
      console.error('Error loading profile:', error);
      // Show error message to user
    }
  }

  render() {
    const isOwnProfile = this.currentUser && this.currentUser.id === this.profileData.id;
    const main = document.querySelector('main');
    
    main.innerHTML = `
      <div class="profile-header">
        <div class="profile-cover">
          <img src="${this.profileData.coverPhoto || '/images/default-cover.jpg'}" alt="Cover photo">
        </div>
        
        <div class="profile-info">
          <img class="profile-avatar" src="${this.profileData.profilePicture || '/images/default-avatar.jpg'}" alt="Profile picture">
          
          <div class="profile-details">
            <div class="flex items-center gap-md">
              <h1>${this.profileData.username}</h1>
              ${isOwnProfile ? `
                <button class="btn btn-secondary" id="editProfileBtn">
                  <i class="fas fa-edit"></i> Edit Profile
                </button>
              ` : `
                <button class="btn ${this.profileData.isFollowing ? 'btn-secondary' : 'btn-primary'}" id="followBtn">
                  ${this.profileData.isFollowing ? 'Following' : 'Follow'}
                </button>
                <button class="btn btn-primary" id="messageBtn">
                  <i class="fas fa-message"></i> Message
                </button>
              `}
            </div>
            
            <div class="profile-stats">
              <div class="stat-item">
                <div class="stat-value">${this.profileData.postsCount}</div>
                <div class="stat-label">Posts</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${this.profileData.followersCount}</div>
                <div class="stat-label">Followers</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${this.profileData.followingCount}</div>
                <div class="stat-label">Following</div>
              </div>
            </div>
            
            <div class="mt-md">
              <h2 class="text-lg font-medium">${this.profileData.fullName}</h2>
              <p class="text-secondary">${this.profileData.bio || ''}</p>
              ${this.profileData.website ? `
                <a href="${this.profileData.website}" target="_blank" class="text-primary">
                  ${this.profileData.website}
                </a>
              ` : ''}
            </div>
          </div>
        </div>
      </div>

      <div class="tabs">
        <div class="tab ${this.activeTab === 'posts' ? 'active' : ''}" data-tab="posts">
          <i class="fas fa-grid"></i> Posts
        </div>
        <div class="tab ${this.activeTab === 'saved' ? 'active' : ''}" data-tab="saved">
          <i class="fas fa-bookmark"></i> Saved
        </div>
        <div class="tab ${this.activeTab === 'tagged' ? 'active' : ''}" data-tab="tagged">
          <i class="fas fa-user-tag"></i> Tagged
        </div>
      </div>

      <div class="posts-grid" id="postsGrid">
        ${this.renderPosts()}
      </div>

      ${this.renderEditProfileModal()}
    `;
  }

  renderPosts() {
    if (!this.profileData.posts || this.profileData.posts.length === 0) {
      return `
        <div class="text-center py-xl">
          <i class="fas fa-camera text-4xl text-secondary"></i>
          <p class="mt-md text-secondary">No posts yet</p>
        </div>
      `;
    }

    return this.profileData.posts.map(post => `
      <div class="post-item" data-post-id="${post._id}">
        <img src="${post.image}" alt="${post.caption || 'Post image'}">
        <div class="post-overlay">
          <div class="post-stat">
            <i class="fas fa-heart"></i>
            ${post.likesCount}
          </div>
          <div class="post-stat">
            <i class="fas fa-comment"></i>
            ${post.commentsCount}
          </div>
        </div>
      </div>
    `).join('');
  }

  renderEditProfileModal() {
    if (!this.isEditing) return '';

    return `
      <div class="modal" id="editProfileModal">
        <div class="modal-content">
          <div class="modal-header">
            <h2>Edit Profile</h2>
            <button class="close-modal">×</button>
          </div>
          
          <form id="editProfileForm" class="modal-body">
            <div class="form-group">
              <label class="form-label">Profile Picture</label>
              <div class="flex items-center gap-md">
                <img src="${this.profileData.profilePicture || '/images/default-avatar.jpg'}" 
                     alt="Current profile picture" 
                     class="w-16 h-16 rounded-full">
                <input type="file" id="profilePicture" accept="image/*">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Cover Photo</label>
              <input type="file" id="coverPhoto" accept="image/*">
            </div>

            <div class="form-group">
              <label class="form-label">Full Name</label>
              <input type="text" class="form-input" id="fullName" 
                     value="${this.profileData.fullName}" required>
            </div>

            <div class="form-group">
              <label class="form-label">Username</label>
              <input type="text" class="form-input" id="username" 
                     value="${this.profileData.username}" required>
            </div>

            <div class="form-group">
              <label class="form-label">Bio</label>
              <textarea class="form-input" id="bio" rows="3">${this.profileData.bio || ''}</textarea>
            </div>

            <div class="form-group">
              <label class="form-label">Website</label>
              <input type="url" class="form-input" id="website" 
                     value="${this.profileData.website || ''}">
            </div>

            <div class="form-group">
              <label class="form-label">Email</label>
              <input type="email" class="form-input" id="email" 
                     value="${this.profileData.email}" required>
            </div>

            <div class="form-group">
              <label class="form-check">
                <input type="checkbox" id="isPrivate" 
                       ${this.profileData.isPrivate ? 'checked' : ''}>
                <span class="ml-sm">Private Account</span>
              </label>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" id="cancelEdit">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.activeTab = tab.dataset.tab;
        this.render();
      });
    });

    // Post click
    document.querySelectorAll('.post-item').forEach(post => {
      post.addEventListener('click', () => {
        // Show post detail modal
        const postId = post.dataset.postId;
        // Implement post detail view
      });
    });

    // Follow/Unfollow
    const followBtn = document.getElementById('followBtn');
    if (followBtn) {
      followBtn.addEventListener('click', async () => {
        try {
          const action = this.profileData.isFollowing ? 'unfollow' : 'follow';
          await fetch(`${API_URL}/users/${action}/${this.profileData.id}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });

          this.profileData.isFollowing = !this.profileData.isFollowing;
          this.profileData.followersCount += this.profileData.isFollowing ? 1 : -1;
          this.render();
        } catch (error) {
          console.error('Error updating follow status:', error);
        }
      });
    }

    // Message
    const messageBtn = document.getElementById('messageBtn');
    if (messageBtn) {
      messageBtn.addEventListener('click', async () => {
        try {
          const response = await fetch(`${API_URL}/chats/individual`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              recipientId: this.profileData.id
            })
          });

          const chat = await response.json();
          // Navigate to chat
          window.location.href = `/chat/${chat._id}`;
        } catch (error) {
          console.error('Error creating chat:', error);
        }
      });
    }

    // Edit Profile
    const editProfileBtn = document.getElementById('editProfileBtn');
    if (editProfileBtn) {
      editProfileBtn.addEventListener('click', () => {
        this.isEditing = true;
        this.render();
      });
    }

    // Edit Profile Form
    const editProfileForm = document.getElementById('editProfileForm');
    if (editProfileForm) {
      editProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
          const formData = new FormData();
          const profilePicture = document.getElementById('profilePicture').files[0];
          const coverPhoto = document.getElementById('coverPhoto').files[0];

          if (profilePicture) formData.append('profilePicture', profilePicture);
          if (coverPhoto) formData.append('coverPhoto', coverPhoto);

          formData.append('fullName', document.getElementById('fullName').value);
          formData.append('username', document.getElementById('username').value);
          formData.append('bio', document.getElementById('bio').value);
          formData.append('website', document.getElementById('website').value);
          formData.append('email', document.getElementById('email').value);
          formData.append('isPrivate', document.getElementById('isPrivate').checked);

          const response = await fetch(`${API_URL}/users/profile`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
          });

          const updatedProfile = await response.json();
          this.profileData = { ...this.profileData, ...updatedProfile };
          this.isEditing = false;
          this.render();
        } catch (error) {
          console.error('Error updating profile:', error);
        }
      });

      // Cancel edit
      const cancelEdit = document.getElementById('cancelEdit');
      if (cancelEdit) {
        cancelEdit.addEventListener('click', () => {
          this.isEditing = false;
          this.render();
        });
      }
    }
  }
}

export default Profile; 