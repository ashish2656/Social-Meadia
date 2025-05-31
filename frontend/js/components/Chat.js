class Chat {
  constructor() {
    this.currentUser = JSON.parse(localStorage.getItem('user'));
    this.chats = [];
    this.activeChat = null;
    this.messages = [];
    this.isLoadingMessages = false;
    this.page = 1;
    this.hasMoreMessages = true;
    this.socket = null;
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.isInCall = false;
    this.currentChat = null;
    this.messageForm = document.getElementById('message-form');
    this.messageInput = document.getElementById('message-input');
    this.messagesContainer = document.getElementById('messages-container');
    this.chatList = document.getElementById('chat-list');
    this.emptyState = document.getElementById('empty-chat-state');
    this.activeChatElement = document.getElementById('active-chat');
    this.chatHeader = document.getElementById('chat-header');
    this.newChatBtn = document.getElementById('new-chat-btn');
  }

  async init() {
    if (!auth.isAuthenticated) {
      window.location.href = 'index.html';
      return;
    }

    try {
      await this.setupWebSocket();
      await this.loadChats();
      this.render();
      this.attachEventListeners();
    } catch (error) {
      console.error('Error initializing chat:', error);
    }
  }

  async setupWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    this.socket = new WebSocket(wsUrl);

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'message':
          this.handleNewMessage(data.message);
          break;
        case 'call_request':
          this.handleCallRequest(data);
          break;
        case 'call_accepted':
          this.handleCallAccepted(data);
          break;
        case 'call_rejected':
          this.handleCallRejected(data);
          break;
        case 'call_ended':
          this.handleCallEnded(data);
          break;
        case 'ice_candidate':
          this.handleIceCandidate(data);
          break;
      }
    };

    this.socket.onclose = () => {
      console.log('WebSocket connection closed');
      setTimeout(() => this.setupWebSocket(), 5000);
    };
  }

  async loadChats() {
    try {
      const response = await api.get('/api/chats');
      this.chats = response.data;
      this.renderChatList();
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  }

  async loadMessages(chatId, page = 1) {
    if (this.isLoadingMessages || !this.hasMoreMessages) return;

    try {
      this.isLoadingMessages = true;
      const response = await api.get(`/api/chats/${chatId}/messages?page=${page}&limit=50`);
      const newMessages = response.data;
      
      this.messages = page === 1 
        ? newMessages 
        : [...newMessages, ...this.messages];
      
      this.hasMoreMessages = newMessages.length === 50;
      this.page = page;
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      this.isLoadingMessages = false;
    }
  }

  render() {
    const main = document.querySelector('main');
    
    main.innerHTML = `
      <div class="chat-container">
        <div class="chat-sidebar">
          <div class="p-md">
            <button class="btn btn-primary w-full mb-md" id="newChatBtn">
              <i class="fas fa-plus"></i> New Message
            </button>
            
            <div class="search-box mb-md">
              <input type="text" class="form-input" placeholder="Search chats...">
            </div>
          </div>

          <div class="chat-list">
            ${this.renderChatList()}
          </div>
        </div>

        <div class="chat-main">
          ${this.activeChat ? this.renderActiveChat() : this.renderEmptyState()}
        </div>

        ${this.renderCallInterface()}
      </div>
    `;
  }

  renderChatList() {
    this.chatList.innerHTML = '';
    this.chats.forEach(chat => {
      const chatEl = document.createElement('div');
      chatEl.className = 'chat-item';
      chatEl.innerHTML = `
        <img src="${chat.otherUser.profilePic || 'images/default-profile.png'}" alt="${chat.otherUser.username}">
        <div class="chat-info">
          <h4>${chat.otherUser.username}</h4>
          <p>${chat.lastMessage?.content || 'No messages yet'}</p>
        </div>
      `;
      chatEl.addEventListener('click', () => this.openChat(chat));
      this.chatList.appendChild(chatEl);
    });
  }

  renderActiveChat() {
    return `
      <div class="chat-header">
        <div class="flex items-center gap-md">
          ${this.activeChat.type === 'group' 
            ? `<img src="${this.activeChat.groupPhoto || '/images/default-group.png'}" 
                     alt="${this.activeChat.name}"
                     class="w-10 h-10 rounded-full">`
            : `<img src="${this.getChatPartner(this.activeChat).profilePicture || '/images/default-avatar.jpg'}" 
                     alt="${this.getChatPartner(this.activeChat).username}"
                     class="w-10 h-10 rounded-full">`
          }
          
          <div>
            <h2>${this.activeChat.type === 'group' 
              ? this.activeChat.name 
              : this.getChatPartner(this.activeChat).username}</h2>
            <span class="text-sm text-secondary">
              ${this.activeChat.type === 'group' 
                ? `${this.activeChat.participants.length} members`
                : this.getChatPartner(this.activeChat).isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        <div class="flex gap-md">
          <button class="btn btn-secondary" id="audioCallBtn">
            <i class="fas fa-phone"></i>
          </button>
          <button class="btn btn-secondary" id="videoCallBtn">
            <i class="fas fa-video"></i>
          </button>
          <button class="btn btn-secondary" id="chatInfoBtn">
            <i class="fas fa-info-circle"></i>
          </button>
        </div>
      </div>

      <div class="chat-messages" id="messagesContainer">
        ${this.renderMessages()}
      </div>

      <div class="chat-input">
        <form id="messageForm" class="flex gap-md">
          <button type="button" class="btn btn-secondary" id="attachmentBtn">
            <i class="fas fa-paperclip"></i>
          </button>
          
          <input type="text" class="form-input flex-1" 
                 placeholder="Type a message..." id="messageInput">
          
          <button type="submit" class="btn btn-primary">
            <i class="fas fa-paper-plane"></i>
          </button>
        </form>
      </div>
    `;
  }

  renderEmptyState() {
    return `
      <div class="flex items-center justify-center h-full text-center text-secondary">
        <div>
          <i class="fas fa-comments text-6xl mb-md"></i>
          <h2 class="text-xl mb-sm">Your Messages</h2>
          <p>Send private messages to a friend or group</p>
        </div>
      </div>
    `;
  }

  renderMessages() {
    if (this.messages.length === 0) {
      return `
        <div class="text-center py-xl text-secondary">
          No messages yet
        </div>
      `;
    }

    return this.messages.map(message => `
      <div class="message ${message.sender._id === this.currentUser.id ? 'outgoing' : ''}">
        ${message.sender._id !== this.currentUser.id ? `
          <img src="${message.sender.profilePicture || '/images/default-avatar.jpg'}" 
               alt="${message.sender.username}"
               class="w-8 h-8 rounded-full">
        ` : ''}
        
        <div class="message-content">
          ${this.renderMessageContent(message)}
        </div>
      </div>
    `).join('');
  }

  renderMessageContent(message) {
    switch (message.contentType) {
      case 'text':
        return `<p>${message.content}</p>`;
      case 'image':
        return `
          <img src="${message.fileUrl}" alt="Shared image" 
               class="max-w-full rounded cursor-pointer">
        `;
      case 'video':
        return `
          <video src="${message.fileUrl}" controls class="max-w-full rounded">
            Your browser does not support the video tag.
          </video>
        `;
      case 'file':
        return `
          <div class="file-message">
            <i class="fas fa-file"></i>
            <a href="${message.fileUrl}" target="_blank" class="ml-sm">
              ${message.content}
            </a>
          </div>
        `;
      default:
        return `<p>${message.content}</p>`;
    }
  }

  renderCallInterface() {
    if (!this.isInCall) return '';

    return `
      <div class="call-interface">
        <div class="call-streams">
          <video id="remoteVideo" autoplay playsinline></video>
          <video id="localVideo" autoplay playsinline muted></video>
        </div>

        <div class="call-controls">
          <button class="btn btn-secondary" id="toggleAudioBtn">
            <i class="fas ${this.localStream?.getAudioTracks()[0]?.enabled ? 'fa-microphone' : 'fa-microphone-slash'}"></i>
          </button>
          <button class="btn btn-secondary" id="toggleVideoBtn">
            <i class="fas ${this.localStream?.getVideoTracks()[0]?.enabled ? 'fa-video' : 'fa-video-slash'}"></i>
          </button>
          <button class="btn btn-danger" id="endCallBtn">
            <i class="fas fa-phone-slash"></i>
          </button>
        </div>
      </div>
    `;
  }

  renderLastMessage(message) {
    switch (message.contentType) {
      case 'text':
        return message.content;
      case 'image':
        return '📷 Photo';
      case 'video':
        return '🎥 Video';
      case 'file':
        return '📎 File';
      default:
        return message.content;
    }
  }

  getChatPartner(chat) {
    return chat.participants.find(p => p.user._id !== this.currentUser.id).user;
  }

  formatTime(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  }

  attachEventListeners() {
    // Chat selection
    document.querySelectorAll('.chat-item').forEach(item => {
      item.addEventListener('click', async () => {
        const chatId = item.dataset.chatId;
        this.activeChat = this.chats.find(c => c._id === chatId);
        await this.loadMessages(chatId);
        this.render();
      });
    });

    // Message form
    const messageForm = document.getElementById('messageForm');
    if (messageForm) {
      messageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('messageInput');
        const content = input.value.trim();
        
        if (!content) return;

        try {
          const response = await api.post(`/api/chats/${this.activeChat._id}/messages`, {
            content
          });

          this.messages.push(response.data);
          this.render();
          input.value = '';
        } catch (error) {
          console.error('Error sending message:', error);
        }
      });
    }

    // Attachment button
    const attachmentBtn = document.getElementById('attachmentBtn');
    if (attachmentBtn) {
      attachmentBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,video/*';
        input.multiple = false;
        
        input.onchange = async () => {
          const file = input.files[0];
          if (!file) return;

          const formData = new FormData();
          formData.append('file', file);
          formData.append('contentType', file.type.startsWith('image/') ? 'image' : 'video');

          try {
            const response = await api.post(`/api/chats/${this.activeChat._id}/messages`, formData);
            this.messages.push(response.data);
            this.render();
          } catch (error) {
            console.error('Error uploading file:', error);
          }
        };

        input.click();
      });
    }

    // Infinite scroll for messages
    const messagesContainer = document.getElementById('messagesContainer');
    if (messagesContainer) {
      messagesContainer.addEventListener('scroll', () => {
        if (messagesContainer.scrollTop === 0 && this.hasMoreMessages) {
          this.loadMessages(this.activeChat._id, this.page + 1);
        }
      });
    }

    // Call buttons
    const audioCallBtn = document.getElementById('audioCallBtn');
    const videoCallBtn = document.getElementById('videoCallBtn');

    if (audioCallBtn) {
      audioCallBtn.addEventListener('click', () => this.initiateCall('audio'));
    }

    if (videoCallBtn) {
      videoCallBtn.addEventListener('click', () => this.initiateCall('video'));
    }

    // Call controls
    if (this.isInCall) {
      const toggleAudioBtn = document.getElementById('toggleAudioBtn');
      const toggleVideoBtn = document.getElementById('toggleVideoBtn');
      const endCallBtn = document.getElementById('endCallBtn');

      if (toggleAudioBtn) {
        toggleAudioBtn.addEventListener('click', this.toggleAudio.bind(this));
      }

      if (toggleVideoBtn) {
        toggleVideoBtn.addEventListener('click', this.toggleVideo.bind(this));
      }

      if (endCallBtn) {
        endCallBtn.addEventListener('click', this.endCall.bind(this));
      }
    }

    // New chat button
    if (this.newChatBtn) {
      this.newChatBtn.addEventListener('click', () => this.handleNewChat());
    }
  }

  async initiateCall(type) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video'
      });

      this.localStream = stream;
      this.isInCall = true;
      this.render();

      const localVideo = document.getElementById('localVideo');
      if (localVideo) {
        localVideo.srcObject = stream;
      }

      // Create and configure RTCPeerConnection
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      };

      this.peerConnection = new RTCPeerConnection(configuration);

      // Add local stream tracks to peer connection
      stream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, stream);
      });

      // Handle incoming tracks
      this.peerConnection.ontrack = (event) => {
        this.remoteStream = event.streams[0];
        const remoteVideo = document.getElementById('remoteVideo');
        if (remoteVideo) {
          remoteVideo.srcObject = this.remoteStream;
        }
      };

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.socket.send(JSON.stringify({
            type: 'ice_candidate',
            candidate: event.candidate,
            chatId: this.activeChat._id
          }));
        }
      };

      // Create and send offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // Send call request to server
      const response = await api.post('/api/chats/call', {
        type,
        offer
      });

      const call = response.data;
      console.log('Call initiated:', call);
    } catch (error) {
      console.error('Error initiating call:', error);
      this.endCall();
    }
  }

  async handleCallRequest(data) {
    const accept = confirm(`Incoming ${data.type} call from ${data.caller.username}`);
    
    try {
      if (accept) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: data.type === 'video'
        });

        this.localStream = stream;
        this.isInCall = true;
        this.render();

        const localVideo = document.getElementById('localVideo');
        if (localVideo) {
          localVideo.srcObject = stream;
        }

        // Create and configure RTCPeerConnection
        const configuration = {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }
          ]
        };

        this.peerConnection = new RTCPeerConnection(configuration);

        // Add local stream tracks to peer connection
        stream.getTracks().forEach(track => {
          this.peerConnection.addTrack(track, stream);
        });

        // Handle incoming tracks
        this.peerConnection.ontrack = (event) => {
          this.remoteStream = event.streams[0];
          const remoteVideo = document.getElementById('remoteVideo');
          if (remoteVideo) {
            remoteVideo.srcObject = this.remoteStream;
          }
        };

        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            this.socket.send(JSON.stringify({
              type: 'ice_candidate',
              candidate: event.candidate,
              chatId: this.activeChat._id
            }));
          }
        };

        // Set remote description and create answer
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        // Send call accepted response
        await api.put(`/api/chats/${data.chatId}/call/${data.callId}`, {
          status: 'accepted',
          answer
        });
      } else {
        // Send call rejected response
        await api.put(`/api/chats/${data.chatId}/call/${data.callId}`, {
          status: 'rejected'
        });
      }
    } catch (error) {
      console.error('Error handling call request:', error);
      this.endCall();
    }
  }

  async handleCallAccepted(data) {
    try {
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.answer)
      );
    } catch (error) {
      console.error('Error handling call accepted:', error);
      this.endCall();
    }
  }

  handleCallRejected() {
    alert('Call was rejected');
    this.endCall();
  }

  handleCallEnded() {
    this.endCall();
  }

  async handleIceCandidate(data) {
    try {
      if (this.peerConnection) {
        await this.peerConnection.addIceCandidate(
          new RTCIceCandidate(data.candidate)
        );
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }

  toggleAudio() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this.render();
      }
    }
  }

  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        this.render();
      }
    }
  }

  endCall() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream = null;
    this.isInCall = false;
    this.render();

    // Notify server about call end
    if (this.activeChat) {
      api.post('/api/chats/call/end', {
        chatId: this.activeChat._id
      }).catch(error => {
        console.error('Error ending call:', error);
      });
    }
  }

  handleNewMessage(message) {
    if (this.activeChat && message.chat === this.activeChat._id) {
      this.messages.push(message);
      this.render();
    }
  }

  async openChat(chat) {
    this.currentChat = chat;
    this.emptyState.classList.add('hidden');
    this.activeChatElement.classList.remove('hidden');

    // Update chat header
    this.chatHeader.innerHTML = `
      <div class="chat-user">
        <img src="${chat.otherUser.profilePic || 'images/default-profile.png'}" alt="${chat.otherUser.username}">
        <h3>${chat.otherUser.username}</h3>
      </div>
      <div class="chat-actions">
        <button class="btn btn-circle" id="video-call-btn">
          <i class="fas fa-video"></i>
        </button>
        <button class="btn btn-circle" id="voice-call-btn">
          <i class="fas fa-phone"></i>
        </button>
      </div>
    `;

    // Load messages
    try {
      await this.loadMessages(chat._id);
    } catch (error) {
      console.error('Error loading messages:', error);
    }

    // Add call button listeners
    document.getElementById('video-call-btn').addEventListener('click', () => this.initiateCall('video'));
    document.getElementById('voice-call-btn').addEventListener('click', () => this.initiateCall('audio'));
  }

  async handleNewChat() {
    const username = prompt('Enter username to start a chat:');
    if (!username) return;

    try {
      const response = await api.post('/api/chats', { username });
      this.chats.unshift(response.data);
      this.renderChatList();
      this.openChat(response.data);
    } catch (error) {
      console.error('Error creating chat:', error);
      alert('User not found or chat already exists');
    }
  }
}

// Make Chat globally available
window.Chat = Chat; 