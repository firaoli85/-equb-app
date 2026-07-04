"use client";

import { motion } from "motion/react";
import { usePathname } from "next/navigation";
import { motionTokens } from "@/lib/motion-tokens";

export function MemberPageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: motionTokens.duration.fast, ease: motionTokens.easing.smooth }}
    >
      {children}
    </motion.div>
  );
}
