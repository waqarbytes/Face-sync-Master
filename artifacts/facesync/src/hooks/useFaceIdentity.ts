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
    box: { x: number; y: number; width: number; height: number } | null;
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
        
        // 1. Initial matching
        const initialMatches = results.map(r => ({
          descriptor: Array.from(r.descriptor),
          box: r.box,
          match: bestMatch(r.descriptor, list)
        }));
        
        // 2. De-duplicate identities: Ensure each profile is only assigned to its BEST face match
        const usedProfileIds = new Set<number>();
        const finalIdentities = initialMatches
          .sort((a, b) => (a.match?.distance ?? 1) - (b.match?.distance ?? 1))
          .map(id => {
             if (id.match && !usedProfileIds.has(id.match.profile.id)) {
                usedProfileIds.add(id.match.profile.id);
                return id;
             }
             // If this profile was already taken by a better match, this face is "Unknown"
             return { ...id, match: null };
          });
        
        setIdentities(finalIdentities);
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
