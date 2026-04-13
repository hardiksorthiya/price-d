export default function SupportPage() {
  return (
    <div className="container py-4" style={{ maxWidth: 900 }}>
      <h1 className="h3 mb-3">App Support</h1>
      <p className="text-muted">We are here to help.</p>

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <h2 className="h5">Support Channels</h2>
          <ul className="mb-0">
            <li>
              Email:{" "}
              <a href="mailto:support@pricebreakup.app">support@pricebreakup.app</a>
            </li>
            <li>Response time: within 24 business hours (priority for paid plans)</li>
          </ul>
        </div>
      </div>

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <h2 className="h5">Before Contacting Support</h2>
          <ul className="mb-0">
            <li>Confirm your active plan on the Plans page</li>
            <li>Check Product Price page values are saved</li>
            <li>Verify Price Breakup app block is added in Theme Editor</li>
          </ul>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <h2 className="h5">Include in your message</h2>
          <ul className="mb-0">
            <li>Shop domain</li>
            <li>Product URL or product handle</li>
            <li>Screenshots and error details</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
