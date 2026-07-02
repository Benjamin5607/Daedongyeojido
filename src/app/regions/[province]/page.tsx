import { ProvincePage } from "@/components/ProvincePage";
import { getAllPlaces } from "@/lib/places";
import regionLabels from "@/data/region_labels.json";
import { notFound } from "next/navigation";

interface ProvinceRouteProps {
  params: Promise<{ province: string }>;
}

export async function generateStaticParams() {
  const provinces = Object.keys(regionLabels.provinces);
  const usedProvinces = new Set(
    getAllPlaces()
      .map((place) => place.region?.province)
      .filter(Boolean)
  );

  return [...usedProvinces].map((province) => ({ province }));
}

export async function generateMetadata({ params }: ProvinceRouteProps) {
  const { province } = await params;
  const label =
    regionLabels.provinces[province as keyof typeof regionLabels.provinces]?.en ??
    province;

  return {
    title: `${label} Travel Guide | Daedongyeojido`,
    description: `Top-rated places to visit in ${label}, Korea.`,
  };
}

export default async function ProvinceRoute({ params }: ProvinceRouteProps) {
  const { province } = await params;
  const exists = getAllPlaces().some(
    (place) => place.region?.province === province
  );

  if (!exists) {
    notFound();
  }

  return <ProvincePage province={province} />;
}
