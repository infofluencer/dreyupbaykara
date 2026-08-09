import HomePage from "@/components/home/Home";
import { getHomeSections } from "@/lib/cms/home-server";

export default async function Home() {
  const sections = await getHomeSections();
  return (
    <main className="bg-bg">
      <HomePage sections={sections} />
    </main>
  );
}
