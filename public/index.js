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
  phoneInput.addEventListener('input', () =>
    validateInput('phone', 'Please enter a valid phone number.', validatePhone)
  );
  emailInput.addEventListener('input', () =>
    validateInput('email', 'Please enter a valid email address.', validateEmail)
  );
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

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    clearErrors();

    let isValid = true;

    // Validate each field based on the required flags.
    if (isNameRequired && !validateInput('name', 'Please enter your name.')) {
      isValid = false;
    }
    if (
      isPhoneRequired &&
      !validateInput('phone', 'Please enter a valid phone number.', validatePhone)
    ) {
      isValid = false;
    }
    if (
      isEmailRequired &&
      !validateInput('email', 'Please enter a valid email address.', validateEmail)
    ) {
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
      // Call the API route to create a new AskHandle chat room.
      // Note that we do not set "formSubmitted" until a valid room is returned.
      fetch('/api/createRoom', {
        method: 'POST',
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.room && data.room.uuid) {
            // Save the room UUID, greeting message, and the user's details for later use in chat.
            localStorage.setItem('askhandleRoomUUID', data.room.uuid);
            localStorage.setItem('nickname', nameInput.value);
            localStorage.setItem('email', emailInput.value);
            localStorage.setItem('phone', phoneInput.value);
            if (data.room.greeting_message) {
              localStorage.setItem('greeting_message', data.room.greeting_message);
            }
            // Mark form submission as successful.
            localStorage.setItem('formSubmitted', 'true');
            // Redirect to the chat page once room creation is complete.
            document.body.classList.add('fade-out-transition', 'fade-out');
            setTimeout(() => {
              window.location.href = '/chat.html';
            }, 500);
          } else {
            console.error('Failed to create chat room:', data.error);
            displayError('Failed to create chat room. Please try again.');
          }
        })
        .catch((error) => {
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
