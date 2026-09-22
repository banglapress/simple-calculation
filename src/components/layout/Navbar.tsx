import NavbarClient, {
  type Category,
} from "@/components/layout/NavbarClient";
import { getPublicCategories } from "@/lib/public-data";

export default async function Navbar() {
  const categories = (await getPublicCategories()) as Category[];
  return <NavbarClient categories={categories} />;
}
