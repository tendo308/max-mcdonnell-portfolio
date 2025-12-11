// scripts.js
// Shared behavior for all pages:
// - Injects YouTube iframes (card previews, hero embeds, optional backgrounds)
// - Handles hover-to-play vs autoplay
// - Updates footer year

// --------- YouTube helpers ---------

/**
 * Extracts an 11-char YouTube video ID from either:
 * - a bare ID (RAbnwLxwPNY)
 * - or a full URL (https://youtu.be/RAbnwLxwPNY, etc.)
 */
function extractYTId(value) {
  if (!value) return "";
  const trimmed = String(value).trim();

  // If it's already a bare 11-char ID, use it as-is.
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;

  // Try to pull an ID out of common URL formats.
  const match = trimmed.match(
    /(?:v=|\/embed\/|\/shorts\/|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return match && match[1] ? match[1] : trimmed;
}

/**
 * Builds a YouTube embed URL with appropriate params for:
 * - autoplay (optional)
 * - mute (always on, so autoplay works without user gesture)
 * - looping (via playlist trick)
 * - minimal branding / controls
 */
function ytSrc(raw, options) {
  const opts = Object.assign({ autoplay: 1 }, options);
  const id = extractYTId(raw);
  if (!id || id.startsWith("YOUR_")) return "";

  const base = "https://www.youtube-nocookie.com/embed/" + id;
  const params = new URLSearchParams({
    autoplay: String(opts.autoplay),
    mute: "1",
    controls: "0",
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
    iv_load_policy: "3",
    loop: "1",
    playlist: id // required by YouTube for looping
  });

  return base + "?" + params.toString();
}

/**
 * Ensures a single <iframe> exists inside hostEl and points it to the
 * appropriate YouTube URL.
 */
function injectIframe(hostEl, raw, options) {
  if (!hostEl || !raw) return null;

  const src = ytSrc(raw, options);
  if (!src) return null;

  let iframe = hostEl.querySelector("iframe");
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.loading = "lazy";
    iframe.allow = "autoplay; encrypted-media; picture-in-picture";
    iframe.title = "YouTube video";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    hostEl.appendChild(iframe);
  }

  // Always (re)set src so short clips will restart cleanly.
  iframe.src = src;
  return iframe;
}

/**
 * Removes any iframe within hostEl. Used for hover previews.
 */
function clearIframe(hostEl) {
  const iframe = hostEl && hostEl.querySelector
    ? hostEl.querySelector("iframe")
    : null;
  if (iframe) iframe.remove();
}

// --------- Page-level helpers ---------

/** Sets the copyright year in the footer. */
function setupFooterYear() {
  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }
}

/**
 * Optional YouTube fullscreen background.
 *
 * If an element like:
 *   <div class="bgVideo__yt" data-yt-bg="YOUTUBE_ID_OR_URL"></div>
 * exists, this will use YouTube as the full-screen background instead
 * of the local MP4, and hide/pause the local <video>.
 */
function setupYoutubeBackground() {
  const bgHost = document.querySelector(".bgVideo__yt[data-yt-bg]");
  if (!bgHost) return;

  const raw = bgHost.getAttribute("data-yt-bg");
  if (!raw) return;

  const iframe = injectIframe(bgHost, raw, { autoplay: 1 });
  if (iframe) {
    const localBgVid = document.querySelector(".bgVideo__vid");
    if (localBgVid) {
      try {
        localBgVid.pause();
      } catch (e) {
        // ignore
      }
      localBgVid.style.display = "none";
    }
  }
}

/**
 * Hover-to-play card previews.
 *
 * Expected markup:
 * <div class="hoverPreview">
 *   <img class="hoverPreview__poster" ...>
 *   <div class="hoverPreview__video ytEmbed" data-yt="YOUTUBE_ID_OR_URL"></div>
 * </div>
 *
 * Any .ytEmbed with data-autoplay="true" is ignored here (those are handled
 * by setupAutoplayEmbeds instead).
 */
function setupHoverPreviews() {
  const previews = document.querySelectorAll(".hoverPreview");
  previews.forEach((preview) => {
    const host = preview.querySelector(".ytEmbed[data-yt]");
    if (!host) return;

    // Skip auto-play embeds (used on the capstone page).
    if (host.hasAttribute("data-autoplay")) return;

    const raw = host.getAttribute("data-yt");
    if (!raw || raw.startsWith("YOUR_")) return;

    const play = () => {
      preview.classList.add("is-playing");
      injectIframe(host, raw, { autoplay: 1 });
    };

    const stop = () => {
      preview.classList.remove("is-playing");
      clearIframe(host);
    };

    preview.addEventListener("pointerenter", play);
    preview.addEventListener("pointerleave", stop);
  });
}

/**
 * Autoplay embeds (used on the capstone page).
 *
 * Any element:
 *   <div class="ytEmbed" data-yt="..." data-autoplay="true"></div>
 * will be turned into an auto-playing, looping embed.
 */
function setupAutoplayEmbeds() {
  const hosts = document.querySelectorAll(".ytEmbed[data-yt][data-autoplay]");
  hosts.forEach((host) => {
    const raw = host.getAttribute("data-yt");
    if (!raw || raw.startsWith("YOUR_")) return;
    injectIframe(host, raw, { autoplay: 1 });
  });
}

// --------- Init on DOM ready ---------

document.addEventListener("DOMContentLoaded", () => {
  setupFooterYear();
  setupYoutubeBackground();
  setupAutoplayEmbeds();   // capstone hero + capstone panels
  setupHoverPreviews();    // index project cards + capstone card on home
});
