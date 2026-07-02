import { PlaceDetail } from "@/components/PlaceDetail";
import { getAllPlaces, getPlaceBySlug } from "@/lib/places";
import { notFound } from "next/navigation";

interface PlacePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllPlaces().map((place) => ({ slug: place.slug }));
}

export async function generateMetadata({ params }: PlacePageProps) {
  const { slug } = await params;
  const place = getPlaceBySlug(slug);
  if (!place) return { title: "Place not found" };

  const name =
    typeof place.name === "string" ? place.name : place.name.en;

  return {
    title: `${name} | Daedongyeojido`,
    description: place.description.en,
  };
}

export default async function PlacePage({ params }: PlacePageProps) {
  const { slug } = await params;
  const place = getPlaceBySlug(slug);

  if (!place) {
    notFound();
  }

  return <PlaceDetail place={place} />;
}
