import type { Metadata } from "next";
import { ShelfView } from "@/components/ShelfView";
import { counts } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Projects",
  description: `${counts.projects} ventures and studies, each built to test a claim about how a job ought to be done.`,
};

export default function ProjectsPage() {
  return <ShelfView shelf="projects" />;
}
