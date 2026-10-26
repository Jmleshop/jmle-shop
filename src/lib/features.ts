/**
 * Kartenzahlung (Stripe-Checkout) und Rabattcodes.
 * Aus, bis Stripe-Keys und die Tabellen orders/order_items/discount_codes
 * eingerichtet sind (Inhaber-Entscheidung 2026-10-26). Aktivieren mit
 * NEXT_PUBLIC_CARD_CHECKOUT=1 in Vercel und neuem Build.
 */
export const CARD_CHECKOUT_ENABLED = process.env.NEXT_PUBLIC_CARD_CHECKOUT === "1";
