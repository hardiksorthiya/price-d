export default function AdditionalPage() {
  return (
    <div>
     
      
      <div className="container-fluid py-2 app-page-container">
        <div className="row g-3">
          <div className="col-12 col-xl-8">
          <div className="app-page-header app-page-header-bar">
        <h2 className="app-page-title">Information</h2>
      </div>
            <div className="card h-100 shadow-sm app-main-card">
              <div className="card-body">
                <h4 className="card-title app-section-title">
                  Price breakup metafield guide
                </h4>
                <p className="card-text mb-2 app-muted-text">
                  This app saves variant-level price breakup data that can be
                  used to build any custom storefront design in Liquid.
                </p>
                <p className="card-text mb-3 app-muted-text">
                  Metafield location:{" "}
                  <code>variant.metafields.app.price_breakup</code> (type:{" "}
                  <code>json</code>).
                </p>

                <h5 className="mb-2">Available data fields</h5>
                <div className="app-code-block mb-3">
                  <pre>
                    <code>{`{
  "metalType": "gold|silver|platinum",
  "goldKarat": "10|14|18|22",
  "diamondQuality": "VVS1",
  "diamondColor": "D",
  "taxPercentage": 3,
  "rows": {
    "metal": {
      "component": "Gold 22KT",
      "rate": 5632,
      "weight": 2.47,
      "finalValue": 13917
    },
    "diamond": {
      "component": "VVS1 / D",
      "rate": 19000,
      "weight": 0.39,
      "finalValue": 7410
    },
    "making": {
      "component": "Making Charges",
      "finalValue": 0
    }
  },
  "totals": {
    "subTotal": 25051,
    "tax": 752,
    "grandTotal": 25803
  }
}`}</code>
                  </pre>
                </div>

                <h5 className="mb-2">Use in theme Liquid</h5>
                <div className="app-code-block mb-3">
                  <pre>
                    <code>{`{% assign selected_variant = product.selected_or_first_available_variant %}
{% assign breakup = selected_variant.metafields.app.price_breakup.value %}

{{ breakup.rows.metal.component }}
{{ breakup.rows.metal.finalValue | times: 100 | round | money }}
{{ breakup.totals.grandTotal | times: 100 | round | money }}`}</code>
                  </pre>
                </div>

                <h5 className="mb-2">Simple full section example</h5>
                <p className="mb-2 app-muted-text">
                  Copy this simple version to your theme app block if you want
                  a clean and easy-to-understand implementation.
                </p>
                <div className="app-code-block">
                  <pre>
                    <code>{`{% assign selected_variant = product.selected_or_first_available_variant %}
{% assign breakup = selected_variant.metafields.app.price_breakup.value %}

{% if breakup != blank %}
  <div class="price-breakup">
    <h3>Price Breakup</h3>
    <table>
      <thead>
        <tr>
          <th>Component</th>
          <th>Rate</th>
          <th>Weight</th>
          <th>Final value</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>{{ breakup.rows.metal.component }}</td>
          <td>{{ breakup.rows.metal.rate | times: 100 | round | money }}</td>
          <td>{{ breakup.rows.metal.weight }} g</td>
          <td>{{ breakup.rows.metal.finalValue | times: 100 | round | money }}</td>
        </tr>
        <tr>
          <td>{{ breakup.rows.diamond.component }}</td>
          <td>{{ breakup.rows.diamond.rate | times: 100 | round | money }}</td>
          <td>{{ breakup.rows.diamond.weight }} ct</td>
          <td>{{ breakup.rows.diamond.finalValue | times: 100 | round | money }}</td>
        </tr>
        <tr>
          <td>Making Charges</td>
          <td>-</td>
          <td>-</td>
          <td>{{ breakup.rows.making.finalValue | times: 100 | round | money }}</td>
        </tr>
        <tr>
          <td><strong>Sub Total</strong></td>
          <td>-</td>
          <td>-</td>
          <td><strong>{{ breakup.totals.subTotal | times: 100 | round | money }}</strong></td>
        </tr>
        <tr>
          <td><strong>Tax ({{ breakup.taxPercentage }}%)</strong></td>
          <td>-</td>
          <td>-</td>
          <td><strong>{{ breakup.totals.tax | times: 100 | round | money }}</strong></td>
        </tr>
        <tr>
          <td><strong>Grand Total</strong></td>
          <td>-</td>
          <td>-</td>
          <td><strong>{{ breakup.totals.grandTotal | times: 100 | round | money }}</strong></td>
        </tr>
      </tbody>
    </table>
  </div>
{% else %}
  <p>Price breakup is not available for this variant yet.</p>
{% endif %}`}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-xl-4">
            <div className="card shadow-sm mb-3 app-side-card">
              <div className="card-body">
                <h5 className="card-title app-section-title">How data is generated</h5>
                <ul className="mb-0 ps-3">
                  <li>Go to Product price in the app.</li>
                  <li>Set metal, diamond, and making values per product.</li>
                  <li>Click Save product prices.</li>
                  <li>
                    App calculates totals and updates the variant metafield
                    automatically.
                  </li>
                </ul>
              </div>
            </div>

            <div className="card shadow-sm app-side-card">
              <div className="card-body">
                <h5 className="card-title app-section-title">References</h5>
                <ul className="mb-0 ps-3">
                  <li>
                    <a
                      href="https://shopify.dev/docs/apps/build/custom-data/metafields"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Shopify metafields
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://shopify.dev/docs/storefronts/themes/architecture/sections/section-schema"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Theme section schema
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
