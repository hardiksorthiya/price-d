export default function PrivacyPolicyPage() {
  return (
    <div className="container py-4" style={{ maxWidth: 900 }}>
      <h1 className="h3 mb-3">Privacy Policy</h1>
      <p className="text-muted">Last updated: April 2026</p>

      <h2 className="h5 mt-4">1. Information We Collect</h2>
      <p>
        Price Breakup collects only the data required to provide pricing features,
        such as shop configuration, product/variant references, and pricing inputs
        entered by the merchant.
      </p>

      <h2 className="h5 mt-4">2. How We Use Information</h2>
      <p>
        We use collected information to calculate and display product price
        breakup data, synchronize configured prices, and provide app support.
      </p>

      <h2 className="h5 mt-4">3. Data Sharing</h2>
      <p>
        We do not sell merchant data. We only process data necessary for app
        functionality and platform compliance.
      </p>

      <h2 className="h5 mt-4">4. Data Retention</h2>
      <p>
        Data is retained while the app remains installed and may be deleted on
        uninstall or by merchant request.
      </p>

      <h2 className="h5 mt-4">5. Contact</h2>
      <p>
        For privacy-related questions, contact{" "}
        <a href="mailto:support@pricebreakup.app">support@pricebreakup.app</a>.
      </p>
    </div>
  );
}
