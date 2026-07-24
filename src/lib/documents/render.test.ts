import { describe, it, expect } from "vitest";
import {
  renderDocument,
  parseSignatureSlots,
  applySignatureSlots,
  slotsToEditor,
  normaliseEditedDocument,
  sigSlot,
  SIG_SLOT,
} from "./render";

describe("signature slots", () => {
  it("renders default and named signature slots to distinct sentinels", () => {
    const body = "A {{signature}} B {{signature:seller}} C {{signature:buyer}}";
    const out = renderDocument(body, {});
    expect(out).toContain(SIG_SLOT);
    expect(out).toContain(sigSlot("seller"));
    expect(out).toContain(sigSlot("buyer"));
    expect(sigSlot("seller")).not.toBe(SIG_SLOT);
  });

  it("parses declared slots in order, deduped, with labels", () => {
    const slots = parseSignatureSlots("{{signature:seller}} x {{signature:buyer}} y {{signature:seller}}");
    expect(slots).toEqual([
      { slotKey: "seller", label: "Seller" },
      { slotKey: "buyer", label: "Purchaser" },
    ]);
  });

  it("treats a bare {{signature}} as the default slot", () => {
    expect(parseSignatureSlots("hello {{signature}}")).toEqual([{ slotKey: "", label: "Signatory" }]);
  });

  it("fills each slot independently via the resolver", () => {
    const rendered = renderDocument("{{signature:seller}}|{{signature:buyer}}", {});
    const out = applySignatureSlots(rendered, (k) => `[${k || "default"}]`);
    expect(out).toBe("[seller]|[buyer]");
  });

  it("round-trips through the editor placeholders keeping slot keys", () => {
    const rendered = renderDocument("{{signature:seller}} and {{signature:buyer}}", {});
    const editor = slotsToEditor(rendered);
    expect(editor).toContain('data-sig-key="seller"');
    expect(editor).toContain('data-sig-key="buyer"');
    const back = normaliseEditedDocument(editor);
    expect(back).toContain(sigSlot("seller"));
    expect(back).toContain(sigSlot("buyer"));
  });

  it("appends a default slot if the user deleted all signature blocks", () => {
    const back = normaliseEditedDocument("<p>Edited with no signature</p>");
    expect(back).toContain(SIG_SLOT);
  });

  it("escapes merge values but leaves template markup intact", () => {
    const out = renderDocument("<p>{{buyer.name}}</p>", { "buyer.name": "<script>x</script>" });
    expect(out).toContain("&lt;script&gt;");
    expect(out).toContain("<p>");
  });
});
