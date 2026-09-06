"use client";

import { useState } from "react";
import { Play, Video } from "lucide-react";
import { youtubeEmbedUrl, youtubeId, youtubeThumbUrl } from "@/lib/youtube";

/**
 * YouTube player that loads the iframe only on tap.
 * With `collapsedLabel` it starts as a small "Watch video" button instead of a thumbnail.
 */
export function YoutubeEmbed({
  url,
  title,
  collapsedLabel,
  expandedLabel,
}: {
  url: string | null | undefined;
  title?: string;
  collapsedLabel?: string;
  expandedLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(!collapsedLabel);
  const id = youtubeId(url);
  if (!id) return null;

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="inline-flex items-center gap-1.5 text-sm text-primary"
      >
        <Video className="size-4" />
        {collapsedLabel}
      </button>
    );
  }

  return (
    <div className="space-y-1">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
        {open ? (
          <iframe
            src={youtubeEmbedUrl(id) + "&autoplay=1"}
            title={title ?? "Video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="absolute inset-0 flex items-center justify-center"
            aria-label={title ? `Play ${title}` : "Play video"}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={youtubeThumbUrl(id)} alt="" className="h-full w-full object-cover opacity-80" />
            <span className="absolute flex size-16 items-center justify-center rounded-full bg-white/90 text-black shadow-lg">
              <Play className="ml-1 size-7" fill="currentColor" />
            </span>
          </button>
        )}
      </div>
      {collapsedLabel && (
        <button
          type="button"
          onClick={() => {
            setExpanded(false);
            setOpen(false);
          }}
          className="text-xs text-muted-foreground"
        >
          {expandedLabel}
        </button>
      )}
    </div>
  );
}
