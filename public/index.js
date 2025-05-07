document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('chat-form');
  const nameInput = document.getElementById('name');
  const phoneInput = document.getElementById('phone');
  const emailInput = document.getElementById('email');
  const checkboxPrivacy = document.getElementById('agree-privacy');
  const checkboxTerms = document.getElementById('agree-terms');

  // Flags to control whether fields are required
  let isNameRequired = true;
  let isPhoneRequired = true;
  let isEmailRequired = true;
  let isPrivacyRequired = true;
  let isTermsRequired = true;

  // Add real-time validation listeners
  nameInput.addEventListener('input', () =>
    validateInput('name', 'Please enter your name.')
  );
  
  // Only add listeners if the elements exist
  if (phoneInput) {
    phoneInput.addEventListener('input', () =>
      validateInput('phone', 'Please enter a valid phone number.', validatePhone)
    );
  }
  
  if (emailInput) {
    emailInput.addEventListener('input', () =>
      validateInput('email', 'Please enter a valid email address.', validateEmail)
    );
  }
  
  checkboxPrivacy.addEventListener('change', () =>
    validateCheckbox('agree-privacy', 'Agree to the Privacy Policy.')
  );
  checkboxTerms.addEventListener('change', () =>
    validateCheckbox('agree-terms', 'Agree to the Terms of Use.')
  );

  // Function to clear previous error messages
  function clearErrors() {
    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
      errorContainer.textContent = '';
    }
  }

  // Function to display error messages
  function displayError(message) {
    let errorContainer = document.getElementById('error-container');
    if (!errorContainer) {
      errorContainer = document.createElement('div');
      errorContainer.id = 'error-container';
      errorContainer.style.color = 'red';
      errorContainer.style.marginBottom = '10px';
      form.insertBefore(errorContainer, form.firstChild);
    }
    errorContainer.textContent = message;
  }

  // Helper to dynamically set whether fields are required
  function setRequiredFields(nameRequired, emailRequired, phoneRequired, privacyRequired, termsRequired) {
    isNameRequired = nameRequired;
    isEmailRequired = emailRequired;
    isPhoneRequired = phoneRequired;
    isPrivacyRequired = privacyRequired;
    isTermsRequired = termsRequired;
  }

  // Set all fields as required: name, email, phone, privacy, and terms.
  setRequiredFields(true, true, true, true, true);

  // Add loading overlay HTML
  const loadingOverlay = document.createElement('div');
  loadingOverlay.id = 'loading-overlay';
  loadingOverlay.innerHTML = `
    <div class="loading-content">
      <div class="spinner"></div>
      <p>Preparing your session...</p>
    </div>
  `;
  document.body.appendChild(loadingOverlay);

  // Add loading overlay styles
  const style = document.createElement('style');
  style.textContent = `
    #loading-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.9);
      z-index: 9999;
      justify-content: center;
      align-items: center;
    }
    .loading-content {
      text-align: center;
    }
    .spinner {
      width: 40px;
      height: 40px;
      margin: 0 auto 15px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  // Function to show/hide loading overlay
  function toggleLoadingOverlay(show) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    clearErrors();

    let isValid = true;

    // Validate each field based on the required flags.
    if (isNameRequired && !validateInput('name', 'Please enter your name.')) {
      isValid = false;
    }
    
    // Only validate phone if the input exists and is required
    if (isPhoneRequired && phoneInput && !validateInput('phone', 'Please enter a valid phone number.', validatePhone)) {
      isValid = false;
    }
    
    // Only validate email if the input exists and is required
    if (isEmailRequired && emailInput && !validateInput('email', 'Please enter a valid email address.', validateEmail)) {
      isValid = false;
    }
    
    if (
      isPrivacyRequired &&
      !validateCheckbox('agree-privacy', 'You must agree to the Privacy Policy.')
    ) {
      isValid = false;
    }
    if (
      isTermsRequired &&
      !validateCheckbox('agree-terms', 'You must agree to the Terms of Use.')
    ) {
      isValid = false;
    }

    if (isValid) {
      // Show loading overlay
      toggleLoadingOverlay(true);
      
      // Call the API route to create a new AskHandle chat room.
      fetch('/api/createRoom', {
        method: 'POST',
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.room && data.room.uuid) {
            // Save the room UUID, greeting message, and the user's details for later use in chat.
            localStorage.setItem('askhandleRoomUUID', data.room.uuid);
            localStorage.setItem('nickname', nameInput.value);
            // Only store email and phone if they exist
            if (emailInput) {
              localStorage.setItem('email', emailInput.value);
            }
            if (phoneInput) {
              localStorage.setItem('phone', phoneInput.value);
            }
            if (data.room.greeting_message) {
              localStorage.setItem('greeting_message', data.room.greeting_message);
            }
            // Mark form submission as successful.
            localStorage.setItem('formSubmitted', 'true');
            
            // Hide loading overlay and redirect
            toggleLoadingOverlay(false);
            document.body.classList.add('fade-out-transition', 'fade-out');
            setTimeout(() => {
              window.location.href = '/chat.html';
            }, 500);
          } else {
            toggleLoadingOverlay(false);
            console.error('Failed to create chat room:', data.error);
            displayError('Failed to create chat room. Please try again.');
          }
        })
        .catch((error) => {
          toggleLoadingOverlay(false);
          console.error('Error creating chat room:', error);
          displayError('Error creating chat room. Please check your connection and try again.');
        });
    }
  });

  // Validation functions
  function validateInput(id, errorMessage, validationFunction = (value) => !!value.trim()) {
    const input = document.getElementById(id);
    const error = document.getElementById(`${id}-error`);

    if (!validationFunction(input.value)) {
      input.classList.add('invalid-input');
      error.textContent = errorMessage;
      return false;
    } else {
      input.classList.remove('invalid-input');
      error.textContent = '';
      return true;
    }
  }

  function validateEmail(email) {
    const re = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return re.test(email.toLowerCase());
  }

  function validatePhone(phone) {
    const re = /^\+?[0-9]{10,15}$/;
    return re.test(phone);
  }

  function validateCheckbox(id, errorMessage) {
    const checkbox = document.getElementById(id);
    const error = document.getElementById(`${id}-error`);
    const checkboxLabel = checkbox.closest('.custom-checkbox');

    if (!checkbox.checked) {
      error.textContent = errorMessage;
      checkboxLabel.classList.add('invalid-checkbox');
      return false;
    } else {
      error.textContent = '';
      checkboxLabel.classList.remove('invalid-checkbox');
      return true;
    }
  }
});
