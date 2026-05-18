"use client";

import { useTransition } from "react";
import Link from "next/link";
import { deleteMember, suspendFromWheel, reinstateToWheel } from "@/actions/members";
import { ReplaceMemberModal } from "@/components/admin/ReplaceMemberModal";

export function MemberActions({
  memberId,
  memberName,
  wheelNumber,
  weeklyAmountFormatted,
  wheelSuspended,
}: {
  memberId: string;
  memberName: string;
  wheelNumber: number;
  weeklyAmountFormatted: string;
  wheelSuspended: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Remove ${memberName} from the Equb? This permanently deletes their record.`)) return;
    startTransition(() => deleteMember(memberId));
  }

  function handleSuspend() {
    if (!confirm(`Suspend ${memberName} from the spin wheel?`)) return;
    startTransition(() => suspendFromWheel(memberId));
  }

  function handleReinstate() {
    startTransition(() => reinstateToWheel(memberId));
  }

  return (
    <div className="flex gap-2 items-center flex-wrap">
      <Link
        href={`/admin/members/${memberId}/edit`}
        className="text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
      >
        Edit
      </Link>
      <ReplaceMemberModal
        memberId={memberId}
        memberName={memberName}
        wheelNumber={wheelNumber}
        weeklyAmountFormatted={weeklyAmountFormatted}
      />
      {wheelSuspended ? (
        <button
          onClick={handleReinstate}
          disabled={isPending}
          className="text-xs text-amber-500 dark:text-amber-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors disabled:opacity-50 font-semibold"
        >
          Reinstate
        </button>
      ) : (
        <button
          onClick={handleSuspend}
          disabled={isPending}
          className="text-xs text-gray-400 dark:text-gray-500 hover:text-amber-500 dark:hover:text-amber-400 transition-colors disabled:opacity-50 font-medium"
        >
          Suspend
        </button>
      )}
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50 font-medium"
      >
        Remove
      </button>
    </div>
  );
}
