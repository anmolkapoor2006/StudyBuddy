import { memo, useState, useEffect } from "react";
import YouTube from "react-youtube";
import { Loader2 } from "lucide-react";

const VideoPlayer = memo(({ videoId, thumbnailUrl, title, startTime = 0, onPlayerReady }) => {
  const [loading, setLoading] = useState(true);

  // Reset loading whenever videoId changes so loading placeholder immediately appears
  useEffect(() => {
    setLoading(true);
  }, [videoId]);

  const handleReady = (event) => {
    const ytPlayer = event.target;
    onPlayerReady(ytPlayer);

    if (startTime > 0) {
      try {
        ytPlayer.seekTo(startTime, true);
      } catch (_err) {
        // Player may not have finished initial buffering
      }
    }

    setLoading(false);
  };

  const handleStateChange = (event) => {
    // 1: PLAYING, 2: PAUSED
    if (event.data === 1 || event.data === 2) {
      setLoading(false);
    }
  };

  return (
    <div className="no-chamfer relative w-full aspect-video bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-2xl dark:shadow-[0_0_60px_-15px_rgba(220,38,38,0.22)] shrink-0 transition-shadow">
      {/* Loading Placeholder Overlay (Prevents blank screen) */}
      {loading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-neutral-950 select-none">
          {thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt={title || "Video preview"}
              className="absolute inset-0 w-full h-full object-cover opacity-25 blur-md pointer-events-none scale-105"
            />
          )}

          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center shadow-lg shadow-red-500/15">
              <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
            </div>
            <span className="text-xs font-mono font-medium text-neutral-400 tracking-wide">
              Loading player...
            </span>
          </div>
        </div>
      )}

      {/* YouTube Player */}
      <YouTube
        key={videoId}
        videoId={videoId}
        opts={{
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 1,
            start: startTime,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
            playsinline: 1,
            enablejsapi: 1,
          },
        }}
        className="w-full h-full"
        onReady={handleReady}
        onStateChange={handleStateChange}
      />
    </div>
  );
});

VideoPlayer.displayName = "VideoPlayer";
export default VideoPlayer;
