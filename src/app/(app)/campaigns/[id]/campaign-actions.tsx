"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/primitives";
import { cancelCampaign } from "../actions";

export function CampaignActions({ campaignId, status }: { campaignId: string; status: string }) {
  const router = useRouter();
  if (!["draft", "scheduled", "sending"].includes(status)) return null;
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        if (!window.confirm("Cancel this campaign? Unsent recipients will not receive it.")) return;
        await cancelCampaign({ id: campaignId });
        router.refresh();
      }}
    >
      Cancel campaign
    </Button>
  );
}
