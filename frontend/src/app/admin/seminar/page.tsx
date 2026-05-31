import { notFound } from "next/navigation";

import { SeminarAdminForm } from "@/components/seminar/seminar-admin-form";

import "../../landing-v3.css";

export default function AdminSeminarPage() {
  if (process.env.NEXT_PUBLIC_DEV !== "1") {
    notFound();
  }

  return <SeminarAdminForm />;
}
