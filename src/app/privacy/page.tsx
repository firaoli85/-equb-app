export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0b] px-6 py-12">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Privacy Policy</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Last updated: May 18, 2026</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">1. Who We Are</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
            Equb is a rotating savings group management platform operated by Firaoli Seboka,
            serving Equb group members in the DMV area. You can reach us at [YOUR EMAIL HERE].
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">2. Information We Collect</h2>
          <ul className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed space-y-2 list-disc pl-5">
            <li>Full name and phone number provided at registration</li>
            <li>Weekly contribution and payment records</li>
            <li>Payout history and wheel assignment</li>
            <li>Login activity and session tokens</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">3. How We Use Your Information</h2>
          <ul className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed space-y-2 list-disc pl-5">
            <li>To manage your Equb group membership and payment records</li>
            <li>To send SMS notifications including payment reminders, contribution confirmations, payout notifications, and group updates</li>
            <li>To provide member support and respond to review requests</li>
            <li>To generate member-facing documents such as payment receipts</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">4. SMS Messaging</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
            By providing your phone number you consent to receive SMS messages related to your Equb membership.
            Message frequency varies based on Equb activities and payment schedules.
            Message and data rates may apply. Reply <strong>STOP</strong> at any time to opt out.
            Reply <strong>HELP</strong> for assistance. You can also contact us at [YOUR EMAIL HERE].
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">5. Data Sharing</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
            We do not sell, rent, or share your personal information with third parties for marketing purposes.
            Your data is used solely for operating the Equb group and is accessible only to the group administrator.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">6. Data Security</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
            Member data is stored in a secured database hosted on Neon PostgreSQL. Access is protected by
            unique member tokens. We do not store passwords.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">7. Contact</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
            For questions about this policy or to request data deletion, contact us at: [YOUR EMAIL HERE]
          </p>
        </section>
      </div>
    </div>
  );
}
