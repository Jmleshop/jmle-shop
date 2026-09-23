export default function ProductDetailExtras({
  barcode,
}: {
  barcode?: string | null;
}) {
  if (!barcode) return null;
  return (
    <p className="text-xs text-gray-400 mt-6 font-ui" dir="ltr">
      Barcode: {barcode}
    </p>
  );
}
