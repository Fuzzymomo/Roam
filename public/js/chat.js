/**
 * Chat System
 * Handles chat functionality and UI
 */

const Chat = {
  messages: [],
  currentChannel: 'global',
  whisperTarget: null,
  show: true,
  MAX_MESSAGES: 100,
  
  /**
   * Initialize chat system
   */
  initialize() {
    if (!GameState.loggedIn) {
      document.getElementById('chatContainer').style.display = 'none';
      document.getElementById('chatToggle').style.display = 'none';
      return;
    }
    
    document.getElementById('chatContainer').style.display = 'block';
    document.getElementById('chatToggle').style.display = 'block';
    
    // Chat tab switching
    document.querySelectorAll('.chatTab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.chatTab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentChannel = tab.dataset.channel;
        
        if (this.currentChannel !== 'whisper') {
          this.whisperTarget = null;
          document.getElementById('chatInputField').placeholder = `Type a message... (Press Enter to send)`;
        } else {
          document.getElementById('chatInputField').placeholder = `Type: /whisper [player] [message] or click player name`;
        }
      });
    });
    
    // Chat send button
    document.getElementById('chatSendBtn').addEventListener('click', () => this.sendMessage());
    
    // Chat input Enter key
    document.getElementById('chatInputField').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.sendMessage();
      }
    });
    
    // Chat toggle button
    document.getElementById('chatToggle').addEventListener('click', () => {
      this.show = !this.show;
      document.getElementById('chatContainer').style.display = this.show ? 'block' : 'none';
    });
    
    this.addMessage('Welcome to MetaRoam! Type /help for commands.', 'system', 'System');
  },
  
  /**
   * Send chat message
   */
  sendMessage() {
    const input = document.getElementById('chatInputField');
    const message = input.value.trim();
    
    if (!message || !GameState.socket || GameState.socket.readyState !== WebSocket.OPEN) return;
    
    // Handle commands
    if (message.startsWith('/')) {
      const parts = message.split(' ');
      const command = parts[0].toLowerCase();
      
      if (command === '/whisper' || command === '/w') {
        if (parts.length < 3) {
          this.addMessage('Usage: /whisper [player] [message]', 'system', 'System');
          input.value = '';
          return;
        }
        const target = parts[1];
        const whisperMsg = parts.slice(2).join(' ');
        
        GameState.socket.send(JSON.stringify({
          type: 'chat',
          channel: 'whisper',
          message: whisperMsg,
          target: target
        }));
        
        this.addMessage(`[To ${target}]: ${whisperMsg}`, 'whisper', GameState.player.username);
      } else if (command === '/help') {
        this.addMessage('Commands: /whisper [player] [message] or /w [player] [message]', 'system', 'System');
      } else {
        this.addMessage('Unknown command. Type /help for help.', 'system', 'System');
      }
      
      input.value = '';
      return;
    }
    
    // Send regular chat message
    GameState.socket.send(JSON.stringify({
      type: 'chat',
      channel: this.currentChannel,
      message: message,
      target: this.whisperTarget
    }));
    
    input.value = '';
    
    if (this.currentChannel === 'whisper') {
      this.whisperTarget = null;
    }
  },
  
  /**
   * Add message to chat
   */
  addMessage(message, channel, sender = null) {
    const chatData = {
      message: message,
      channel: channel,
      sender: sender,
      timestamp: Date.now()
    };
    
    this.messages.push(chatData);
    
    if (this.messages.length > this.MAX_MESSAGES) {
      this.messages.shift();
    }
    
    this.updateDisplay();
    
    const chatMessagesDiv = document.getElementById('chatMessages');
    if (chatMessagesDiv) {
      chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
    }
  },
  
  /**
   * Update chat display
   */
  updateDisplay() {
    const chatMessagesDiv = document.getElementById('chatMessages');
    if (!chatMessagesDiv) return;
    
    chatMessagesDiv.innerHTML = '';
    
    this.messages.forEach(msg => {
      const msgDiv = document.createElement('div');
      msgDiv.className = `chatMessage ${msg.channel}`;
      
      let displayText = '';
      if (msg.channel === 'system') {
        displayText = msg.message;
      } else if (msg.sender) {
        if (msg.channel === 'whisper') {
          displayText = `<span class="sender whisper">[${msg.sender}]</span>: ${msg.message}`;
        } else {
          displayText = `<span class="sender ${msg.channel}">${msg.sender}</span>: ${msg.message}`;
        }
      } else {
        displayText = msg.message;
      }
      
      msgDiv.innerHTML = displayText;
      chatMessagesDiv.appendChild(msgDiv);
    });
  },
  
  /**
   * Draw floating chat messages above player heads
   */
  drawFloatingMessages() {
    const recentLocalMessages = this.messages
      .filter(msg => msg.channel === 'local' && msg.sender && Date.now() - msg.timestamp < 5000)
      .slice(-10);
    
    GameState.otherPlayers.forEach(other => {
      const recentMsg = recentLocalMessages.find(m => m.sender === other.username);
      if (recentMsg) {
        const screenPos = Camera.worldToScreen(other.x, other.y);
        const timeSince = Date.now() - recentMsg.timestamp;
        const alpha = map(timeSince, 0, 5000, 255, 0);
        
        fill(255, 255, 255, alpha);
        textAlign(CENTER);
        textSize(10);
        text(recentMsg.message, screenPos.x, screenPos.y - 40);
      }
    });
  }
};
