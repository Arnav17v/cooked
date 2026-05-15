import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ resume_id: string }>;
}

/** Old `/notes/:id` URLs redirect into the dashboard notes tab. */
export default async function NotesResumeRedirect(props: PageProps) {
  const { resume_id } = await props.params;
  redirect(`/dashboard?resume=${encodeURIComponent(resume_id)}&tab=notes`);
}
