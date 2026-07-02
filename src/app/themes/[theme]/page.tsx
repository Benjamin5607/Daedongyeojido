import { ThemeBrowsePage } from "@/components/ThemeBrowsePage";
import { THEMES, type ThemeId } from "@/types";
import { notFound } from "next/navigation";

interface ThemePageProps {
  params: Promise<{ theme: string }>;
}

export async function generateStaticParams() {
  return THEMES.map((theme) => ({ theme }));
}

export async function generateMetadata({ params }: ThemePageProps) {
  const { theme } = await params;
  const labels: Record<ThemeId, string> = {
    "k-food": "K-Food & Restaurants",
    hallyu: "Hallyu & Entertainment",
    "k-beauty": "K-Beauty & Wellness",
    "k-culture": "Culture & Daily Life",
    "urban-nature": "Urban Nature & Outdoors",
  };

  if (!THEMES.includes(theme as ThemeId)) {
    return { title: "Category not found" };
  }

  return {
    title: `${labels[theme as ThemeId]} | Daedongyeojido`,
    description: `Discover the best ${labels[theme as ThemeId].toLowerCase()} across Korea.`,
  };
}

export default async function ThemeRoute({ params }: ThemePageProps) {
  const { theme } = await params;

  if (!THEMES.includes(theme as ThemeId)) {
    notFound();
  }

  return <ThemeBrowsePage theme={theme as ThemeId} />;
}
