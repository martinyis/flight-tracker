import { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy - AirFare",
  description: "AirFare Privacy Policy - How we collect, use, and protect your data.",
};

export default function PrivacyPolicy() {
  return (
    <LegalPage title="Privacy Policy" lastUpdated="March 16, 2026">
      <p>
        <strong>Airfare</strong> (&quot;the App&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is operated by
        Stanislav Martin Babak (&quot;Developer&quot;). This Privacy Policy explains how
        we collect, use, disclose, and safeguard your information when you use
        our mobile application.
      </p>
      <p>
        <strong>
          By using the App, you agree to the collection and use of information
          in accordance with this policy. If you do not agree, please do not use
          the App.
        </strong>
      </p>

      <h2>1. Information We Collect</h2>

      <h3>1.1 Information You Provide</h3>
      <ul>
        <li>
          <strong>Account Information</strong>: When you sign in using Apple
          Sign-In or Google Sign-In, we receive your name, email address, and a
          unique account identifier from the authentication provider. If you use
          Apple&apos;s &quot;Hide My Email&quot; feature, we receive a relay email address
          instead.
        </li>
        <li>
          <strong>Flight Search Data</strong>: Origins, destinations, travel
          dates, passenger counts, cabin preferences, and filter settings (stops,
          airlines, duration, bags) you enter when searching for flights.
        </li>
        <li>
          <strong>Saved Searches</strong>: Flight searches you choose to save
          for price tracking.
        </li>
        <li>
          <strong>Transaction Records</strong>: Records of credit purchases and
          usage within the App.
        </li>
      </ul>

      <h3>1.2 Information Collected Automatically</h3>
      <ul>
        <li>
          <strong>Device Information</strong>: Device model, operating system
          version, and unique device identifiers for push notification delivery.
        </li>
        <li>
          <strong>Push Notification Tokens</strong>: If you enable push
          notifications, we collect your device token to send price alerts and
          updates.
        </li>
        <li>
          <strong>Usage Data</strong>: Timestamps of searches, application
          interactions, and feature usage for service improvement.
        </li>
      </ul>

      <h3>1.3 Information We Do NOT Collect</h3>
      <ul>
        <li>We do <strong>not</strong> collect precise geolocation data.</li>
        <li>
          We do <strong>not</strong> collect contacts, photos, or other personal
          files.
        </li>
        <li>
          We do <strong>not</strong> use cookies or web tracking technologies
          within the App.
        </li>
        <li>
          We do <strong>not</strong> collect payment card information directly.
          All in-app purchases are processed by Apple (App Store) or Google (Play
          Store).
        </li>
        <li>We do <strong>not</strong> collect biometric data.</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <table>
        <thead>
          <tr>
            <th>Purpose</th>
            <th>Legal Basis (GDPR)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Provide and maintain the App</td>
            <td>Performance of contract</td>
          </tr>
          <tr>
            <td>Process flight searches and display results</td>
            <td>Performance of contract</td>
          </tr>
          <tr>
            <td>Track flight prices and send price alerts</td>
            <td>Performance of contract</td>
          </tr>
          <tr>
            <td>Manage your account and credit balance</td>
            <td>Performance of contract</td>
          </tr>
          <tr>
            <td>Send push notifications (price alerts, updates)</td>
            <td>Consent</td>
          </tr>
          <tr>
            <td>Prevent fraud and abuse</td>
            <td>Legitimate interest</td>
          </tr>
          <tr>
            <td>Comply with legal obligations</td>
            <td>Legal obligation</td>
          </tr>
          <tr>
            <td>Improve and optimize the App</td>
            <td>Legitimate interest</td>
          </tr>
        </tbody>
      </table>

      <h2>3. How We Share Your Information</h2>
      <p>
        We do <strong>not</strong> sell, rent, or trade your personal
        information. We may share your data only in the following circumstances:
      </p>

      <h3>3.1 Service Providers</h3>
      <ul>
        <li>
          <strong>SerpAPI</strong>: We send your search parameters (origins,
          destinations, dates, filters) to SerpAPI to retrieve flight data.
          SerpAPI processes this data solely to return flight results.
        </li>
        <li>
          <strong>Apple / Google</strong>: In-app purchase transactions are
          processed by Apple (App Store) or Google (Play Store) under their
          respective privacy policies.
        </li>
        <li>
          <strong>Infrastructure Providers</strong>: We use cloud hosting
          providers to store and process data. These providers are contractually
          bound to protect your information.
        </li>
      </ul>

      <h3>3.2 Legal Requirements</h3>
      <p>
        We may disclose your information if required to do so by law or in
        response to valid requests by public authorities.
      </p>

      <h3>3.3 Business Transfers</h3>
      <p>
        If we are involved in a merger, acquisition, or sale of assets, your
        information may be transferred as part of that transaction. We will
        notify you before your information is transferred and becomes subject to
        a different privacy policy.
      </p>

      <h2>4. Data Retention</h2>
      <table>
        <thead>
          <tr>
            <th>Data Type</th>
            <th>Retention Period</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Account information</td>
            <td>Until you delete your account</td>
          </tr>
          <tr>
            <td>Flight search results</td>
            <td>Until the saved search is deleted or tracking expires</td>
          </tr>
          <tr>
            <td>Credit transaction history</td>
            <td>Until you delete your account (required for ledger integrity)</td>
          </tr>
          <tr>
            <td>Push notification tokens</td>
            <td>Until you disable notifications or delete your account</td>
          </tr>
        </tbody>
      </table>
      <p>
        When you delete your account, we permanently delete all your personal
        data within 30 days, except where retention is required by law.
      </p>

      <h2>5. Data Security</h2>
      <p>
        We implement appropriate technical and organizational measures to protect
        your personal information, including:
      </p>
      <ul>
        <li>Encrypted data transmission (TLS/HTTPS)</li>
        <li>Secure authentication via OAuth 2.0 (Apple/Google Sign-In)</li>
        <li>JWT-based session tokens with expiration and rotation</li>
        <li>Database access controls and secure infrastructure</li>
        <li>Serializable transaction isolation for financial operations</li>
      </ul>
      <p>
        No method of electronic transmission or storage is 100% secure. While we
        strive to use commercially acceptable means to protect your personal
        information, we cannot guarantee its absolute security.
      </p>

      <h2>6. Your Privacy Rights</h2>

      <h3>6.1 All Users</h3>
      <p>Regardless of your location, you have the right to:</p>
      <ul>
        <li><strong>Access</strong> your personal data</li>
        <li><strong>Correct</strong> inaccurate data</li>
        <li><strong>Delete</strong> your account and associated data</li>
        <li><strong>Export</strong> your data in a portable format</li>
        <li>
          <strong>Opt out</strong> of push notifications at any time via device
          settings
        </li>
      </ul>

      <h3>6.2 European Economic Area (EEA) Residents — GDPR</h3>
      <p>If you are in the EEA, you additionally have the right to:</p>
      <ul>
        <li><strong>Restrict processing</strong> of your personal data</li>
        <li>
          <strong>Object to processing</strong> based on legitimate interests
        </li>
        <li>
          <strong>Data portability</strong> — receive your data in a structured,
          machine-readable format
        </li>
        <li>
          <strong>Withdraw consent</strong> at any time without affecting prior
          processing
        </li>
        <li>
          <strong>Lodge a complaint</strong> with your local Data Protection
          Authority
        </li>
      </ul>
      <p>
        <strong>Data Controller</strong>: Stanislav Martin Babak
        <br />
        <strong>Contact</strong>: boromask@gmail.com
      </p>

      <h3>6.3 California Residents — CCPA/CPRA</h3>
      <p>If you are a California resident, you have the right to:</p>
      <ul>
        <li>
          <strong>Know</strong> what personal information we collect, use, and
          disclose
        </li>
        <li><strong>Delete</strong> your personal information</li>
        <li>
          <strong>Opt out of the sale</strong> of personal information —{" "}
          <strong>we do not sell your personal information</strong>
        </li>
        <li>
          <strong>Non-discrimination</strong> for exercising your privacy rights
        </li>
        <li><strong>Correct</strong> inaccurate personal information</li>
        <li>
          <strong>Limit use</strong> of sensitive personal information — we only
          use sensitive information to provide the service
        </li>
      </ul>

      <h3>6.4 Brazilian Residents — LGPD</h3>
      <p>If you are in Brazil, you have the right to:</p>
      <ul>
        <li><strong>Confirmation</strong> of the existence of data processing</li>
        <li><strong>Access</strong> to your data</li>
        <li>
          <strong>Correction</strong> of incomplete, inaccurate, or outdated data
        </li>
        <li>
          <strong>Anonymization, blocking, or deletion</strong> of unnecessary or
          excessive data
        </li>
        <li><strong>Data portability</strong></li>
        <li>
          <strong>Deletion</strong> of data processed with your consent
        </li>
        <li>
          <strong>Information</strong> about the possibility of denying consent
          and the consequences
        </li>
        <li><strong>Revocation of consent</strong></li>
      </ul>

      <h3>6.5 Canadian Residents — PIPEDA</h3>
      <p>If you are in Canada, you have the right to:</p>
      <ul>
        <li><strong>Access</strong> your personal information held by us</li>
        <li>
          <strong>Challenge the accuracy</strong> and completeness of your
          information
        </li>
        <li>
          <strong>Withdraw consent</strong> for the collection, use, or
          disclosure of your information
        </li>
      </ul>

      <h3>6.6 Exercising Your Rights</h3>
      <p>
        To exercise any of these rights, contact us at{" "}
        <strong>boromask@gmail.com</strong>. We will respond to your request
        within 30 days (or sooner if required by applicable law). You may also
        delete your account directly within the App under Settings.
      </p>

      <h2>7. International Data Transfers</h2>
      <p>
        Your information may be transferred to and processed in the United
        States, where our servers are located. If you are accessing the App from
        outside the United States, please be aware that your information may be
        transferred to, stored, and processed in a country that may not have the
        same data protection laws as your jurisdiction.
      </p>
      <p>
        For EEA residents, we rely on Standard Contractual Clauses (SCCs)
        approved by the European Commission to safeguard data transferred outside
        the EEA.
      </p>

      <h2>8. Children&apos;s Privacy</h2>
      <p>
        The App is not intended for children under the age of 13. We do not
        knowingly collect personal information from children under 13. If we
        discover that a child under 13 has provided us with personal information,
        we will promptly delete it. If you believe a child under 13 has provided
        us with personal data, please contact us at{" "}
        <strong>boromask@gmail.com</strong>.
      </p>

      <h2>9. Third-Party Links and Services</h2>
      <p>
        The App may display flight booking links that redirect you to third-party
        airline or travel agency websites. We are not responsible for the privacy
        practices of these third-party services. We encourage you to review their
        privacy policies before providing any personal information.
      </p>

      <h2>10. Push Notifications</h2>
      <p>
        You may opt in to receive push notifications for price alerts and
        updates. You can disable push notifications at any time through your
        device settings. Disabling push notifications will not affect the core
        functionality of the App.
      </p>

      <h2>11. In-App Purchases</h2>
      <p>
        All in-app purchases (credit packs) are processed through Apple&apos;s App
        Store or Google&apos;s Play Store. We do not collect or store your payment
        information. Please refer to{" "}
        <a href="https://www.apple.com/legal/privacy/">
          Apple&apos;s Privacy Policy
        </a>{" "}
        or{" "}
        <a href="https://policies.google.com/privacy">
          Google&apos;s Privacy Policy
        </a>{" "}
        for information on how they handle payment data.
      </p>

      <h2>12. Changes to This Privacy Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will notify you
        of any material changes by posting the updated policy within the App,
        updating the &quot;Last Updated&quot; date at the top of this page, and sending a
        push notification for significant changes (if you have notifications
        enabled).
      </p>
      <p>
        Your continued use of the App after any changes constitutes your
        acceptance of the updated Privacy Policy.
      </p>

      <h2>13. Contact Us</h2>
      <p>
        If you have any questions or concerns about this Privacy Policy, please
        contact us:
      </p>
      <p>
        <strong>Stanislav Martin Babak</strong>
        <br />
        Email: <strong>boromask@gmail.com</strong>
      </p>
      <p>
        For GDPR-related inquiries, you may also contact your local Data
        Protection Authority.
      </p>

      <hr />
      <p>
        <em>This Privacy Policy is effective as of March 16, 2026.</em>
      </p>
    </LegalPage>
  );
}
