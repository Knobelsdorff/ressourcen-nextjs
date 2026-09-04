# Stripe Support Summary - PayPal Not Showing in Checkout Sessions

## Problem Summary

**PayPal** is not displayed in Checkout Sessions created via API, even though:
- ✅ PayPal Recurring is enabled in Dashboard
- ✅ PayPal account is fully verified
- ✅ PayPal works correctly in Payment Links (same Price ID)
- ✅ PayPal appears in session response when explicitly requested
- ❌ PayPal is NOT displayed in Checkout UI

**Klarna** was also not showing initially, but **now works** after removing `payment_method_types`.

**Important:** This is a subscription checkout (mode: 'subscription'), not a one-time payment.

## Current Working Configuration

**Code (works for Klarna, Card, SEPA - but NOT PayPal):**
```typescript
const session = await stripe.checkout.sessions.create({
  // payment_method_types removed - Stripe uses all enabled methods dynamically
  payment_method_collection: 'always',
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

## What We've Tested

1. ✅ **With explicit `payment_method_types`**: PayPal included but not displayed
2. ✅ **Without `payment_method_options`**: PayPal still not displayed
3. ✅ **Without `payment_method_types`**: Klarna now works, PayPal still doesn't
4. ✅ **Without SEPA**: PayPal still not displayed
5. ✅ **Payment Links**: PayPal works correctly (same Price ID)

## Current Status

- ✅ **Klarna**: Works (displayed in Checkout)
- ✅ **Card**: Works
- ✅ **SEPA**: Works
- ❌ **PayPal**: Not displayed

## Account Details

- **Stripe Account**: Live mode
- **Business Location**: Germany (EU)
- **Currency**: EUR
- **Amount**: 15.00 EUR (1500 cents)
- **Price ID**: `price_1STTTwRbChVRWy02O656rWmA`
- **Mode**: Subscription
- **PayPal Recurring**: Enabled in Dashboard
- **PayPal Account**: Verified

## Key Question for Support

**Why does Klarna work with dynamic payment method selection, but PayPal doesn't?**

Since Klarna works when we let Stripe dynamically select payment methods, but PayPal doesn't, there might be:
1. PayPal-specific subscription requirements that differ from Klarna
2. A separate PayPal Recurring activation status not visible in Dashboard
3. PayPal-specific account verification requirements for subscriptions
4. A/B testing or gradual rollout affecting PayPal but not Klarna

## Session Example

**Session ID**: `cs_live_a1HVBH6dkhUXAun2U5ty4VrToVwbVTFHp1GsJsAAjsZgvOrUhFEtiAF6xP`

**Session Response** (when payment_method_types was set):
```json
{
  "payment_method_types": ["card", "sepa_debit", "paypal"],
  "payment_method_collection": "always",
  "mode": "subscription",
  "currency": "eur"
}
```

PayPal appears in the response but is not displayed in the Checkout UI.

## Request

Please check:
1. Is there a separate PayPal Recurring activation status that might not be fully enabled?
2. Are there PayPal-specific subscription requirements that differ from other payment methods?
3. Could there be A/B testing or gradual rollout affecting PayPal?
4. Is there a difference in how PayPal is handled for subscriptions vs. one-time payments?

Thank you for your assistance!
