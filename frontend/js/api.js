// API Configuration
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000/api'
    : 'https://social-media-backend-fnjj.onrender.com/api';

const UPLOADS_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : 'https://social-media-backend-fnjj.onrender.com';

class ApiService {
    constructor() {
        this.token = localStorage.getItem('token');
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('token');
    }

    async request(endpoint, options = {}) {
        const url = `${API_URL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...(this.token && { Authorization: `Bearer ${this.token}` }),
            ...options.headers
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers,
                credentials: 'include',
                mode: 'cors'
            });

            if (!response.ok) {
                const error = await response.json();
                console.error('API Error Response:', error);
                throw new Error(error.message || 'Something went wrong');
            }

            return await response.json();
        } catch (error) {
            console.error('API Request Error:', {
                url,
                method: options.method || 'GET',
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    // Auth endpoints
    async register(userData) {
        return this.request('/users/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async login(credentials) {
        return this.request('/users/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    }

    // Post endpoints
    async getFeed() {
        return this.request('/posts/feed');
    }

    async createPost(formData) {
        const url = `${API_URL}/posts`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.token}`
                },
                body: formData,
                credentials: 'include',
                mode: 'cors'
            });

            if (!response.ok) {
                const error = await response.json();
                console.error('Post Creation Error:', error);
                throw new Error(error.message || 'Error creating post');
            }

            return await response.json();
        } catch (error) {
            console.error('Create Post Error:', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    async likePost(postId) {
        return this.request(`/posts/${postId}/like`, {
            method: 'POST'
        });
    }

    async addComment(postId, text) {
        return this.request(`/posts/${postId}/comment`, {
            method: 'POST',
            body: JSON.stringify({ text })
        });
    }

    async deleteComment(postId, commentId) {
        return this.request(`/posts/${postId}/comment/${commentId}`, {
            method: 'DELETE'
        });
    }

    // User endpoints
    async getProfile(username) {
        return this.request(`/users/profile/${username}`);
    }

    async getUserPosts(userId) {
        return this.request(`/posts/user/${userId}`);
    }

    async followUser(userId) {
        return this.request(`/users/follow/${userId}`, {
            method: 'POST'
        });
    }

    async unfollowUser(userId) {
        return this.request(`/users/unfollow/${userId}`, {
            method: 'POST'
        });
    }
}

const api = new ApiService(); 