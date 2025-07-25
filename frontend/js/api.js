// API Configuration
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : 'https://social-media-backend-fnjj.onrender.com';

const UPLOADS_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://social-media-backend-fnjj.onrender.com';

class Api {
    constructor() {
        // Update baseUrl to handle Netlify domain
        this.baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:8000'
            : 'https://social-media-backend-fnjj.onrender.com';

        // Log the API base URL and hostname for debugging
        console.log('API Base URL:', this.baseUrl);
        console.log('Current hostname:', window.location.hostname);
        console.log('Environment:', process.env.NODE_ENV);
        
        this.token = localStorage.getItem('token');
    }

    getHeaders(isFormData = false) {
        const headers = isFormData ? {} : { 'Content-Type': 'application/json' };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    }

    setToken(token) {
        if (!token) {
            this.token = null;
            localStorage.removeItem('token');
            return;
        }
        
        // Validate token format (basic check)
        if (typeof token !== 'string' || !token.trim()) {
            throw new Error('Invalid token format');
        }

        this.token = token;
        localStorage.setItem('token', token);
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('token');
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const isFormData = options.body instanceof FormData;
        const headers = this.getHeaders(isFormData);

        try {
            console.log('Making API request:', {
                url,
                method: options.method || 'GET',
                headers,
                body: options.body ? (isFormData ? '[FormData]' : JSON.parse(options.body)) : undefined
            });

            const response = await fetch(url, {
                ...options,
                headers: {
                    ...headers,
                    ...options.headers
                }
            });

            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    data = { message: text };
                }
            }

            console.log('API Response:', {
                status: response.status,
                statusText: response.statusText,
                data
            });

            if (!response.ok) {
                const error = new Error(data.message || `HTTP error! status: ${response.status}`);
                error.status = response.status;
                error.data = data;
                throw error;
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            if (error.status === 401) {
                this.clearToken();
                // Only redirect for non-auth endpoints
                if (!endpoint.includes('/auth/')) {
                    window.location.href = 'index.html';
                }
            }
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
            body: body instanceof FormData ? body : JSON.stringify(body)
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
            const data = await this.request('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify({
                    username: userData.username,
                    email: userData.email,
                    password: userData.password
                })
            });

            if (!data || !data.token) {
                throw new Error('Invalid response format from register');
            }

            this.setToken(data.token);
            return {
                _id: data._id,
                username: data.username,
                email: data.email
            };
        } catch (error) {
            console.error('Registration API error:', error);
            throw new Error(error.message || 'Registration failed');
        }
    }

    async login(credentials) {
        try {
            const data = await this.request('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify(credentials)
            });
            
            if (!data || !data.token) {
                throw new Error('Invalid response format from login');
            }

            this.setToken(data.token);
            return {
                _id: data._id,
                username: data.username,
                email: data.email
            };
        } catch (error) {
            console.error('Login API error:', error);
            if (error.status === 401) {
                throw new Error('Invalid email or password');
            }
            throw new Error(error.message || 'Login failed');
        }
    }

    async getCurrentUser() {
        try {
            const data = await this.request('/api/users/me');
            return data;
        } catch (error) {
            console.error('Get current user error:', error);
            this.clearToken();
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