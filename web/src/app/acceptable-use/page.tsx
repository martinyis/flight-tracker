import { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Acceptable Use Policy - AirFare",
  description: "AirFare Acceptable Use Policy - Rules for fair usage of the app.",
};

export default function AcceptableUse() {
  return (
    <LegalPage title="Acceptable Use Policy" lastUpdated="March 16, 2026">
      <p>
        This Acceptable Use Policy (&quot;AUP&quot;) governs your use of the{" "}
        <strong>Airfare</strong> mobile application (&quot;the App&quot;). By using the App,
        you agree to comply with this policy.
      </p>

      <h2>1. Permitted Use</h2>
      <p>The App is designed for personal, non-commercial use to:</p>
      <ul>
        <li>Search for flight prices and availability</li>
        <li>Save and track flight prices over time</li>
        <li>Receive notifications about price changes</li>
        <li>Purchase and use credits to access premium features</li>
      </ul>

      <h2>2. Prohibited Activities</h2>
      <p>
        You agree <strong>not</strong> to engage in any of the following:
      </p>

      <h3>2.1 System Abuse</h3>
      <ul>
        <li>
          Using bots, scripts, crawlers, or automated tools to access the App
        </li>
        <li>
          Attempting to bypass rate limits, security controls, or access
          restrictions
        </li>
        <li>
          Overloading, flooding, or interfering with the App&apos;s servers or
          infrastructure
        </li>
        <li>Exploiting bugs or vulnerabilities instead of reporting them</li>
      </ul>

      <h3>2.2 Account Abuse</h3>
      <ul>
        <li>
          Creating multiple accounts to exploit signup bonuses or promotions
        </li>
        <li>
          Sharing, selling, or transferring your account or credits to others
        </li>
        <li>Using another person&apos;s account without their permission</li>
        <li>Providing false or misleading information during sign-in</li>
      </ul>

      <h3>2.3 Data Abuse</h3>
      <ul>
        <li>
          Scraping, harvesting, or systematically collecting flight data from the
          App
        </li>
        <li>
          Redistributing, reselling, or commercially exploiting flight data
          obtained from the App
        </li>
        <li>
          Using the App&apos;s data to build or enhance a competing product or
          service
        </li>
      </ul>

      <h3>2.4 Legal Violations</h3>
      <ul>
        <li>
          Using the App for any purpose that violates applicable laws or
          regulations
        </li>
        <li>
          Using the App in connection with fraudulent, deceptive, or misleading
          activities
        </li>
        <li>
          Infringing on the intellectual property rights of the App or any third
          party
        </li>
      </ul>

      <h2>3. Fair Use of Credits</h2>
      <ul>
        <li>
          Credits are intended for personal flight search and tracking use.
        </li>
        <li>
          Patterns of usage that suggest automated, bulk, or commercial use may
          result in account suspension.
        </li>
        <li>
          The App reserves the right to limit credit purchases or usage if abuse
          is detected.
        </li>
      </ul>

      <h2>4. Reporting Violations</h2>
      <p>
        If you become aware of any violation of this AUP, please report it to{" "}
        <strong>boromask@gmail.com</strong>.
      </p>

      <h2>5. Enforcement</h2>
      <p>Violations of this AUP may result in:</p>
      <ol>
        <li>
          <strong>Warning</strong>: A notice describing the violation and
          requesting corrective action.
        </li>
        <li>
          <strong>Temporary suspension</strong>: Your account may be temporarily
          restricted while the violation is investigated.
        </li>
        <li>
          <strong>Permanent termination</strong>: Your account may be permanently
          deleted, with forfeiture of all remaining credits.
        </li>
      </ol>
      <p>
        We reserve the right to take enforcement action at our sole discretion,
        without prior warning if the violation is severe.
      </p>

      <h2>6. Changes</h2>
      <p>
        We may update this AUP from time to time. Continued use of the App
        constitutes acceptance of any changes.
      </p>

      <h2>7. Contact</h2>
      <p>For questions about this Acceptable Use Policy:</p>
      <p>
        <strong>Stanislav Martin Babak</strong>
        <br />
        Email: <strong>boromask@gmail.com</strong>
      </p>

      <hr />
      <p>
        <em>
          This Acceptable Use Policy is effective as of March 16, 2026.
        </em>
      </p>
    </LegalPage>
  );
}
