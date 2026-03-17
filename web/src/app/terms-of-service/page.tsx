import { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service - AirFare",
  description: "AirFare Terms of Service - Rules and conditions for using the app.",
};

export default function TermsOfService() {
  return (
    <LegalPage title="Terms of Service" lastUpdated="March 16, 2026">
      <p>
        Welcome to <strong>Airfare</strong> (&quot;the App&quot;, &quot;we&quot;, &quot;us&quot;, or
        &quot;our&quot;), operated by Stanislav Martin Babak (&quot;Developer&quot;). These Terms
        of Service (&quot;Terms&quot;) govern your access to and use of the App.
      </p>
      <p>
        <strong>
          By creating an account or using the App, you agree to be bound by
          these Terms. If you do not agree, do not use the App.
        </strong>
      </p>

      <h2>1. Eligibility</h2>
      <p>
        You must be at least <strong>13 years old</strong> to use the App. By
        using the App, you represent and warrant that you meet this age
        requirement. If you are under 18, you represent that your parent or legal
        guardian has reviewed and agreed to these Terms on your behalf.
      </p>

      <h2>2. Account Registration</h2>

      <h3>2.1 Sign-In Methods</h3>
      <p>
        The App requires authentication via Apple Sign-In or Google Sign-In. You
        are responsible for maintaining the security of your authentication
        credentials.
      </p>

      <h3>2.2 Account Responsibility</h3>
      <p>
        You are responsible for all activity that occurs under your account. You
        agree to:
      </p>
      <ul>
        <li>Provide accurate information during sign-in</li>
        <li>Not share your account with others</li>
        <li>Notify us immediately of any unauthorized access to your account</li>
        <li>
          Not create multiple accounts to abuse the credits system or any other
          feature
        </li>
      </ul>

      <h3>2.3 Account Termination</h3>
      <p>
        We reserve the right to suspend or terminate your account at any time if
        you violate these Terms, engage in fraudulent activity, or abuse the
        service. You may delete your account at any time through the App&apos;s
        Settings.
      </p>

      <h2>3. Credits System and Purchases</h2>

      <h3>3.1 Credits</h3>
      <p>The App uses a virtual credits system to access premium features:</p>
      <ul>
        <li>
          <strong>New users</strong> receive a one-time signup bonus of free
          credits.
        </li>
        <li>
          <strong>Additional credits</strong> may be purchased through in-app
          purchases.
        </li>
        <li>Credits are used to perform flight searches and enable price tracking.</li>
        <li>
          Credit costs vary based on the complexity of your search (number of
          route combinations and tracking duration).
        </li>
      </ul>

      <h3>3.2 In-App Purchases</h3>
      <ul>
        <li>
          All credit purchases are processed through the Apple App Store or
          Google Play Store.
        </li>
        <li>
          Prices are displayed in your local currency and may vary by region.
        </li>
        <li>
          Purchases are subject to the terms and conditions of Apple or Google,
          as applicable.
        </li>
        <li>
          You must be authorized to use the payment method associated with your
          App Store or Play Store account.
        </li>
      </ul>

      <h3>3.3 Refund Policy</h3>
      <ul>
        <li>
          <strong>Refunds for in-app purchases</strong> are handled by Apple or
          Google, as applicable. Please contact Apple Support or Google Play
          Support to request a refund.
        </li>
        <li>
          <strong>Credit refunds within the App</strong>: If a flight search
          fails due to a service error on our end, the credits spent on that
          search will be automatically refunded to your account balance.
        </li>
        <li>
          Credits have <strong>no cash value</strong> and cannot be exchanged,
          transferred, or redeemed for real currency.
        </li>
        <li>
          <strong>Unused credits do not expire</strong> unless your account is
          deleted.
        </li>
      </ul>

      <h3>3.4 Duplicate Search Protection</h3>
      <p>
        To prevent accidental credit waste, searches with identical parameters
        made within 24 hours will return cached results at no additional credit
        cost.
      </p>

      <h2>4. Flight Data and Price Tracking</h2>

      <h3>4.1 Flight Information</h3>
      <ul>
        <li>
          Flight search results are provided by third-party data sources and are
          displayed for <strong>informational purposes only</strong>.
        </li>
        <li>
          We do <strong>not</strong> guarantee the accuracy, completeness, or
          availability of flight data, prices, or schedules.
        </li>
        <li>
          Prices shown in the App are estimates and may differ from the actual
          price at the time of booking on an airline or travel agency website.
        </li>
        <li>
          We are <strong>not</strong> a travel agency and do <strong>not</strong>{" "}
          sell airline tickets.
        </li>
      </ul>

      <h3>4.2 Price Tracking</h3>
      <ul>
        <li>
          Price tracking monitors flight prices at regular intervals and notifies
          you of changes.
        </li>
        <li>
          Price tracking is active for the duration you select (7, 14, or 30
          days, or until departure).
        </li>
        <li>
          Tracking automatically deactivates when the selected duration expires.
        </li>
        <li>
          We do <strong>not</strong> guarantee that you will be notified of every
          price change.
        </li>
      </ul>

      <h3>4.3 Booking</h3>
      <ul>
        <li>
          When you click on a flight result, you will be redirected to a
          third-party website (airline or travel agency) to complete your
          booking.
        </li>
        <li>
          We are <strong>not</strong> a party to any booking transaction. Your
          booking is subject to the terms and conditions of the airline or travel
          agency.
        </li>
        <li>
          We are <strong>not</strong> responsible for any issues arising from
          bookings made through third-party websites.
        </li>
      </ul>

      <h2>5. Acceptable Use</h2>
      <p>
        You agree <strong>not</strong> to:
      </p>
      <ul>
        <li>Use the App for any unlawful purpose</li>
        <li>
          Attempt to gain unauthorized access to the App, its servers, or related
          systems
        </li>
        <li>
          Use automated scripts, bots, scrapers, or similar tools to access the
          App
        </li>
        <li>Interfere with or disrupt the App&apos;s infrastructure</li>
        <li>Reverse engineer, decompile, or disassemble the App</li>
        <li>Circumvent any security features or access controls</li>
        <li>
          Create multiple accounts to abuse the free credits bonus or any
          promotional offers
        </li>
        <li>
          Resell, redistribute, or commercially exploit the App or its data
        </li>
        <li>
          Use the App in any manner that could damage, disable, or impair the
          service
        </li>
        <li>Harass, abuse, or harm other users or Developer personnel</li>
      </ul>
      <p>
        Violation of these terms may result in immediate suspension or
        termination of your account without refund of any remaining credits.
      </p>

      <h2>6. Intellectual Property</h2>

      <h3>6.1 Our Property</h3>
      <p>
        The App, including its design, features, code, content, logos, and
        trademarks, is owned by Stanislav Martin Babak and protected by
        intellectual property laws. You may not copy, modify, distribute, or
        create derivative works of the App.
      </p>

      <h3>6.2 Your Data</h3>
      <p>
        You retain ownership of any personal data you provide to the App. By
        using the App, you grant us a limited, non-exclusive license to use,
        process, and store your data solely to provide and improve the service.
      </p>

      <h3>6.3 Feedback</h3>
      <p>
        If you provide feedback, suggestions, or ideas about the App, you grant
        us a non-exclusive, royalty-free, perpetual, and irrevocable license to
        use, modify, and incorporate that feedback into the App without
        obligation to you.
      </p>

      <h2>7. Disclaimers</h2>

      <h3>7.1 &quot;As Is&quot; Service</h3>
      <p>
        THE APP IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS, WITHOUT
        WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT
        LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
        PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
      </p>

      <h3>7.2 No Guarantee</h3>
      <p>WE DO NOT WARRANT THAT:</p>
      <ul>
        <li>The App will be uninterrupted, error-free, or secure</li>
        <li>Flight data will be accurate, complete, or current</li>
        <li>Price tracking will capture every price change</li>
        <li>The App will meet your specific requirements</li>
        <li>Defects will be corrected in a timely manner</li>
      </ul>

      <h3>7.3 Third-Party Services</h3>
      <p>
        WE ARE NOT RESPONSIBLE FOR THE AVAILABILITY, ACCURACY, OR CONTENT OF
        THIRD-PARTY SERVICES, INCLUDING AIRLINES, TRAVEL AGENCIES, AND DATA
        PROVIDERS.
      </p>

      <h2>8. Limitation of Liability</h2>
      <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:</p>
      <ul>
        <li>
          <strong>Stanislav Martin Babak</strong> shall not be liable for any
          indirect, incidental, special, consequential, or punitive damages
          arising out of or relating to your use of the App.
        </li>
        <li>
          Our total liability for any claims arising from your use of the App
          shall not exceed the amount you have paid to us in in-app purchases in
          the <strong>12 months</strong> preceding the claim.
        </li>
        <li>
          We are not liable for any losses arising from flight bookings, travel
          arrangements, or price changes.
        </li>
      </ul>
      <p>
        <strong>
          Some jurisdictions do not allow the exclusion of certain warranties or
          limitation of liability, so the above limitations may not apply to you.
        </strong>
      </p>

      <h2>9. Indemnification</h2>
      <p>
        You agree to indemnify, defend, and hold harmless Stanislav Martin Babak
        from and against any claims, damages, losses, liabilities, and expenses
        arising out of or related to your use of the App, your violation of these
        Terms, your violation of any third-party rights, or any booking or
        transaction you make through third-party links in the App.
      </p>

      <h2>10. Changes to These Terms</h2>
      <p>
        We may modify these Terms at any time. We will notify you of material
        changes by posting the updated Terms within the App and updating the
        &quot;Last Updated&quot; date at the top of this page.
      </p>
      <p>
        Your continued use of the App after changes are posted constitutes your
        acceptance of the revised Terms. If you do not agree to the updated
        Terms, you must stop using the App and delete your account.
      </p>

      <h2>11. Governing Law and Disputes</h2>

      <h3>11.1 Governing Law</h3>
      <p>
        These Terms are governed by and construed in accordance with the laws of
        the <strong>United States</strong> and the <strong>State of California</strong>, without regard to its conflict of law
        principles.
      </p>

      <h3>11.2 Dispute Resolution</h3>
      <ol>
        <li>
          <strong>Informal Resolution</strong>: You agree to first attempt to
          resolve any dispute informally by contacting us at
          boromask@gmail.com. We will attempt to resolve the dispute within 30
          days.
        </li>
        <li>
          <strong>Binding Arbitration</strong>: If informal resolution fails, the
          dispute shall be resolved by binding arbitration administered by the
          American Arbitration Association (AAA) under its Consumer Arbitration
          Rules.
        </li>
        <li>
          <strong>Class Action Waiver</strong>: You agree that any dispute
          resolution will be conducted on an individual basis and not as a class
          action or other representative proceeding.
        </li>
      </ol>

      <h3>11.3 Exceptions</h3>
      <p>The following disputes are exempt from the arbitration requirement:</p>
      <ul>
        <li>Claims that qualify for small claims court</li>
        <li>
          Requests for injunctive relief to protect intellectual property rights
        </li>
      </ul>

      <h2>12. Apple-Specific Terms</h2>
      <p>
        If you access the App through the Apple App Store, you agree to the
        following additional terms:
      </p>
      <ul>
        <li>
          These Terms are between you and Stanislav Martin Babak,{" "}
          <strong>not</strong> Apple Inc.
        </li>
        <li>
          Apple has no obligation to provide maintenance or support for the App.
        </li>
        <li>
          In the event of any failure of the App to conform to applicable
          warranties, you may notify Apple for a refund of the purchase price (if
          any). Apple has no other warranty obligation.
        </li>
        <li>
          Apple is not responsible for addressing any claims related to the App.
        </li>
        <li>
          Apple and its subsidiaries are third-party beneficiaries of these Terms
          and may enforce them against you.
        </li>
      </ul>

      <h2>13. Google Play-Specific Terms</h2>
      <p>
        If you access the App through Google Play, you agree to the following
        additional terms:
      </p>
      <ul>
        <li>
          These Terms are between you and Stanislav Martin Babak,{" "}
          <strong>not</strong> Google LLC.
        </li>
        <li>
          Google has no obligation to provide maintenance or support for the App.
        </li>
        <li>
          Google is not responsible for addressing any claims related to the App.
        </li>
      </ul>

      <h2>14. Severability</h2>
      <p>
        If any provision of these Terms is found to be unenforceable or invalid,
        that provision will be limited or eliminated to the minimum extent
        necessary, and the remaining provisions will remain in full force and
        effect.
      </p>

      <h2>15. Entire Agreement</h2>
      <p>
        These Terms, together with our Privacy Policy and any other policies
        referenced herein, constitute the entire agreement between you and
        Stanislav Martin Babak regarding your use of the App.
      </p>

      <h2>16. Contact Us</h2>
      <p>
        If you have any questions about these Terms, please contact us:
      </p>
      <p>
        <strong>Stanislav Martin Babak</strong>
        <br />
        Email: <strong>boromask@gmail.com</strong>
      </p>

      <hr />
      <p>
        <em>These Terms of Service are effective as of March 16, 2026.</em>
      </p>
    </LegalPage>
  );
}
