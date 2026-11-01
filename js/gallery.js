(function () {
  "use strict";

  const photos = window.PHOTOS || [];
  const thumbSrc = (p) => `photos/thumb/${p.id}.jpg`;
  const webSrc = (p) => `photos/web/${p.id}.jpg`;
  const fullSrc = (p) => `photos/full/${p.id}.jpg`;
  const fileName = (p) => `Bob-and-Irene-McPeek-${p.id}.jpg`;

  // iPhones and iPads save downloads to the Files app, where nobody will find them.
  // On those we hand the photo to the share sheet instead, which has "Save Image".
  const isIOS =
    /iP(hone|od|ad)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const useShareSheet =
    isIOS && typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [new File([""], "test.jpg", { type: "image/jpeg" })] });
  if (useShareSheet) document.documentElement.classList.add("ios");

  /* ---------- Gallery grid ---------- */

  const gallery = document.getElementById("gallery");
  document.getElementById("photo-count").textContent = photos.length;

  const fragment = document.createDocumentFragment();
  photos.forEach((p, i) => {
    const link = document.createElement("a");
    link.className = "tile";
    link.href = webSrc(p);
    link.style.setProperty("--ratio", (p.w / p.h).toFixed(4));
    link.setAttribute("aria-label", `Open photo ${i + 1} of ${photos.length}`);
    link.addEventListener("click", (e) => {
      e.preventDefault();
      open(i);
    });

    const img = document.createElement("img");
    img.src = thumbSrc(p);
    img.alt = "";
    img.width = p.w;
    img.height = p.h;
    img.loading = i < 8 ? "eager" : "lazy";
    img.decoding = "async";

    link.appendChild(img);
    fragment.appendChild(link);
  });
  gallery.appendChild(fragment);

  /* ---------- Viewer ---------- */

  const viewer = document.getElementById("viewer");
  const viewerImg = document.getElementById("viewer-img");
  const count = document.getElementById("viewer-count");
  const save = document.getElementById("viewer-save");
  const saveLabel = document.getElementById("viewer-save-label");
  let current = -1;
  let pushedHistory = false;

  const hashFor = (i) => `#photo-${photos[i].id}`;
  const indexFromHash = () => {
    const m = location.hash.match(/^#photo-(\d+)$/);
    return m ? photos.findIndex((p) => p.id === m[1]) : -1;
  };

  function show(i) {
    current = (i + photos.length) % photos.length;
    const p = photos[current];

    // Show the already-loaded thumbnail right away, then swap in the sharp version
    viewerImg.src = thumbSrc(p);
    viewerImg.alt = `Photo ${current + 1} of ${photos.length}`;
    const sharp = new Image();
    sharp.onload = () => {
      if (photos[current] === p) viewerImg.src = sharp.src;
    };
    sharp.src = webSrc(p);

    count.textContent = `Photo ${current + 1} of ${photos.length}`;
    save.href = fullSrc(p);
    save.download = fileName(p);
    saveLabel.textContent = "Save this photo";

    // Warm up the neighbors so arrows and swipes feel instant
    [current - 1, current + 1].forEach((n) => {
      new Image().src = webSrc(photos[(n + photos.length) % photos.length]);
    });
    if (useShareSheet) prepareFile(p);

    if (!viewer.open) {
      viewer.showModal();
      document.documentElement.classList.add("viewer-open");
    }
  }

  function hide() {
    if (viewer.open) viewer.close();
    document.documentElement.classList.remove("viewer-open");
    current = -1;
  }

  // The viewer gets its own history entry, so the phone's Back button closes it
  // instead of leaving the site.
  function open(i) {
    history.pushState(null, "", hashFor(i));
    pushedHistory = true;
    show(i);
  }

  function step(delta) {
    show(current + delta);
    history.replaceState(null, "", hashFor(current));
  }

  function close() {
    if (pushedHistory) {
      history.back(); // popstate does the hiding
    } else {
      history.replaceState(null, "", location.pathname + location.search);
      hide();
    }
  }

  window.addEventListener("popstate", () => {
    const i = indexFromHash();
    if (i < 0) {
      pushedHistory = false;
      hide();
    } else {
      show(i);
    }
  });

  document.getElementById("viewer-close").addEventListener("click", close);
  document.getElementById("viewer-prev").addEventListener("click", () => step(-1));
  document.getElementById("viewer-next").addEventListener("click", () => step(1));

  viewer.addEventListener("cancel", (e) => {
    e.preventDefault(); // Esc key: close through history like everything else
    close();
  });

  document.addEventListener("keydown", (e) => {
    if (!viewer.open) return;
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });

  // Tapping the dark area around the photo closes it
  document.getElementById("viewer-stage").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) close();
  });

  // Swipe left/right to move between photos (ignored while pinch-zoomed)
  let touchStart = null;
  viewer.addEventListener("touchstart", (e) => {
    touchStart = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  }, { passive: true });
  viewer.addEventListener("touchend", (e) => {
    if (!touchStart || (window.visualViewport && window.visualViewport.scale > 1.05)) return;
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
    touchStart = null;
  });

  /* ---------- Saving on iPhone / iPad ---------- */

  // The share sheet has to open right as the button is tapped, so the photo is
  // fetched ahead of time while it's on screen.
  const files = new Map();

  function prepareFile(p) {
    if (files.has(p.id)) return files.get(p.id);
    const pending = fetch(fullSrc(p))
      .then((r) => {
        if (!r.ok) throw new Error(r.status);
        return r.blob();
      })
      .then((blob) => {
        const file = new File([blob], fileName(p), { type: "image/jpeg" });
        pending.file = file;
        return file;
      })
      .catch((err) => {
        files.delete(p.id);
        throw err;
      });
    files.set(p.id, pending);
    // Keep only a handful in memory
    if (files.size > 4) files.delete(files.keys().next().value);
    return pending;
  }

  function share(file) {
    return navigator.share({ files: [file] }).catch((err) => {
      if (err.name !== "AbortError") throw err;
    });
  }

  save.addEventListener("click", (e) => {
    if (!useShareSheet || current < 0) return; // everyone else: a normal download
    e.preventDefault();
    const p = photos[current];
    const pending = prepareFile(p);

    if (pending.file) {
      share(pending.file).catch(() => { window.location.href = fullSrc(p); });
      return;
    }

    saveLabel.textContent = "Getting it ready…";
    pending
      .then((file) => share(file))
      .then(() => {
        if (photos[current] === p) saveLabel.textContent = "Save this photo";
      })
      .catch(() => {
        // Safari only allows the share sheet right after a tap; the photo is ready now
        if (photos[current] === p) saveLabel.textContent = "Ready! Tap again to save";
      });
  });

  /* ---------- Start ---------- */

  // Opening a link to a specific photo (e.g. one someone texted) goes straight to it
  const start = indexFromHash();
  if (start >= 0) show(start);
})();
