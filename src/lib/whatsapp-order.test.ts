import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WHATSAPP_E164, whatsAppOrderUrl } from "./whatsapp-order";

function decode(url: string) {
  const parsed = new URL(url);
  return { path: parsed.pathname, text: parsed.searchParams.get("text") ?? "" };
}

const lines = [
  { name: "Falafel 350 g", quantity: 2, lineTotal: 4 },
  { name: "Käse 400 g", quantity: 1, lineTotal: 12 },
];

describe("whatsapp order message", () => {
  it("addresses the shop number", () => {
    assert.equal(WHATSAPP_E164, "491749500391");
    assert.equal(decode(whatsAppOrderUrl(lines, 16)).path, "/491749500391");
  });

  it("lists items, quantities, line totals and the sum", () => {
    const { text } = decode(whatsAppOrderUrl(lines, 16, "0151 000000", undefined, "de"));
    assert.match(text, /2× Falafel 350 g — 4,00/);
    assert.match(text, /1× Käse 400 g — 12,00/);
    assert.match(text, /Summe: 16,00/);
    assert.match(text, /Telefon: 0151 000000/);
  });

  it("only mentions the PDF and reference when they really exist", () => {
    const plain = decode(whatsAppOrderUrl(lines, 16, undefined, undefined, "de")).text;
    assert.doesNotMatch(plain, /PDF/);
    assert.doesNotMatch(plain, /Anfrage-Nr/);

    const full = decode(
      whatsAppOrderUrl(lines, 16, undefined, undefined, "de", {
        reference: "ab12cd34",
        pdfDownloaded: true,
        details: ["Name: Erika Muster", "Adresse: Musterweg 1, 71032 Böblingen"],
      })
    ).text;
    assert.match(full, /Anfrage-Nr\.: ab12cd34/);
    assert.match(full, /PDF heruntergeladen/);
    assert.match(full, /Name: Erika Muster/);
    assert.match(full, /Adresse: Musterweg 1, 71032 Böblingen/);
  });

  it("writes Arabic labels by default", () => {
    const { text } = decode(whatsAppOrderUrl(lines, 16, "0151 000000"));
    assert.match(text, /المجموع/);
    assert.match(text, /الهاتف: 0151 000000/);
  });
});
