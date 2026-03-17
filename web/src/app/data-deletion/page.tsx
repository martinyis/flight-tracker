import { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Data Deletion Policy - AirFare",
  description: "AirFare Data Deletion Policy - How to delete your account and data.",
};

export default function DataDeletion() {
  return (
    <LegalPage title="Data Deletion Policy" lastUpdated="March 16, 2026">
      <p>
        <strong>Airfare</strong> (&quot;the App&quot;) is committed to giving you full
        control over your personal data. This policy explains how you can request
        the deletion of your data and what happens when you do.
      </p>

      <h2>1. How to Delete Your Account and Data</h2>

      <h3>Option 1: In-App Deletion (Recommended)</h3>
      <ol>
        <li>Open the App</li>
        <li>
          Go to <strong>Settings</strong>
        </li>
        <li>
          Tap <strong>Delete Account</strong>
        </li>
        <li>Confirm your decision</li>
      </ol>
      <p>
        Your account and all associated data will be permanently deleted.
      </p>

      <h3>Option 2: Email Request</h3>
      <p>
        Send an email to <strong>boromask@gmail.com</strong> with:
      </p>
      <ul>
        <li>
          <strong>Subject</strong>: &quot;Account Deletion Request&quot;
        </li>
        <li>
          <strong>Body</strong>: Your registered email address or Apple/Google
          account identifier
        </li>
      </ul>
      <p>
        We will process your request within <strong>30 days</strong> and send a
        confirmation when complete.
      </p>

      <h2>2. What Data Is Deleted</h2>
      <p>
        When you delete your account, the following data is{" "}
        <strong>permanently deleted</strong>:
      </p>
      <table>
        <thead>
          <tr>
            <th>Data Type</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Account profile (name, email)</td>
            <td>Permanently deleted</td>
          </tr>
          <tr>
            <td>All saved flight searches</td>
            <td>Permanently deleted</td>
          </tr>
          <tr>
            <td>Flight search history</td>
            <td>Permanently deleted</td>
          </tr>
          <tr>
            <td>Price tracking data and alerts</td>
            <td>Permanently deleted</td>
          </tr>
          <tr>
            <td>Credit balance and transaction history</td>
            <td>Permanently deleted</td>
          </tr>
          <tr>
            <td>Push notification tokens</td>
            <td>Permanently deleted</td>
          </tr>
          <tr>
            <td>Authentication tokens</td>
            <td>Immediately invalidated</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Data Retention After Deletion</h2>
      <p>After account deletion:</p>
      <ul>
        <li>
          <strong>Immediate</strong>: Authentication tokens are invalidated; you
          are signed out.
        </li>
        <li>
          <strong>Within 30 days</strong>: All personal data is permanently
          removed from our active databases and backups.
        </li>
        <li>
          <strong>Exception</strong>: We may retain anonymized, aggregated data
          that cannot be linked back to you (e.g., total search counts for
          internal analytics).
        </li>
        <li>
          <strong>Legal obligation</strong>: If we are required by law to retain
          certain data (e.g., financial records for tax purposes), we will retain
          only the minimum data necessary and only for the legally required
          period.
        </li>
      </ul>

      <h2>4. In-App Purchase Records</h2>
      <ul>
        <li>
          Records of in-app purchases made through the Apple App Store or Google
          Play Store are maintained by Apple or Google, respectively.
        </li>
        <li>
          Deleting your Airfare account does <strong>not</strong> delete your
          purchase history with Apple or Google.
        </li>
        <li>
          To manage those records, contact Apple Support or Google Play Support.
        </li>
      </ul>

      <h2>5. Irreversibility</h2>
      <p>
        Account deletion is <strong>permanent and irreversible</strong>. Once
        deleted:
      </p>
      <ul>
        <li>Your account cannot be recovered</li>
        <li>Your credit balance is forfeited</li>
        <li>Your saved searches and price tracking history are lost</li>
        <li>If you wish to use the App again, you must create a new account</li>
      </ul>

      <h2>6. Partial Data Deletion</h2>
      <p>
        If you wish to delete specific data without deleting your entire account,
        you can:
      </p>
      <ul>
        <li>
          <strong>Delete individual saved searches</strong>: Swipe to delete in
          the App
        </li>
        <li>
          <strong>Disable price tracking</strong>: Turn off tracking for specific
          searches
        </li>
        <li>
          <strong>Disable push notifications</strong>: Through your device
          settings
        </li>
      </ul>
      <p>
        For other partial deletion requests, contact us at{" "}
        <strong>boromask@gmail.com</strong>.
      </p>

      <h2>7. Contact</h2>
      <p>For questions about data deletion:</p>
      <p>
        <strong>Stanislav Martin Babak</strong>
        <br />
        Email: <strong>boromask@gmail.com</strong>
      </p>

      <hr />
      <p>
        <em>This Data Deletion Policy is effective as of March 16, 2026.</em>
      </p>
    </LegalPage>
  );
}
