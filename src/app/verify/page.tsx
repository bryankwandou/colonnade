import type { Metadata } from "next";
import { VerifyPanel } from "@/components/VerifyPanel";

export const metadata: Metadata = {
  title: "Verify",
  description:
    "Fold the catalogue into one fingerprint, write it to Solana devnet, and check any earlier attestation against what the shelf says today.",
};

export default function VerifyPage() {
  return <VerifyPanel />;
}
