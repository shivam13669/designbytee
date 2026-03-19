# Frontend Integration Guide

This guide shows how to integrate the payment backend APIs with your frontend (HTML/CSS/JS).

## Quick Start

### 1. Base API URL

Set this at the top of your JavaScript:

```javascript
const API_BASE_URL = 'https://payment-gateway-backend.onrender.com';
// Or for local development:
// const API_BASE_URL = 'http://localhost:5000';
```

---

## Razorpay Integration

### Step 1: Add Razorpay Script to HTML

```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

### Step 2: Create Order Function

```javascript
async function createRazorpayOrder(amount, customerDetails) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/payment/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        gateway: 'razorpay',
        customer: {
          name: customerDetails.name,
          email: customerDetails.email,
          phone: customerDetails.phone
        },
        description: 'Course Purchase - Design Byte'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create order');
    }

    const data = await response.json();
    return data.order;
  } catch (error) {
    console.error('Order creation error:', error);
    alert('Failed to create order. Please try again.');
    throw error;
  }
}
```

### Step 3: Open Razorpay Checkout

```javascript
async function openRazorpayCheckout(amount, customerDetails) {
  try {
    const order = await createRazorpayOrder(amount, customerDetails);

    const options = {
      key: order.razorpayKey,           // Your Razorpay Key
      amount: order.amount,              // Amount in paise
      currency: 'INR',
      name: 'Design Byte',
      description: 'Course Purchase',
      order_id: order.orderId,           // Order ID from backend
      customer_details: {
        name: customerDetails.name,
        email: customerDetails.email,
        contact: customerDetails.phone
      },
      handler: async function(response) {
        // Payment successful
        await verifyRazorpayPayment(
          order.orderId,
          response.razorpay_payment_id,
          response.razorpay_signature
        );
      },
      prefill: {
        name: customerDetails.name,
        email: customerDetails.email,
        contact: customerDetails.phone
      },
      theme: {
        color: '#2b3dda'  // Your brand color
      },
      modal: {
        ondismiss: function() {
          alert('Payment cancelled by user');
        }
      }
    };

    const rzp = new Razorpay(options);
    rzp.open();
  } catch (error) {
    console.error('Checkout error:', error);
  }
}
```

### Step 4: Verify Razorpay Payment

```javascript
async function verifyRazorpayPayment(orderId, paymentId, signature) {
  try {
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
      alert('Payment successful! 🎉');
      // Redirect to success page
      window.location.href = '/payment-success.html';
      // Or update UI to show enrollment
      enrollUserInCourse();
    } else {
      alert('Payment verification failed: ' + data.error);
    }
  } catch (error) {
    console.error('Verification error:', error);
    alert('Payment verification failed');
  }
}
```

### Step 5: HTML Form Example

```html
<form id="razorpay-form">
  <input type="text" id="customer-name" placeholder="Full Name" required>
  <input type="email" id="customer-email" placeholder="Email" required>
  <input type="tel" id="customer-phone" placeholder="Phone (10 digits)" required>
  
  <button type="button" onclick="handleRazorpayPayment()">
    Pay ₹499 with Razorpay
  </button>
</form>

<script>
async function handleRazorpayPayment() {
  const customerDetails = {
    name: document.getElementById('customer-name').value,
    email: document.getElementById('customer-email').value,
    phone: document.getElementById('customer-phone').value
  };

  await openRazorpayCheckout(499, customerDetails);
}
</script>
```

---

## PhonePe Integration

### Step 1: Create Order Function

```javascript
async function createPhonePeOrder(amount, customerDetails) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/payment/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        gateway: 'phonepe',
        customer: {
          name: customerDetails.name,
          email: customerDetails.email,
          phone: customerDetails.phone
        },
        description: 'Course Purchase - Design Byte'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create order');
    }

    const data = await response.json();
    return data.order;
  } catch (error) {
    console.error('Order creation error:', error);
    alert('Failed to create PhonePe order');
    throw error;
  }
}
```

### Step 2: Redirect to PhonePe Payment

```javascript
async function openPhonePePayment(amount, customerDetails) {
  try {
    const order = await createPhonePeOrder(amount, customerDetails);

    if (order.redirectUrl) {
      // Store transaction ID for verification after callback
      localStorage.setItem('phonepe_transaction_id', order.transactionId);
      
      // Redirect to PhonePe
      window.location.href = order.redirectUrl;
    } else {
      alert('Failed to get payment URL');
    }
  } catch (error) {
    console.error('PhonePe payment error:', error);
  }
}
```

### Step 3: Handle PhonePe Callback

Create a `payment-status.html` page to handle the callback:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Payment Status</title>
</head>
<body>
  <div id="status">Processing payment...</div>

  <script>
    async function verifyPhonePePayment() {
      const urlParams = new URLSearchParams(window.location.search);
      const transactionId = urlParams.get('transactionId');

      if (!transactionId) {
        document.getElementById('status').innerHTML = 'No transaction ID found';
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/payment/verify-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            gateway: 'phonepe',
            transactionId: transactionId
          })
        });

        const data = await response.json();

        if (data.success && data.status === 'COMPLETED') {
          document.getElementById('status').innerHTML = `
            <h2>✅ Payment Successful!</h2>
            <p>Amount: ₹${data.amount}</p>
            <p>Transaction: ${data.transactionId}</p>
          `;
          enrollUserInCourse();
        } else {
          document.getElementById('status').innerHTML = `
            <h2>❌ Payment Failed</h2>
            <p>Status: ${data.status}</p>
            <a href="/courses">Go Back</a>
          `;
        }
      } catch (error) {
        console.error('Verification error:', error);
        document.getElementById('status').innerHTML = 'Error verifying payment';
      }
    }

    verifyPhonePePayment();
  </script>
</body>
</html>
```

---

## Cashfree Integration

### Step 1: Create Order Function

```javascript
async function createCashfreeOrder(amount, customerDetails) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/payment/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        gateway: 'cashfree',
        customer: {
          name: customerDetails.name,
          email: customerDetails.email,
          phone: customerDetails.phone
        },
        description: 'Course Purchase - Design Byte'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create order');
    }

    const data = await response.json();
    return data.order;
  } catch (error) {
    console.error('Order creation error:', error);
    alert('Failed to create Cashfree order');
    throw error;
  }
}
```

### Step 2: Open Cashfree Payment

```javascript
async function openCashfreePayment(amount, customerDetails) {
  try {
    const order = await createCashfreeOrder(amount, customerDetails);

    if (order.paymentLink) {
      // Store order ID for verification
      localStorage.setItem('cashfree_order_id', order.orderId);
      
      // Redirect to Cashfree
      window.location.href = order.paymentLink;
    } else {
      alert('Failed to get payment link');
    }
  } catch (error) {
    console.error('Cashfree payment error:', error);
  }
}
```

---

## Multi-Gateway Checkout Button

```html
<div class="payment-gateways">
  <button onclick="selectGateway('razorpay')">Pay with Razorpay</button>
  <button onclick="selectGateway('phonepe')">Pay with PhonePe</button>
  <button onclick="selectGateway('cashfree')">Pay with Cashfree</button>
</div>

<script>
async function selectGateway(gateway) {
  const customerDetails = {
    name: document.getElementById('customer-name').value,
    email: document.getElementById('customer-email').value,
    phone: document.getElementById('customer-phone').value
  };

  const amount = 499;

  switch(gateway) {
    case 'razorpay':
      await openRazorpayCheckout(amount, customerDetails);
      break;
    case 'phonepe':
      await openPhonePePayment(amount, customerDetails);
      break;
    case 'cashfree':
      await openCashfreePayment(amount, customerDetails);
      break;
  }
}
</script>
```

---

## Error Handling

```javascript
async function handlePaymentError(error) {
  console.error('Payment error:', error);
  
  // User-friendly error message
  let errorMessage = 'Payment failed. Please try again.';
  
  if (error.message.includes('Network')) {
    errorMessage = 'Network error. Check your internet connection.';
  } else if (error.message.includes('validation')) {
    errorMessage = 'Invalid customer details. Please check and try again.';
  }
  
  alert(errorMessage);
  
  // Log to your error tracking service
  // reportToErrorTracking(error);
}
```

---

## Best Practices

1. **Validate input before sending**: Check name, email, phone format
2. **Show loading state**: Disable button during payment processing
3. **Store transaction ID**: Save in localStorage or session storage
4. **Implement retry logic**: Allow users to retry failed payments
5. **Security**: Never log sensitive data like card numbers
6. **User feedback**: Show clear success/failure messages

---

## Testing

### Test Credentials

**Razorpay Test Mode:**
- Key: `rzp_test_xxxxx` (from dashboard)
- Test Card: `4111111111111111`, any future date, any CVV

**PhonePe Test Mode:**
- Use sandbox environment

**Cashfree Test Mode:**
- Use test credentials from Cashfree dashboard

### Test Payment Flow

```html
<button onclick="testPaymentFlow()">Test Payment Flow</button>

<script>
async function testPaymentFlow() {
  const testCustomer = {
    name: 'Test User',
    email: 'test@example.com',
    phone: '9876543210'
  };

  await openRazorpayCheckout(1, testCustomer); // ₹1 for testing
}
</script>
```

---

## Support

For issues or questions:
- Check README.md
- Review API responses in browser console
- Contact payment gateway support
