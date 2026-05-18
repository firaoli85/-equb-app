export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0b] px-6 py-12">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Terms of Service</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Last updated: May 18, 2026</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">1. Acceptance</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
            By joining and using the Equb platform you agree to these terms. If you do not agree, do not use the platform.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">2. What Equb Is</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
            Equb is a private rotating savings group management tool. Members contribute a fixed weekly amount.
            One member receives the full pot each week based on a predetermined wheel assignment.
            The platform tracks payments, payouts, and group activity.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">3. Member Responsibilities</h2>
          <ul className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed space-y-2 list-disc pl-5">
            <li>Make weekly contributions on time as agreed with the group administrator</li>
            <li>Keep your contact information accurate</li>
            <li>Not share your private member link or access token with others</li>
            <li>Contact the administrator promptly if you are unable to make a payment</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">4. SMS Communications</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
            By participating you consent to receive SMS messages related to your Equb membership including
            payment reminders, payout notifications, and group updates. Message and data rates may apply.
            Reply <strong>STOP</strong> to opt out. Reply <strong>HELP</strong> for help.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">5. No Financial Guarantee</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
            Equb is a community savings arrangement. The platform does not guarantee payouts and is not
            a licensed financial institution. Participation is based on mutual trust among group members.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">6. Termination</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
            The administrator may remove a member from the platform for non-payment or breach of these terms.
            Members who have already received a payout remain financially obligated to the group for the
            remainder of the cycle.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">7. Governing Law</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
            These terms are governed by the laws of the State of Maryland, United States.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">8. Contact</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
            Questions about these terms: [YOUR EMAIL HERE]
          </p>
        </section>
      </div>
    </div>
  );
}
