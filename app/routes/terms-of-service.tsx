export default function TermsOfServicePage() {
  return (
    <div className="container py-4" style={{ maxWidth: 900 }}>
      <h1 className="h3 mb-3">Terms of Service</h1>
      <p className="text-muted">Last updated: April 2026</p>

      <h2 className="h5 mt-4">1. Acceptance of Terms</h2>
      <p>
        By installing or using Price Breakup, you agree to these Terms of
        Service and applicable Shopify platform rules.
      </p>

      <h2 className="h5 mt-4">2. Service Scope</h2>
      <p>
        Price Breakup provides product pricing and breakup features. Plan limits,
        billing, and available features depend on your selected subscription.
      </p>

      <h2 className="h5 mt-4">3. Billing</h2>
      <p>
        Paid plans are billed through Shopify recurring app charges. You can
        manage or cancel plans from the app Plans page.
      </p>

      <h2 className="h5 mt-4">4. Merchant Responsibilities</h2>
      <p>
        You are responsible for the pricing values configured in the app and for
        reviewing storefront display before publishing changes.
      </p>

      <h2 className="h5 mt-4">5. Limitation of Liability</h2>
      <p>
        The app is provided on an as-is basis. To the maximum extent permitted by
        law, we are not liable for indirect or consequential losses.
      </p>

      <h2 className="h5 mt-4">6. Contact</h2>
      <p>
        For terms-related questions, contact{" "}
        <a href="mailto:support@pricebreakup.app">support@pricebreakup.app</a>.
      </p>
    </div>
  );
}
