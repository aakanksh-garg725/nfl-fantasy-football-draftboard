import { redirect } from "next/navigation";

export default async function SpectateRootPage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  const { draftId } = await params;
  redirect(`/spectate/${draftId}/board`);
}
