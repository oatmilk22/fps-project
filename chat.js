// Modern Game Chat System
class GameChat {
    constructor() {
        this.isVisible = false;
        this.isVoiceEnabled = false;
        this.messages = [];
        this.maxMessages = 50;
        this.setupUI();
        this.setupEventListeners();
    }

    setupUI() {
        // Create main chat container
        this.container = document.createElement('div');
        this.container.id = 'game-chat';
        this.container.className = 'game-chat';
        
        // Create chat header
        const header = document.createElement('div');
        header.className = 'chat-header';
        header.innerHTML = `
            <span class="chat-title">Game Chat</span>
            <div class="chat-controls">
                <button class="voice-btn" title="Toggle Voice Chat (V)">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                        <path fill="currentColor" d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
                        <path fill="currentColor" d="M19 10v1a7 7 0 0 1-14 0v-1h2v1a5 5 0 0 0 10 0v-1h2z"/>
                    </svg>
                </button>
                <button class="close-btn" title="Close Chat (T)">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                        <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                </button>
            </div>
        `;
        
        // Create messages container
        this.messagesContainer = document.createElement('div');
        this.messagesContainer.className = 'chat-messages';
        
        // Create input area
        const inputArea = document.createElement('div');
        inputArea.className = 'chat-input-area';
        inputArea.innerHTML = `
            <input type="text" class="chat-input" placeholder="Type a message..." maxlength="128">
            <div class="chat-actions">
                <span class="char-count">0/128</span>
                <button class="send-btn">Send</button>
            </div>
        `;
        
        // Create chat toggle button
        this.toggleButton = document.createElement('button');
        this.toggleButton.className = 'chat-toggle';
        this.toggleButton.innerHTML = `
            <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
            <span class="unread-badge"></span>
        `;
        
        // Assemble the chat UI
        this.container.appendChild(header);
        this.container.appendChild(this.messagesContainer);
        this.container.appendChild(inputArea);
        document.body.appendChild(this.container);
        document.body.appendChild(this.toggleButton);
        
        // Store references to important elements
        this.input = this.container.querySelector('.chat-input');
        this.charCount = this.container.querySelector('.char-count');
        this.voiceBtn = this.container.querySelector('.voice-btn');
        this.closeBtn = this.container.querySelector('.close-btn');
        this.sendBtn = this.container.querySelector('.send-btn');
        this.unreadBadge = this.toggleButton.querySelector('.unread-badge');
    }

    setupEventListeners() {
        // Toggle chat visibility
        this.toggleButton.addEventListener('click', () => this.toggle());
        this.closeBtn.addEventListener('click', () => this.toggle(false));
        
        // Send message
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        
        // Character count
        this.input.addEventListener('input', () => {
            const count = this.input.value.length;
            this.charCount.textContent = `${count}/128`;
            this.charCount.style.color = count > 100 ? '#ff4444' : '#888';
        });
        
        // Voice chat toggle
        this.voiceBtn.addEventListener('click', () => this.toggleVoice());
        
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 't' && document.activeElement !== this.input) {
                e.preventDefault();
                this.toggle();
            } else if (e.key.toLowerCase() === 'v' && document.activeElement !== this.input) {
                e.preventDefault();
                this.toggleVoice();
            } else if (e.key === 'Escape' && this.isVisible) {
                this.toggle(false);
            }
        });
        
        // Close chat when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isVisible && !this.container.contains(e.target) && e.target !== this.toggleButton) {
                this.toggle(false);
            }
        });

        // Prevent chat from interfering with game controls when not focused
        this.input.addEventListener('focus', () => {
            // Disable game controls while typing
            if (window.controls) {
                window.controls.unlock();
            }
        });

        this.input.addEventListener('blur', () => {
            // Re-enable game controls when done typing
            if (window.controls) {
                window.controls.lock();
            }
        });
    }

    toggle(forceState = null) {
        this.isVisible = forceState !== null ? forceState : !this.isVisible;
        this.container.classList.toggle('visible', this.isVisible);
        
        if (this.isVisible) {
            this.input.focus();
            this.unreadBadge.textContent = '';
            this.unreadBadge.style.display = 'none';
            // Unlock controls when chat is open
            if (window.controls) {
                window.controls.unlock();
            }
        } else {
            // Lock controls when chat is closed
            if (window.controls) {
                window.controls.lock();
            }
        }
    }

    toggleVoice() {
        this.isVoiceEnabled = !this.isVoiceEnabled;
        this.voiceBtn.classList.toggle('active', this.isVoiceEnabled);
        
        if (this.isVoiceEnabled) {
            this.addSystemMessage('Voice chat enabled');
            // Initialize voice chat here
        } else {
            this.addSystemMessage('Voice chat disabled');
            // Disconnect voice chat here
        }
    }

    sendMessage() {
        const message = this.input.value.trim();
        if (message === '') return;
        
        // Add message to chat
        this.addMessage('You', message);
        
        // Clear input
        this.input.value = '';
        this.charCount.textContent = '0/128';
        this.charCount.style.color = '#888';
        
        // Simulate response (for demo)
        if (message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi')) {
            setTimeout(() => {
                this.addMessage('Bot', 'Hello there!');
            }, 1000);
        }
    }

    addMessage(sender, message, isSystem = false) {
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${isSystem ? 'system' : ''}`;
        
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        messageElement.innerHTML = `
            <span class="message-sender">${sender}</span>
            <span class="message-text">${message}</span>
            <span class="message-time">${time}</span>
        `;
        
        this.messagesContainer.appendChild(messageElement);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        
        // Update unread count if chat is closed
        if (!this.isVisible) {
            const unreadCount = parseInt(this.unreadBadge.textContent || '0') + 1;
            this.unreadBadge.textContent = unreadCount;
            this.unreadBadge.style.display = 'flex';
        }
        
        // Store message
        this.messages.push({ sender, message, time, isSystem });
        if (this.messages.length > this.maxMessages) {
            this.messages.shift();
        }
    }

    addSystemMessage(message) {
        this.addMessage('System', message, true);
    }
}

// Initialize chat when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.gameChat = new GameChat();
    window.gameChat.addSystemMessage('Welcome to the game!');
    window.gameChat.addSystemMessage('Press T to toggle chat, V for voice chat');
}); 