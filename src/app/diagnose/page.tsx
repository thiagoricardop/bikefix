import type { Metadata } from "next";
import { DiagnosticWizard } from "@/components/diagnostic/diagnostic-wizard";
import { getCanonicalUrl } from "@/lib/seo/site-url";

export const metadata: Metadata = {
  title: "Guided symptom check",
  description: "Use curated bicycle symptom questions to find a safer next step. This is educational guidance, not a confirmed diagnosis.",
  robots: { index: false, follow: true },
  ...(getCanonicalUrl("/diagnose") ? { alternates: { canonical: getCanonicalUrl("/diagnose") } } : {}),
};

type DiagnosePageProps = {
  searchParams: Promise<{ symptom?: string; bicycleType?: string }>;
};

export default async function DiagnosePage({ searchParams }: DiagnosePageProps) {
  const params = await searchParams;
  return <DiagnosticWizard initialSymptomId={params.symptom} initialBicycleType={params.bicycleType} />;
}
