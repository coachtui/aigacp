import { notFound } from "next/navigation";
import { MOCK_PROJECTS } from "@/lib/mock/projects";
import { ProjectCommandCenterClient } from "./client";

type Params = Promise<{ projectId: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { projectId } = await params;
  const project = MOCK_PROJECTS.find((p) => p.id === projectId);
  return { title: project ? `${project.name} — Command Center` : "Project Not Found" };
}

export default async function ProjectCommandCenterPage({ params }: { params: Params }) {
  const { projectId } = await params;
  const project = MOCK_PROJECTS.find((p) => p.id === projectId);
  if (!project) notFound();

  return <ProjectCommandCenterClient projectId={projectId} />;
}
