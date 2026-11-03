"use client";

import type { SetupLink } from "@snapbell/sdk";
import { Button } from "@snapbell/ui/button";
import { useMessages } from "@snapbell/ui/locale";
import { Link2 } from "lucide-react";
import { useState } from "react";
import { SetupLinkDialog } from "@admin/components/setup-link-dialog";
import { useAction } from "@admin/components/use-action";
import { ownerSetupLinkAction } from "@admin/lib/actions";
import { onboardingMsgs } from "@admin/messages/onboarding";

/** Row action for an owner who hasn't opened their setup link yet. */
export function OwnerLinkButton({ memberId, name }: { memberId: string; name: string }) {
  const t = useMessages(onboardingMsgs);
  const { run, pending } = useAction();
  const [link, setLink] = useState<SetupLink | null>(null);
  return (
    <>
      <Button variant="ghost" size="sm" loading={pending} onClick={() => run(() => ownerSetupLinkAction(memberId), { success: t.link.newLinkMade, onSuccess: setLink })}>
        <Link2 /> {t.link.newLink}
      </Button>
      <SetupLinkDialog name={name} link={link} onClose={() => setLink(null)} />
    </>
  );
}
