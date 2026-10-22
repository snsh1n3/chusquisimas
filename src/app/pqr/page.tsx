import type { Metadata } from "next";
import { LegalPageView } from "@/components/legal/legal-page-view";
import { getLegalPage } from "@/lib/legal/legal-pages";

const page = getLegalPage("pqr");

export const metadata: Metadata = {
  title: page.title,
  description: page.description,
  alternates: { canonical: "/pqr" },
};

export default function Page() {
  return <LegalPageView page={page} />;
}
