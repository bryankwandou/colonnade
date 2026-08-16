import type { Metadata } from "next";
import { ShelfView } from "@/components/ShelfView";
import { counts } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Tools",
  description: `${counts.tools} tools you open and operate: editors, scanners, meters, and agent rails.`,
};

export default function ToolsPage() {
  return <ShelfView shelf="tools" />;
}
