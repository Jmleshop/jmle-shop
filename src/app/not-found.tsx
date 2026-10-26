import Link from "next/link";
import { ShopHeading } from "@/components/ShopText";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl font-light text-gold mb-4">404</h1>
      <ShopHeading k="notFoundTitle" as="p" className="text-xl font-light mb-2" />
      <ShopHeading k="notFoundBody" as="p" className="text-gray-500 text-sm mb-8" />
      <Link href="/" className="btn-primary">
        <ShopHeading k="backHome" as="span" />
      </Link>
    </div>
  );
}
