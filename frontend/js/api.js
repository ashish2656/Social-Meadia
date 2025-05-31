// API Configuration
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://social-media-backend-fnjj.onrender.com';

const UPLOADS_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://social-media-backend-fnjj.onrender.com';

class Api {
    constructor() {
        this.baseUrl = API_URL;
        this.token = localStorage.getItem('token');
    }

    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': this.token ? `Bearer ${this.token}` : ''
        };
    }

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = this.getHeaders();

        try {
            // Debug request
            console.log('Making API request:', {
                url,
                method: options.method || 'GET',
                headers,
                body: options.body ? JSON.parse(options.body) : undefined
            });

            const response = await fetch(url, {
                ...options,
                headers: {
                    ...headers,
                    ...options.headers
                }
            });

            const data = await response.json();
            
            // Debug response
            console.log('API Response:', {
                status: response.status,
                statusText: response.statusText,
                data
            });

            if (!response.ok) {
                if (response.status === 401) {
                    this.setToken(null);
                    window.location.href = 'index.html';
                    return;
                }
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return { data };
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // GET request
    async get(endpoint) {
        return this.request(endpoint, {
            method: 'GET'
        });
    }

    // POST request
    async post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: body instanceof FormData ? body : JSON.stringify(body)
        });
    }

    // PUT request
    async put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: body instanceof FormData ? body : JSON.stringify(body),
            headers: body instanceof FormData ? {} : undefined
        });
    }

    // DELETE request
    async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    }

    // Auth endpoints
    async register(userData) {
        try {
            const { data } = await this.post('/api/auth/register', {
                username: userData.username,
                email: userData.email,
                password: userData.password
            });
            this.setToken(data.token);
            return data;
        } catch (error) {
            console.error('Registration API error:', error);
            throw error;
        }
    }

    async login(credentials) {
        try {
            const { data } = await this.post('/api/auth/login', credentials);
            this.setToken(data.token);
            return data;
        } catch (error) {
            console.error('Login API error:', error);
            throw error;
        }
    }

    // Post endpoints
    async getFeed() {
        return this.get('/posts/feed');
    }

    async createPost(formData) {
        const url = `${API_URL}/posts`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
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

    // Chat endpoints
    async getChats() {
        return this.request('/chats');
    }

    async createIndividualChat(recipientId) {
        return this.request('/chats/individual', {
            method: 'POST',
            body: JSON.stringify({ recipientId })
        });
    }

    async createGroupChat(name, participantIds) {
        return this.request('/chats/group', {
            method: 'POST',
            body: JSON.stringify({ name, participantIds })
        });
    }

    async getChatMessages(chatId, page = 1) {
        return this.request(`/chats/${chatId}/messages?page=${page}`);
    }

    async sendMessage(chatId, content, file = null) {
        if (file) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('content', content);
            
            const url = `${API_URL}/chats/${chatId}/messages`;
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
                throw new Error(error.message || 'Error sending message');
            }

            return await response.json();
        }

        return this.request(`/chats/${chatId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ content })
        });
    }

    async markMessagesAsRead(chatId, messageIds) {
        return this.request(`/chats/${chatId}/read`, {
            method: 'POST',
            body: JSON.stringify({ messageIds })
        });
    }

    async initiateCall(chatId, type) {
        return this.request(`/chats/${chatId}/call`, {
            method: 'POST',
            body: JSON.stringify({ type })
        });
    }

    async updateCallStatus(chatId, callId, status) {
        return this.request(`/chats/${chatId}/call/${callId}`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
    }
}

// Create a global instance
window.api = new Api(); 