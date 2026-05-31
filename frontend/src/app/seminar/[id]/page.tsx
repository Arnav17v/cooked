import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LandingCustomCursor } from "@/components/landing/landing-custom-cursor";
import { LandingNav } from "@/components/landing/landing-nav";
import { SeminarDetailView } from "@/components/seminar/seminar-detail-view";
import { getSeminarSessionById } from "@/lib/api";

import "../../landing-v3.css";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const seminar = await getSeminarSessionById(id);
  if (!seminar) {
    return { title: "Seminar not found | Am I Cooked?" };
  }
  return {
    title: `${seminar.title} | Seminars`,
    description: seminar.description.slice(0, 160),
  };
}

export default async function SeminarDetailPage({ params }: Props) {
  const { id } = await params;
  const seminar = await getSeminarSessionById(id);
  if (!seminar) notFound();

  return (
    <div className="landing-v3">
      <LandingCustomCursor />
      <LandingNav />
      <SeminarDetailView seminar={seminar} />
    </div>
  );
}
