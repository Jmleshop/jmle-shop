/** Server-safe JSON-LD script tag(s). */
export default function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
}) {
  const payloads = Array.isArray(data) ? data : [data];
  return (
    <>
      {payloads.map((payload, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(payload).replace(/</g, "\\u003c"),
          }}
        />
      ))}
    </>
  );
}
