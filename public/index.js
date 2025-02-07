document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('chat-form');
  const nameInput = document.getElementById('name');
  const phoneInput = document.getElementById('phone');
  const emailInput = document.getElementById('email');
  const checkboxPrivacy = document.getElementById('agree-privacy');
  const checkboxTerms = document.getElementById('agree-terms');

  // Flags to control whether fields are required
  let isNameRequired = false;
  let isPhoneRequired = false;
  let isEmailRequired = false;
  let isPrivacyRequired = false;
  let isTermsRequired = false;

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

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    let isValid = true;

    // Validate the fields as before...
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
      // Save that the form has been submitted so that the chat page can load
      localStorage.setItem('formSubmitted', 'true');

      // Call the API route to create a new AskHandle chat room
      fetch('/api/createRoom', {
        method: 'POST',
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.room && data.room.uuid) {
            // Save the room UUID, greeting message, and the user's details for later use in chat.
            localStorage.setItem('askhandleRoomUUID', data.room.uuid);
            localStorage.setItem('nickname', nameInput.value);
            localStorage.setItem('email', emailInput.value);  // <-- Save email
            localStorage.setItem('phone', phoneInput.value);    // <-- Save phone number
            if (data.room.greeting_message) {
              localStorage.setItem('greeting_message', data.room.greeting_message);
            }
          } else {
            console.error('Failed to create chat room:', data.error);
          }
          // Redirect to the chat page once room creation is complete
          document.body.classList.add('fade-out-transition', 'fade-out');
          setTimeout(() => {
            window.location.href = '/chat.html';
          }, 500);
        })
        .catch((error) => {
          console.error('Error creating chat room:', error);
        });

    }
  });

  // Function to send the email asynchronously using navigator.sendBeacon
  function sendEmailAsync(formData) {
    const url = '/api/sendEmail';
    const data = JSON.stringify(formData);
    const blob = new Blob([data], { type: 'application/json' });
    
    // sendBeacon sends data asynchronously without blocking the page
    if (!navigator.sendBeacon(url, blob)) {
      // If sendBeacon fails, fall back to fetch as a backup
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: data,
      }).catch(error => console.error('Fallback email sending error:', error));
    }
  }

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

  // Helper to dynamically set whether fields are required
  function setRequiredFields(nameRequired, emailRequired, phoneRequired, privacyRequired, termsRequired) {
    isNameRequired = nameRequired;
    isEmailRequired = emailRequired;
    isPhoneRequired = phoneRequired;
    isPrivacyRequired = privacyRequired;
    isTermsRequired = termsRequired;
  }

  // Example: Set name, privacy, and terms as required. Email and phone not required
  setRequiredFields(true, false, false, true, true);

  function clearErrors() {
    document
      .querySelectorAll('.error-message')
      .forEach((error) => (error.textContent = ''));
    document
      .querySelectorAll('.invalid-input')
      .forEach((input) => input.classList.remove('invalid-input'));
    document
      .querySelectorAll('.invalid-checkbox')
      .forEach((label) => label.classList.remove('invalid-checkbox'));
  }
});
