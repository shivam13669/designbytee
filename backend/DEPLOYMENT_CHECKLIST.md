# Deployment Checklist

Complete this checklist before deploying to production.

## Pre-Deployment (Local Testing)

- [ ] All dependencies installed: `npm install`
- [ ] Backend runs without errors: `npm run dev`
- [ ] Health check works: `curl http://localhost:5000/health`
- [ ] `.env` file created with all required variables
- [ ] Tested all three payment gateways locally (Razorpay, PhonePe, Cashfree)
- [ ] Tested payment creation and verification flows
- [ ] Tested error handling (invalid inputs, network errors, etc.)
- [ ] Frontend integration code tested on `http://localhost:3000`
- [ ] CORS is working between frontend and backend
- [ ] All API response formats verified

## Environment Variables

### Razorpay

- [ ] `RAZORPAY_KEY_ID` - Get from [Razorpay Dashboard](https://dashboard.razorpay.com/app/keys)
- [ ] `RAZORPAY_KEY_SECRET` - Get from same location

### PhonePe

- [ ] `PHONEPE_MERCHANT_ID` - Get from [PhonePe Business](https://business.phonepe.com)
- [ ] `PHONEPE_SALT_KEY` - Get from PhonePe dashboard
- [ ] `PHONEPE_SALT_INDEX` - Usually `1`
- [ ] `PHONEPE_WEBHOOK_USER` - Create your own for webhook auth
- [ ] `PHONEPE_WEBHOOK_PASS` - Create your own for webhook auth

### Cashfree

- [ ] `CASHFREE_APP_ID` - Get from [Cashfree Dashboard](https://dashboard.cashfree.com)
- [ ] `CASHFREE_APP_SECRET` - Get from same location

### General

- [ ] `PORT` - Set to `5000` or your preferred port
- [ ] `NODE_ENV` - Set to `production`
- [ ] `FRONTEND_URL` - Set to your frontend domain (e.g., `https://shivamcodes.in`)
- [ ] `BACKEND_URL` - Set to your backend domain (e.g., `https://payment-gateway-backend.onrender.com`)

## Render Deployment

### Account Setup

- [ ] Render account created
- [ ] GitHub account connected to Render
- [ ] Repository pushed to GitHub

### Service Configuration

- [ ] Web Service created on Render
- [ ] Build command set to: `npm install`
- [ ] Start command set to: `npm start`
- [ ] Environment variables added in Render dashboard

### Deployment

- [ ] Service deployed successfully
- [ ] Deployment logs checked for errors
- [ ] Backend URL accessible (check `/health` endpoint)
- [ ] Auto-deploy on git push configured

## Webhook Configuration

### Razorpay Webhook

1. [ ] Log in to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. [ ] Go to Settings → Webhooks
3. [ ] Add new webhook:
   - [ ] URL: `https://your-backend-url/api/webhook/razorpay`
   - [ ] Events selected:
     - [ ] `payment.authorized`
     - [ ] `payment.failed`
     - [ ] `payment.captured`
     - [ ] `refund.created`
4. [ ] Copy webhook secret to `.env` if required
5. [ ] Test webhook with Razorpay's test option

### PhonePe Webhook

1. [ ] Log in to [PhonePe Business](https://business.phonepe.com)
2. [ ] Go to Settings → Webhooks
3. [ ] Add new webhook:
   - [ ] URL: `https://your-backend-url/api/webhook/phonepe`
   - [ ] Auth Type: Basic Auth
   - [ ] Username: Your `PHONEPE_WEBHOOK_USER`
   - [ ] Password: Your `PHONEPE_WEBHOOK_PASS`
4. [ ] Test webhook connection

### Cashfree Webhook

1. [ ] Log in to [Cashfree Dashboard](https://dashboard.cashfree.com)
2. [ ] Go to Settings → Webhooks
3. [ ] Add new webhook:
   - [ ] URL: `https://your-backend-url/api/webhook/cashfree`
   - [ ] Events selected:
     - [ ] Payment Success
     - [ ] Payment Failed
     - [ ] Refund Status
4. [ ] Test webhook connection

## Frontend Configuration

- [ ] Update `API_BASE_URL` to production backend URL
- [ ] Remove any hardcoded test credentials
- [ ] Test all payment flows with production gateways
- [ ] Test across different devices and browsers
- [ ] Error messages display correctly
- [ ] Payment success/failure redirects work correctly
- [ ] Course enrollment works after payment

## Testing in Production

### Razorpay Test

- [ ] Switch to test mode in Razorpay dashboard
- [ ] Use test card: `4111111111111111`
- [ ] Verify test payment in backend logs

### PhonePe Test

- [ ] Use PhonePe sandbox/test environment
- [ ] Verify webhook receives test notification
- [ ] Check backend webhook logs

### Cashfree Test

- [ ] Use Cashfree test credentials
- [ ] Verify payment flow end-to-end
- [ ] Check webhook handling

## Post-Deployment

- [ ] Backend is running without errors
- [ ] All endpoints responding with correct status codes
- [ ] CORS headers correct for frontend domain
- [ ] Webhooks receiving notifications
- [ ] Payment verification working
- [ ] Logs are being recorded properly
- [ ] No console errors in browser
- [ ] No errors in Render dashboard

## Security Checklist

- [ ] `.env` file NOT committed to git
- [ ] `.gitignore` includes `.env`
- [ ] Environment variables are set in Render (not hardcoded)
- [ ] HTTPS is enforced (Render provides this by default)
- [ ] CORS only allows your frontend domain
- [ ] API keys are rotated regularly
- [ ] Sensitive logs don't expose secrets
- [ ] Input validation working on all endpoints
- [ ] Rate limiting considered for production (recommended for future)
- [ ] Database credentials secured (when integrated)

## Monitoring & Logging

- [ ] Set up error tracking (optional: Sentry, DataDog)
- [ ] Monitor payment gateway API usage
- [ ] Check logs regularly for errors
- [ ] Set up alerts for webhook failures
- [ ] Monitor backend performance
- [ ] Check Render deployment history

## Documentation

- [ ] README.md reviewed and up-to-date
- [ ] FRONTEND_INTEGRATION.md available for team
- [ ] API endpoint documentation complete
- [ ] Webhook payload examples documented
- [ ] Error codes documented
- [ ] Troubleshooting guide written

## Backup & Recovery

- [ ] GitHub repository is backed up
- [ ] Environment variables documented (securely)
- [ ] Database backups configured (when integrated)
- [ ] Disaster recovery plan in place

## Final Checks

- [ ] All team members informed of API URLs
- [ ] Documentation shared with team
- [ ] Support contact information available
- [ ] Monitor first few days for issues
- [ ] Database schema verified (when integrated)

---

## Quick Deployment Commands

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Test production build
npm start

# View logs (for Render)
# Go to Render dashboard → Your Service → Logs

# Restart service (Render)
# Go to Render dashboard → Your Service → Manual Deploy
```

---

## Common Issues & Solutions

### Issue: 502 Bad Gateway

**Cause:** Backend crashed or not running  
**Solution:**
1. Check Render logs for errors
2. Verify environment variables are set
3. Check for syntax errors in code
4. Restart the service

### Issue: CORS Error

**Cause:** Frontend domain not allowed  
**Solution:**
1. Verify `FRONTEND_URL` in backend `.env`
2. Make sure it's in Render environment variables
3. Check browser console for exact error
4. Restart the service

### Issue: Webhook Not Triggering

**Cause:** Webhook URL incorrect or signature mismatch  
**Solution:**
1. Verify webhook URL in gateway dashboard
2. Check webhook secret matches `.env`
3. View gateway webhook logs
4. Test webhook manually

### Issue: Payment Verification Fails

**Cause:** Signature mismatch or wrong gateway  
**Solution:**
1. Verify credentials in `.env`
2. Check signature calculation in gateway file
3. Compare with official gateway docs
4. Review backend logs

---

## Support Contacts

- **Razorpay Support:** https://razorpay.com/support/
- **PhonePe Support:** https://business.phonepe.com/support
- **Cashfree Support:** https://cashfree.com/support
- **Render Support:** https://render.com/docs
