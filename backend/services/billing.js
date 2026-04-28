const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Monetization Service
 * Handles subscription tiers, payment intents, and entitlement checks.
 */
class BillingService {
  constructor() {
    this.tiers = {
      FREE: {
        maxMinutes: 60,
        hasRAG: false,
        hasAgenticExecution: false,
      },
      PRO: {
        maxMinutes: 1000,
        hasRAG: true,
        hasAgenticExecution: true,
      },
      SOVEREIGN: {
        maxMinutes: Infinity,
        hasRAG: true,
        hasAgenticExecution: true,
      }
    };
  }

  async createCheckoutSession(userId, plan = 'PRO') {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: process.env[`STRIPE_PRICE_${plan.toUpperCase()}`],
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing`,
      client_reference_id: userId,
    });
    return session.url;
  }

  async getUserTier(userId) {
    // In a real app, this would query a 'users' collection in MongoDB
    // For now, we simulate based on a DB check
    return 'FREE'; 
  }

  checkEntitlement(userTier, feature) {
    const tier = this.tiers[userTier] || this.tiers.FREE;
    return tier[feature];
  }
}

module.exports = new BillingService();
