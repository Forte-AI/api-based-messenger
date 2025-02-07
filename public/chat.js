'use strict';

// Check that the chat page has the necessary data; if not, redirect.
document.addEventListener('DOMContentLoaded', async (event) => {
  const roomUUID = localStorage.getItem('askhandleRoomUUID');
  const formSubmitted = localStorage.getItem('formSubmitted');
  if (!formSubmitted || !roomUUID) {
    // If required data isn’t present, redirect to a 404 or error page.
    window.location.href = '/404.html';
    return;
  }

  // Cache frequently used elements.
  const sendButton = document.getElementById('send-button'); 
  const messageInput = document.getElementById('message-input');
  const chatBody = document.getElementById('chat-body');
  const chatContainer = document.getElementById('chat-container');
  const heroTitleBlock = document.querySelector('.chat__title-wrapper');
  const questionsContainer = document.querySelector('.chat__questions');
  const heroTitleActiveChat = document.querySelector('.chat__title-active');
  const chatInputBlock = document.getElementById('chat-input'); // the input block container

  let shouldContinueTyping = true;

  // (Optional) Sanitizes input to prevent XSS attacks
  function sanitizeInput(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }

  function adjustTextareaHeight(input) {
    input.style.height = 'auto';
    const maxHeight = parseInt(getComputedStyle(input).lineHeight, 10) * 3;
    input.style.height = `${Math.min(input.scrollHeight, maxHeight)}px`;
  }

  // Append a user message to the chat
  function appendUserMessage(message) {
    heroTitleBlock.style.display = 'none';
    heroTitleActiveChat.style.display = 'flex';
    questionsContainer.style.display = 'none';
    
    const userMessageElement = document.createElement('div');
    userMessageElement.className = 'chat__user-message';
    
    const userTextElement = document.createElement('div');
    userTextElement.className = 'chat__user-text';
    userTextElement.textContent = message;
    
    userMessageElement.appendChild(userTextElement);
    chatBody.appendChild(userMessageElement);
    
    setTimeout(() => {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 0);
  }

  // Simulate typing effect for bot messages with HTML rendering
  function simulateTypingEffect(element, markdownContent, callback) {
    let index = 0;
    const typingSpeed = 50;
    const htmlContent = DOMPurify.sanitize(marked.parse(markdownContent));
    const tempElement = document.createElement('div');
    tempElement.innerHTML = htmlContent;
    const words = tempElement.innerText.split(/\s+/);

    if (element.dataset.typingIntervalId) {
      clearInterval(element.dataset.typingIntervalId);
    }

    element.textContent = '';

    element.dataset.typingIntervalId = setInterval(() => {
      if (index < words.length) {
        element.textContent += words[index] + "\u00A0";
        index++;
        chatContainer.scrollTop = chatContainer.scrollHeight;
      } else {
        clearInterval(element.dataset.typingIntervalId);
        element.innerHTML = htmlContent;
        if (callback) callback();
        showFeedbackButtons();
      }
    }, typingSpeed);
  }

  function showFeedbackButtons() {
    const lastBotMessage = chatBody.querySelector('.chat__bot-message:last-child');
    if (lastBotMessage) {
      const thumbsUpButton = lastBotMessage.querySelector('.thumbs-up-btn');
      const thumbsDownButton = lastBotMessage.querySelector('.thumbs-down-btn');
      if (thumbsUpButton && thumbsDownButton) {
        thumbsUpButton.style.display = 'block';
        thumbsDownButton.style.display = 'block';
      }
    }
  }

  function hideFeedbackButtons() {
    const lastBotMessage = chatBody.querySelector('.chat__bot-message:last-child');
    if (lastBotMessage) {
      const thumbsUpButton = lastBotMessage.querySelector('.thumbs-up-btn');
      const thumbsDownButton = lastBotMessage.querySelector('.thumbs-down-btn');
      if (thumbsUpButton && thumbsDownButton) {
        thumbsUpButton.style.display = 'none';
        thumbsDownButton.style.display = 'none';
      }
    }
  }

  /**
   * Recursively polls AskHandle for the support_answer.
   *
   * @param {string} messageUuid - The UUID of the sent message.
   * @param {string} token - The AskHandle API token.
   * @param {number} retries - The current retry count.
   * @param {number} maxRetries - The maximum number of retries.
   * @returns {Promise<string|null>} - The support_answer if available, or null.
   */
  async function pollForAnswer(messageUuid, token, retries, maxRetries) {
    if (retries >= maxRetries) return null;
    
    try {
      const pollResponse = await fetch(
        `https://dashboard.askhandle.com/api/v1/messages/${messageUuid}/`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Token ${token}`,
          },
          cache: 'no-store'
        }
      );
      if (pollResponse.ok) {
        const data = await pollResponse.json();
        if (data.support_answer && data.support_answer.trim() !== "") {
          return data.support_answer;
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
    
    // Wait 1 second, then retry.
    await new Promise(resolve => setTimeout(resolve, 1000));
    return pollForAnswer(messageUuid, token, retries + 1, maxRetries);
  }

  // Sends the message to the server and displays the AI response.
  async function sendMessage(message, existingBotMessageElement = null) {
    shouldContinueTyping = true;
    sendButton.innerHTML = 'Stop <img src="/images/stop.svg" alt="" />';
    const botMessageContainer = existingBotMessageElement || createBotMessageStructure();
    botMessageContainer.dataset.userMessage = message;
    chatBody.appendChild(botMessageContainer);

    const loadingSvg = botMessageContainer.querySelector('.chat__bot-reply svg');
    const botTextElement = botMessageContainer.querySelector('.chat__bot-text');
    loadingSvg.style.visibility = 'visible';

    try {
      const apiUrl = '/api/sendMessage';
      const room = localStorage.getItem('askhandleRoomUUID');
      const nickname = localStorage.getItem('nickname');
      const email = localStorage.getItem('email');
      const phone = localStorage.getItem('phone');

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          room,
          nickname,
          email,
          phone_number: phone  // Send as phone_number per AskHandle’s expected structure.
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      loadingSvg.style.visibility = 'hidden';

      let answer = data.support_answer;
      // If the answer is not ready, use recursive polling (up to 10 retries).
      if (!answer || answer.trim() === "") {
        // Note: For security, the token is kept on the server.
        const token = ''; // You could pass a temporary token here if needed.
        answer = await pollForAnswer(data.uuid, token, 0, 10);
      }

      const replyText = answer || 'No response received.';
      const parsedHtml = DOMPurify.sanitize(marked.parse(replyText));

      simulateTypingEffect(botTextElement, parsedHtml, () => {
        sendButton.innerHTML = 'Send <img src="/images/buttons-send.svg" alt="" />';
        if (data.response && data.response.citations) {
          const citationsElement = botMessageContainer.querySelector('.chat__bot-citations');
          citationsElement.textContent = data.response.citations;
          citationsElement.style.display = 'block';
        }
        chatContainer.scrollTop = chatContainer.scrollHeight;
      });
    } catch (error) {
      console.error('Fetch error:', error);
      botTextElement.textContent =
        'There was a problem processing your request. Please try again in a few seconds.';
      loadingSvg.style.visibility = 'hidden';
      chatContainer.scrollTop = chatContainer.scrollHeight;
      sendButton.innerHTML = 'Send <img src="/images/buttons-send.svg" alt="" />';
    }
  }

  function refreshTyping(botMessageElement) {
    const userMessage = botMessageElement.dataset.userMessage;
    const botTextElement = botMessageElement.querySelector('.chat__bot-text');
    const loadingSvg = botMessageElement.querySelector('.chat__bot-reply svg');
    hideFeedbackButtons();
    loadingSvg.style.visibility = 'visible';
    botTextElement.textContent = '';
    sendMessage(userMessage, botMessageElement);
    shouldContinueTyping = true;
  }

  function copyText(botMessageElement) {
    const text = botMessageElement.querySelector('.chat__bot-text').textContent;
    navigator.clipboard.writeText(text);
  }

  function deleteMessage(botMessageElement) {
    botMessageElement.remove();
  }

  function thumbsUp() { console.log('Thumbs up!'); }
  function thumbsDown() { console.log('Thumbs down!'); }

  // Creates a bot message structure.
  function createBotMessageStructure() {
    const botMessageElement = document.createElement('div');
    botMessageElement.className = 'chat__bot-message';
    const botReplyElement = document.createElement('div');
    botReplyElement.className = 'chat__bot-reply';
    botReplyElement.innerHTML = `
      <svg width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Describe the image here">
        <path d="M12 2.90918V6.90918M12 18.9092V22.9092M6 12.9092H2M22 12.9092H18M19.0784 19.9876L16.25 17.1592M19.0784 5.90912L16.25 8.73755M4.92157 19.9876L7.75 17.1592M4.92157 5.90912L7.75 8.73755" stroke="#344054" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <pre class="chat__bot-text"></pre>
      <div class="chat__bot-citations" style="display: none;"></div>
    `;
    const botFuncElement = document.createElement('div');
    botFuncElement.className = 'chat__bot-func';
    botFuncElement.innerHTML = `
      <img class="chat__bot-logo" src="/images/logo-text.svg" alt="AskHandle logo" />
      <div class="chat__bot-func-buttons">
        <button class="copy-btn"><img src="/images/clipboard.svg" alt="Clipboard" /></button>
        <button class="delete-btn"><img src="/images/trash.svg" alt="Delete" /></button>
        <button class="refresh-btn"><img src="/images/refresh.svg" alt="Refresh" /></button>
      </div>
    `;
    botFuncElement.querySelector('.copy-btn').addEventListener('click', () => copyText(botMessageElement));
    botFuncElement.querySelector('.delete-btn').addEventListener('click', () => deleteMessage(botMessageElement));
    botFuncElement.querySelector('.refresh-btn').addEventListener('click', () => { refreshTyping(botMessageElement); });
    botMessageElement.appendChild(botReplyElement);
    botMessageElement.appendChild(botFuncElement);
    return botMessageElement;
  }

  // Generates question buttons from an array.
  function generateQuestionButtons(questions) {
    questionsContainer.innerHTML = '';
    questions.forEach((question) => {
      const button = document.createElement('div');
      button.className = 'chat__questions-btn';
      button.textContent = question;
      button.addEventListener('click', () => {
        messageInput.value = question;
      });
      questionsContainer.appendChild(button);
    });
  }

  function openModal() {
    const modalContainer = document.querySelector('.chat__modal-container');
    modalContainer.classList.add('show');
  }

  function closeModal() {
    const modalContainer = document.querySelector('.chat__modal-container');
    modalContainer.classList.remove('show');
  }

  function closeChat() {
    document.body.classList.add('fade-out');
    document.body.addEventListener('animationend', () => {
      document.body.style.display = 'none';
      localStorage.removeItem('formSubmitted');
      window.location.href = '/';
    }, { once: true });
  }

  // Display greeting message if available.
  const greeting = localStorage.getItem('greeting_message');
  if (greeting && greeting.trim() !== '') {
    // If greeting exists, display it.
    const botMessageContainer = createBotMessageStructure();
    const botTextElement = botMessageContainer.querySelector('.chat__bot-text');
    botTextElement.textContent = greeting;
    chatBody.appendChild(botMessageContainer);
    // Ensure the chat input is visible.
    chatInputBlock.style.display = 'flex';
  } else {
    // Hide the chat input flex if there is no greeting.
    chatInputBlock.style.display = 'none';
  }

  // Fetch default questions.
  try {
    const response = await fetch('/api/defaultQuestions');
    if (!response.ok) throw new Error('Failed to load default questions');
    const data = await response.json();
    generateQuestionButtons(data.questions);
  } catch (error) {
    console.error('Error fetching default questions:', error);
  }

  messageInput.addEventListener('input', () => {
    adjustTextareaHeight(messageInput);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  });

  sendButton.addEventListener('click', () => {
    if (sendButton.innerHTML.includes('Stop')) {
      shouldContinueTyping = false;
      sendButton.innerHTML = 'Send <img src="/images/buttons-send.svg" alt="" />';
    } else {
      const message = messageInput.value.trim();
      if (message) {
        appendUserMessage(message);
        messageInput.value = '';
        sendMessage(message);
      }
    }
  });

  messageInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      const message = messageInput.value.trim();
      if (message) {
        appendUserMessage(message);
        messageInput.value = '';
        sendMessage(message);
      }
    }
  });

  chatContainer.scrollTop = chatContainer.scrollHeight;

  const closeButton = document.querySelector('.chat__close-btn');
  if (closeButton) closeButton.addEventListener('click', openModal);

  const leaveButton = document.querySelector('.chat__modal-btn-close');
  if (leaveButton) leaveButton.addEventListener('click', closeChat);

  const cancelButton = document.querySelector('.chat__modal-btn:not(.chat__modal-btn-close)');
  if (cancelButton) cancelButton.addEventListener('click', closeModal);
});
