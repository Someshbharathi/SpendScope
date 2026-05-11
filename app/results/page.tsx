import type { Metadata } from "next";

import { ResultsClient } from "@/components/results/results-client";

export const metadata: Metadata = {
  title: "Audit results — SpendScope Spend Audit",
  description: "Savings recommendations from your AI spend audit.",
};

export default function ResultsPage() {
  return <ResultsClient />;
}
