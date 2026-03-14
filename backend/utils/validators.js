// Validation utilities for request data

export const validators = {
  /**
   * Validate amount (must be positive number)
   * @param {number} amount 
   * @returns {object} { valid: boolean, error?: string }
   */
  validateAmount: (amount) => {
    if (!amount) return { valid: false, error: 'Amount is required' };
    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return { valid: false, error: 'Amount must be a positive number' };
    }
    if (amountNum < 1) {
      return { valid: false, error: 'Minimum amount is ₹1' };
    }
    return { valid: true };
  },

  /**
   * Validate payment gateway
   * @param {string} gateway
   * @returns {object} { valid: boolean, error?: string }
   */
  validateGateway: (gateway) => {
    const validGateways = ['razorpay', 'phonepe', 'cashfree', 'sabpaisa'];
    if (!gateway) return { valid: false, error: 'Gateway is required' };
    if (!validGateways.includes(gateway.toLowerCase())) {
      return {
        valid: false,
        error: `Invalid gateway. Supported: ${validGateways.join(', ')}`
      };
    }
    return { valid: true };
  },

  /**
   * Validate email format
   * @param {string} email 
   * @returns {object} { valid: boolean, error?: string }
   */
  validateEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return { valid: false, error: 'Email is required' };
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Invalid email format' };
    }
    return { valid: true };
  },

  /**
   * Validate phone number (Indian format)
   * @param {string} phone 
   * @returns {object} { valid: boolean, error?: string }
   */
  validatePhone: (phone) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phone) return { valid: false, error: 'Phone is required' };
    if (!phoneRegex.test(phone.toString())) {
      return { valid: false, error: 'Invalid phone number (must be 10 digits starting with 6-9)' };
    }
    return { valid: true };
  },

  /**
   * Validate customer details
   * @param {object} customer 
   * @returns {object} { valid: boolean, error?: string }
   */
  validateCustomer: (customer) => {
    if (!customer || typeof customer !== 'object') {
      return { valid: false, error: 'Customer object is required' };
    }

    const { name, email, phone } = customer;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return { valid: false, error: 'Customer name is required' };
    }

    const emailValidation = validators.validateEmail(email);
    if (!emailValidation.valid) return emailValidation;

    const phoneValidation = validators.validatePhone(phone);
    if (!phoneValidation.valid) return phoneValidation;

    return { valid: true };
  },
};

export default validators;
