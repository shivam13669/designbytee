// API Configuration
const API_BASE_URL = (() => {
  const hostname = window.location.hostname;
  // Use localhost for local development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5000';
  }
  // Use render backend for all other environments (production, Builder.io preview, etc)
  return 'https://shivam-codessite.onrender.com';
})();

$(document).ready(function () {
  loadCheckoutData();
  setupFormHandlers();
  setupPaymentMethodSelection();
});

function getCourseIdFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return parseInt(urlParams.get('id')) || null;
}

function loadCheckoutData() {
  const courseId = getCourseIdFromUrl();

  if (!courseId) {
    window.location.href = '/courses';
    return;
  }

  fetch('/courses/courses.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(courses => {
      const course = courses.find(c => c.id === courseId);
      if (course) {
        displayCheckoutData(course);
      } else {
        window.location.href = '/courses';
      }
    })
    .catch(error => {
      console.error('Error loading course:', error);
      window.location.href = '/courses';
    });
}

function displayCheckoutData(course) {
  // Store course data for later use
  window.currentCourseForPayment = course;

  // Update page title
  document.title = `Checkout: ${course.name} | Design Byte`;

  // Populate order summary
  document.getElementById('courseSummaryImage').src = course.image;
  document.getElementById('courseSummaryName').textContent = course.name;
  document.getElementById('courseSummaryInstructor').textContent = course.instructor;
  document.getElementById('courseSummaryDuration').textContent = course.duration;
  document.getElementById('summaryTotal').textContent = course.price;

  // Update pay button with lock icon and price
  document.getElementById('payNowBtn').innerHTML = `<i class="fas fa-lock"></i> Pay ${course.price}`;
}

function setupFormHandlers() {
  const form = document.getElementById('checkoutForm');
  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      await handleCheckoutSubmit();
    });

    // Real-time validation listeners
    const nameInput = document.getElementById('customerName');
    const emailInput = document.getElementById('customerEmail');
    const phoneInput = document.getElementById('customerPhone');

    nameInput.addEventListener('blur', validateNameField);
    nameInput.addEventListener('input', validateNameField);

    emailInput.addEventListener('blur', validateEmailField);
    emailInput.addEventListener('input', validateEmailField);

    phoneInput.addEventListener('blur', validatePhoneField);
    phoneInput.addEventListener('input', handlePhoneInput);
  }
}

function handlePhoneInput(e) {
  const phoneInput = document.getElementById('customerPhone');
  // Remove any non-numeric characters
  let value = phoneInput.value.replace(/[^\d]/g, '');
  // Limit to 10 digits
  value = value.slice(0, 10);
  phoneInput.value = value;
  validatePhoneField();
}

function setupPaymentMethodSelection() {
  const methods = document.querySelectorAll('.method');

  // Select first method (Razorpay) by default
  if (methods.length > 0) {
    methods[0].classList.add('active');
    window.selectedGateway = methods[0].getAttribute('data-gateway');
  }

  methods.forEach(method => {
    method.addEventListener('click', function() {
      // Remove active class from all methods
      methods.forEach(m => m.classList.remove('active'));
      // Add active class to clicked method
      this.classList.add('active');
      // Store selected gateway
      window.selectedGateway = this.getAttribute('data-gateway');
      console.log('Selected gateway:', window.selectedGateway);
    });
  });
}

async function handleCheckoutSubmit() {
  if (!window.currentCourseForPayment) {
    showPaymentStatus('error', 'Course Not Found', 'Course information was not found. Please try again.');
    return;
  }

  // Validate form
  if (!validateCheckoutForm()) {
    return;
  }

  // Get form data
  const name = document.getElementById('customerName').value.trim();
  const email = document.getElementById('customerEmail').value.trim();
  const phone = document.getElementById('customerPhone').value.trim();
  const gateway = window.selectedGateway;

  // Check if gateway is selected
  if (!gateway) {
    showPaymentStatus('error', 'Payment Method Required', 'Please select a payment method');
    return;
  }

  const customerDetails = { name, email, phone };

  try {
    showPaymentStatus('pending', 'Processing Payment', 'Please wait while we initialize your payment...');

    // Get course price
    const priceText = window.currentCourseForPayment.price;
    // Remove ₹ symbol AND commas (e.g., "₹2,999" -> "2999")
    const amount = parseFloat(priceText.replace('₹', '').replace(/,/g, '').trim());

    console.log('Payment details:', {
      coursePrice: priceText,
      parsedAmount: amount,
      gateway: gateway,
      customerEmail: email,
      courseName: window.currentCourseForPayment.name
    });

    // Store for later verification
    localStorage.setItem('current_amount', amount);
    localStorage.setItem('current_customer_email', email);

    // Call backend API to create order
    const payload = {
      amount: amount,
      gateway: gateway,
      customer: customerDetails,
      description: `Payment for ${window.currentCourseForPayment.name}`
    };

    console.log('Sending to backend:', payload);

    const response = await fetch(`${API_BASE_URL}/api/payment/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to create order');
    }

    // Handle different gateways
    handleGatewayPayment(gateway, data.order, amount, customerDetails);

  } catch (error) {
    console.error('Payment error:', error);
    showPaymentStatus('error', 'Payment Initialization Failed', error.message);
  }
}

function validateNameField() {
  const nameInput = document.getElementById('customerName');
  const nameError = document.getElementById('nameError');
  const name = nameInput.value.trim();

  if (!name) {
    setFieldError(nameInput, nameError, 'Name is required');
    return false;
  } else if (name.length < 3) {
    setFieldError(nameInput, nameError, 'Name must be at least 3 characters');
    return false;
  } else {
    clearFieldError(nameInput, nameError);
    return true;
  }
}

function validateEmailField() {
  const emailInput = document.getElementById('customerEmail');
  const emailError = document.getElementById('emailError');
  const email = emailInput.value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email) {
    setFieldError(emailInput, emailError, 'Email is required');
    return false;
  } else if (!emailRegex.test(email)) {
    setFieldError(emailInput, emailError, 'Please enter a valid email address');
    return false;
  } else {
    clearFieldError(emailInput, emailError);
    return true;
  }
}

function validatePhoneField() {
  const phoneInput = document.getElementById('customerPhone');
  const phoneError = document.getElementById('phoneError');
  const phone = phoneInput.value.trim();
  const phoneRegex = /^[6-9]\d{9}$/;

  if (!phone) {
    setFieldError(phoneInput, phoneError, 'Phone number is required');
    return false;
  } else if (!phoneRegex.test(phone)) {
    setFieldError(phoneInput, phoneError, 'Enter a valid 10-digit phone number (starts with 6-9)');
    return false;
  } else {
    clearFieldError(phoneInput, phoneError);
    return true;
  }
}

function setFieldError(inputElement, errorElement, message) {
  inputElement.classList.add('input-error');
  errorElement.textContent = message;
  errorElement.classList.add('show-error');
}

function clearFieldError(inputElement, errorElement) {
  inputElement.classList.remove('input-error');
  errorElement.textContent = '';
  errorElement.classList.remove('show-error');
}

function validateCheckoutForm() {
  const nameValid = validateNameField();
  const emailValid = validateEmailField();
  const phoneValid = validatePhoneField();

  const gateway = window.selectedGateway;
  const gatewayError = document.getElementById('gatewayError');

  let gatewayValid = true;
  if (!gateway) {
    gatewayError.textContent = 'Please select a payment method';
    gatewayError.classList.add('show-error');
    gatewayValid = false;
  } else {
    gatewayError.textContent = '';
    gatewayError.classList.remove('show-error');
  }

  return nameValid && emailValid && phoneValid && gatewayValid;
}

function handleGatewayPayment(gateway, order, amount, customer) {
  switch(gateway) {
    case 'razorpay':
      handleRazorpayPayment(order, amount, customer);
      break;
    case 'phonepe':
      handlePhonePePayment(order);
      break;
    case 'cashfree':
      handleCashfreePayment(order);
      break;
  }
}

function handleRazorpayPayment(order, amount, customer) {
  // Load Razorpay script if not loaded
  if (!window.Razorpay) {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => openRazorpayCheckout(order, amount, customer);
    document.head.appendChild(script);
  } else {
    openRazorpayCheckout(order, amount, customer);
  }
}

function openRazorpayCheckout(order, amount, customer) {
  const options = {
    key: order.razorpayKey,
    amount: order.amount,
    currency: 'INR',
    order_id: order.orderId,
    customer_details: {
      name: customer.name,
      email: customer.email,
      contact: customer.phone
    },
    handler: async function(response) {
      await verifyRazorpayPayment(order.orderId, response.razorpay_payment_id, response.razorpay_signature);
    },
    prefill: {
      name: customer.name,
      email: customer.email,
      contact: customer.phone
    },
    theme: {
      color: '#6366f1'
    },
    modal: {
      ondismiss: function() {
        closePaymentStatus();
      }
    }
  };

  const rzp = new Razorpay(options);
  rzp.open();
}

async function verifyRazorpayPayment(orderId, paymentId, signature) {
  try {
    showPaymentStatus('pending', 'Verifying Payment', 'Please wait while we confirm your payment...');

    const response = await fetch(`${API_BASE_URL}/api/payment/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        gateway: 'razorpay',
        orderId: orderId,
        paymentId: paymentId,
        signature: signature
      })
    });

    const data = await response.json();

    if (data.success) {
      showPaymentSuccess('Razorpay', data);
    } else {
      showPaymentStatus('error', 'Payment Verification Failed', data.error || 'Please contact support if the issue persists.');
    }
  } catch (error) {
    console.error('Verification error:', error);
    showPaymentStatus('error', 'Payment Verification Failed', 'An error occurred during verification. Please contact support.');
  }
}

function handlePhonePePayment(order) {
  if (order.redirectUrl) {
    // Store transaction ID for later verification
    localStorage.setItem('phonepe_transaction_id', order.transactionId);
    localStorage.setItem('phonepe_amount', localStorage.getItem('current_amount'));
    localStorage.setItem('phonepe_order_id', order.orderId);
    localStorage.setItem('payment_gateway', 'phonepe');

    // Redirect to PhonePe - backend will handle return_url callback
    window.location.href = order.redirectUrl;
  } else {
    showPaymentStatus('error', 'Payment Gateway Error', 'Failed to initialize PhonePe payment. Please try again.');
  }
}

function handleCashfreePayment(order) {

  if (order.paymentSessionId) {

    localStorage.setItem('cashfree_order_id', order.orderId);
    localStorage.setItem('payment_gateway', 'cashfree');

    const cashfree = Cashfree({
      mode: "production",
    });

    cashfree.checkout({
      paymentSessionId: order.paymentSessionId,
      redirectTarget: "_self",
    });

  } else {

    showPaymentStatus(
      'error',
      'Payment Gateway Error',
      'Failed to initialize Cashfree payment. Please try again.'
    );

  }
}

// Show payment status modal
function showPaymentStatus(type, title, message, details = null) {
  const overlay = document.getElementById('paymentStatusOverlay');
  const statusContent = document.getElementById('statusContent');

  let html = '';

  if (type === 'success') {
    html += '<div class="status-icon success">✓</div>';
  } else if (type === 'error') {
    html += '<div class="status-icon error">✕</div>';
  } else if (type === 'pending') {
    html += '<div class="status-spinner"></div>';
  }

  html += `
    <h2 class="status-title">${title}</h2>
    <p class="status-message">${message}</p>
  `;

  if (details) {
    html += '<div class="status-details">';
    Object.entries(details).forEach(([key, value]) => {
      html += `
        <div class="status-detail-item">
          <span class="status-detail-label">${key}</span>
          <span class="status-detail-value">${value}</span>
        </div>
      `;
    });
    html += '</div>';
  }

  html += '<div class="status-actions">';

  if (type === 'success') {
    html += `
      <button class="btn-status btn-status-primary" onclick="window.location.href='/courses'">
        Back to Courses
      </button>
    `;
  } else if (type === 'error') {
    html += `
      <button class="btn-status btn-status-primary" onclick="closePaymentStatus()">
        Try Again
      </button>
      <button class="btn-status btn-status-secondary" onclick="window.location.href='/courses'">
        Back to Courses
      </button>
    `;
  }

  html += '</div>';

  statusContent.innerHTML = html;
  overlay.classList.add('active');
}

function closePaymentStatus() {
  const overlay = document.getElementById('paymentStatusOverlay');
  overlay.classList.remove('active');
}

function showPaymentSuccess(gateway, paymentData) {
  const details = {
    'Gateway': gateway,
    'Amount': `₹${paymentData.amount}`,
    'Status': paymentData.status
  };

  showPaymentStatus('success', 'Payment Successful!',
    'Your payment has been confirmed. You will be enrolled in the course shortly. Check your email for further instructions.',
    details);

  // Redirect to courses page after 3 seconds
  setTimeout(() => {
    window.location.href = '/courses';
  }, 3000);
}

// Spinner animation for pending status
const style = document.createElement('style');
style.textContent = `
  .status-spinner {
    width: 50px;
    height: 50px;
    border: 4px solid #e5e7eb;
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 20px;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;
document.head.appendChild(style);
