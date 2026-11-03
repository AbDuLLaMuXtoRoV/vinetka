"use client";

import { Button } from "@snapbell/ui/button";
import { useMessages } from "@snapbell/ui/locale";
import { Menu } from "@snapbell/ui/overlay";
import { Copy, Ellipsis, ExternalLink, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAction } from "@studio/components/use-action";
import { duplicateJob } from "@studio/lib/actions";
import { jobsMsgs } from "@studio/messages/jobs";

export function JobRowActions({ jobId }: { jobId: string }) {
  const router = useRouter();
  const { run } = useAction();
  const t = useMessages(jobsMsgs).row;
  return (
    <Menu
      label={t.actions}
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={t.actions}>
          <Ellipsis />
        </Button>
      }
      items={[
        { label: t.open, icon: <ExternalLink />, href: `/studio/jobs/${jobId}` },
        { label: t.roster, icon: <Users />, href: `/studio/jobs/${jobId}/roster` },
        {
          label: t.duplicate,
          icon: <Copy />,
          onSelect: () =>
            run(() => duplicateJob(jobId), {
              success: t.duplicated,
              description: t.duplicatedBody,
              onSuccess: (job) => router.push(`/studio/jobs/${job.id}`),
            }),
        },
      ]}
    />
  );
}
