# Stripe Support Email - PayPal and Klarna Not Showing in Checkout Sessions

## Subject
PayPal and Klarna not displayed in Checkout Sessions, but working in Payment Links

## Email Body

Hello Stripe Support Team,

I'm experiencing an issue where PayPal and Klarna payment methods are not displayed in Checkout Sessions created via API, even though they work correctly in Payment Links using the same Price ID.

### Problem Description

**PayPal:**
- PayPal is included in `payment_method_types` array
- PayPal appears in the session response: `"payment_method_types": ["card", "sepa_debit", "paypal"]`
- PayPal Recurring is enabled in Dashboard
- PayPal works correctly in Payment Links (same Price ID)
- PayPal is NOT displayed in the Checkout UI

**Klarna:**
- Klarna is enabled in Dashboard
- Klarna works correctly in Payment Links
- Klarna is NOT displayed in Checkout Sessions created via API

### Technical Details

**Checkout Session Configuration:**
- Session ID (example): `cs_live_a1HVBH6dkhUXAun2U5ty4VrToVwbVTFHp1GsJsAAjsZgvOrUhFEtiAF6xP`
- Price ID: `price_1STTTwRbChVRWy02O656rWmA`
- Mode: `subscription`
- Payment Methods Requested: `['paypal', 'card', 'sepa_debit']` (Klarna would be added if it worked)
- Payment Method Collection: `'always'`
- Currency: `EUR`
- Business Location: `Germany`

**Session Response:**
```json
{
  "payment_method_types": ["card", "sepa_debit", "paypal"],
  "payment_method_collection": "always",
  "mode": "subscription",
  "currency": "eur"
}
```

**Code Implementation:**
```typescript
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['paypal', 'card', 'sepa_debit'],
  payment_method_collection: 'always',
  payment_method_options: {
    sepa_debit: {}
  },
  line_items: [{ price: subscriptionPriceId, quantity: 1 }],
  mode: 'subscription',
  success_url: `${origin}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${origin}/dashboard?payment=cancelled`,
  client_reference_id: userId,
  metadata: {
    userId,
    planType: 'subscription',
  },
})
```

### Testing Performed

1. **PayPal Testing:**
   - ✅ PayPal Recurring is enabled in Dashboard
   - ✅ PayPal account is fully verified
   - ✅ PayPal works in Payment Links (same Price ID)
   - ✅ PayPal is included in session response
   - ❌ PayPal is NOT displayed in Checkout UI
   - Tested with and without SEPA - problem persists

2. **Klarna Testing:**
   - ✅ Klarna is enabled in Dashboard
   - ✅ Klarna works in Payment Links
   - ❌ Klarna is NOT displayed in Checkout Sessions

### Expected Behavior

Both PayPal and Klarna should be displayed in the Checkout UI when:
- They are included in `payment_method_types`
- They are enabled in the Dashboard
- They work correctly in Payment Links

### Questions

1. Why are PayPal and Klarna not displayed in Checkout Sessions created via API, even though they work in Payment Links?
2. Is there a difference in how Payment Links and Checkout Sessions handle payment method display?
3. Are there additional configuration requirements for PayPal/Klarna in Checkout Sessions that differ from Payment Links?
4. Could there be a conflict with other payment methods (e.g., SEPA Direct Debit)?

### Additional Information

- Stripe Account: Live mode
- Business Location: Germany (EU)
- Currency: EUR (from Price object)
- Amount: 39.00 EUR (3900 cents)
- Subscription Mode: Yes
- All payment methods are enabled in Dashboard Settings → Payment Methods

### Response to Support AI Suggestions

I've reviewed the suggestions from the Support AI and can confirm:

1. **`payment_method_types` is explicitly set:**
   - ✅ PayPal is included: `['paypal', 'card', 'sepa_debit']`
   - ✅ PayPal appears in session response
   - ❌ PayPal is NOT displayed in Checkout UI

2. **Currency and Amount:**
   - ✅ Currency: EUR (supported by PayPal and Klarna)
   - ✅ Amount: 39.00 EUR (3900 cents)
   - ✅ Same Price ID used in Payment Links (where PayPal/Klarna work)

3. **Dashboard Settings:**
   - ✅ PayPal is enabled in Dashboard → Settings → Payment Methods
   - ✅ PayPal Recurring is enabled
   - ✅ Klarna is enabled in Dashboard → Settings → Payment Methods
   - ❓ **Question:** Is there a separate setting to enable PayPal/Klarna specifically for Checkout Sessions (not just Payment Links)?

4. **Code Configuration:**
   - ✅ `payment_method_types` is explicitly set (not omitted)
   - ✅ All requested methods appear in session response
   - ✅ No restrictions or overrides that would exclude PayPal/Klarna

### Additional Testing

I've also tested:
- ✅ Without SEPA: PayPal still doesn't appear
- ✅ With only PayPal + Card: PayPal still doesn't appear
- ✅ Payment Links with same Price ID: PayPal and Klarna work correctly

### Specific Questions

1. **Dashboard Settings:** Is there a separate checkbox/setting in Dashboard → Settings → Payment Methods to enable PayPal/Klarna specifically for Checkout Sessions (vs. Payment Links)?

2. **Payment Method Collection:** Could `payment_method_collection: 'always'` be causing issues? Should it be omitted or set differently?

3. **Payment Method Options:** Could the `payment_method_options` object (even if only containing SEPA) be interfering with PayPal/Klarna display?

4. **Dynamic Payment Methods:** Should I try omitting `payment_method_types` entirely to let Stripe use all enabled methods dynamically (as suggested by Support AI)?

5. **Subscription Mode:** Are there subscription-specific requirements for PayPal/Klarna that differ from one-time payments?

I would appreciate any guidance on how to resolve this issue. The payment methods are correctly configured and work in Payment Links, so I believe this might be a Stripe-side issue or a missing configuration step.

Thank you for your assistance!

Best regards,
[Your Name]
