import { useEffect, useRef, useState } from "react";
import { useListProfiles } from "@workspace/api-client-react";
import {
  ensureRecognitionModels,
  computeAllDescriptors,
  bestMatch,
  type MatchResult,
} from "@/lib/face/recognition";

export type IdentityStatus = "idle" | "loading" | "ready" | "error";

export interface IdentityState {
  status: IdentityStatus;
  identities: {
    match: MatchResult | null;
    descriptor: number[] | null;
  }[];
  hasProfiles: boolean;
}

export function useFaceIdentity(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  active: boolean,
  intervalMs = 1500,
): IdentityState {
  const { data: profiles } = useListProfiles();
  const [status, setStatus] = useState<IdentityStatus>("idle");
  const [identities, setIdentities] = useState<IdentityState["identities"]>([]);
  const profilesRef = useRef(profiles ?? []);

  useEffect(() => {
    profilesRef.current = profiles ?? [];
  }, [profiles]);

  useEffect(() => {
    if (!active) {
      setIdentities([]);
      setStatus("idle");
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      if (cancelled) return;
      const video = videoRef.current;
      const list = profilesRef.current;
      if (!video || video.readyState < 2 || list.length === 0) {
        timer = setTimeout(tick, intervalMs);
        return;
      }
      try {
        const results = await computeAllDescriptors(video);
        if (cancelled) return;
        
        const newIdentities = results.map(r => ({
          descriptor: Array.from(r.descriptor),
          match: bestMatch(r.descriptor, list)
        }));
        
        setIdentities(newIdentities);
      } catch {
        // ignore transient inference errors
      }
      if (!cancelled) timer = setTimeout(tick, intervalMs);
    };

    (async () => {
      setStatus("loading");
      try {
        await ensureRecognitionModels();
        if (cancelled) return;
        setStatus("ready");
        tick();
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [active, videoRef, intervalMs]);

  return {
    status,
    identities,
    hasProfiles: (profiles?.length ?? 0) > 0,
  };
}
