import { updateDisplayPreference } from "@/actions/members";

const OPTIONS = [
  { pref: "AMHARIC" as const, label: "አማርኛ" },
  { pref: "ENGLISH" as const, label: "EN" },
];

export function NameToggle({
  token,
  current,
}: {
  token: string;
  current: "AMHARIC" | "ENGLISH";
}) {
  return (
    <div className="inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-1 gap-1">
      {OPTIONS.map(({ pref, label }) => {
        const isActive = current === pref;
        const action = updateDisplayPreference.bind(null, token, pref);
        return (
          <form key={pref} action={action}>
            <button
              type="submit"
              style={{ minHeight: "44px", minWidth: "44px", touchAction: "manipulation" }}
              className={`px-4 text-sm font-bold rounded-full transition-colors select-none ${
                isActive
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 active:bg-gray-200 dark:active:bg-gray-700"
              }`}
            >
              {label}
            </button>
          </form>
        );
      })}
    </div>
  );
}
