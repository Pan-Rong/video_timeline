importScripts("demuxer_mp4.js", "renderer_2d.js");

// Status UI. Messages are batched per animation frame.
let pendingStatus = null;

function setStatus(type, message) {
  if (pendingStatus) {
    pendingStatus[type] = message;
  } else {
    pendingStatus = {[type]: message};
    self.requestAnimationFrame(statusAnimationFrame);
  }
}

function statusAnimationFrame() {
  self.postMessage(pendingStatus);
  pendingStatus = null;
}

// Rendering. Drawing is limited to once per animation frame.
let renderer = null;
let pendingFrame = null;
let startTime = null;
let frameCount = 0;

function renderFrame(frame) {
  if (!pendingFrame) {
    // Schedule rendering in the next animation frame.
    requestAnimationFrame(renderAnimationFrame);
  } else {
    // Close the current pending frame before replacing it.
    pendingFrame.close();
  }
  // Set or replace the pending frame.
  pendingFrame = frame;
}

function renderAnimationFrame() {
  renderer.draw(pendingFrame);
  pendingFrame = null;
}

// Startup.
function start({dataUri, rendererName, canvas}) {
  // Pick a renderer to use.
  switch (rendererName) {
    case "2d":
      renderer = new Canvas2DRenderer(canvas);
      break;
    // case "webgl":
    //   renderer = new WebGLRenderer(rendererName, canvas);
    //   break;
    // case "webgl2":
    //   renderer = new WebGLRenderer(rendererName, canvas);
    //   break;
    // case "webgpu":
    //   renderer = new WebGPURenderer(canvas);
    //   break;
  }

  // Set up a VideoDecoder.
  const decoder = new VideoDecoder({
    output(frame) {
      // Update statistics.
      if (startTime == null) {
        startTime = performance.now();
      } else {
        const elapsed = (performance.now() - startTime) / 1000;
        const fps = ++frameCount / elapsed;
        setStatus("render", `${fps.toFixed(0)} fps`);
      }

      // Schedule the frame to be rendered.
      renderFrame(frame);
    },
    error(e) {
      setStatus("decode", e);
    }
  });

  // Fetch and demux the media data.
  const demuxer = new MP4Demuxer(dataUri, {
    onConfig(config) {
      setStatus("decode", `${config.codec} @ ${config.codedWidth}x${config.codedHeight}`);
      decoder.configure(config);
    },
    onChunk(chunk) {
      decoder.decode(chunk);
    },
    setStatus
  });
}

// Thumbnail extraction for a time range.
async function extractThumbnailsForRange({ dataUri, startTimeSec, endTimeSec, intervalSec = 1, width = 160, height = 90 }) {
  // Prepare targets in microseconds to match WebCodecs timestamps.
  const targets = [];
  if (startTimeSec == null || endTimeSec == null || endTimeSec < startTimeSec) {
    self.postMessage({ type: "thumbs_error", message: "Invalid time range" });
    return;
  }
  for (let t = startTimeSec; t <= endTimeSec + 1e-9; t += Math.max(intervalSec, 0.001)) {
    targets.push(Math.round(t * 1e6));
  }
  let targetIndex = 0;

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    self.postMessage({ type: "thumbs_error", message: "OffscreenCanvas unsupported" });
    return;
  }

  let done = false;
  const thumbsList = [];
  const decoder = new VideoDecoder({
    output(frame) {
      if (done) {
        frame.close();
        return;
      }
      const ts = frame.timestamp; // microseconds
      // Progress info
      if (targets.length > 0) {
        const progress = Math.min(100, (targetIndex / targets.length) * 100);
        setStatus("thumbs", `${progress.toFixed(0)}%`);
      }

      // Capture when current frame timestamp reached or passed next target
      while (targetIndex < targets.length && ts >= targets[targetIndex]) {
        canvas.width = frame.displayWidth;
        canvas.height = frame.displayHeight;
        ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
        // Convert to blob and post back
        canvas.convertToBlob({ type: "image/jpeg", quality: 0.8 }).then(blob => {
          thumbsList.push({
            time: targets[targetIndex] / 1e6,
            thumbBlob: blob
          })
          // self.postMessage({ type: "thumb", time: targets[targetIndex] / 1e6, blob });
        }).catch(() => {});
        targetIndex++;
      }

      // Finish when all targets collected
      if (targetIndex >= targets.length) {
        done = true;
        // best-effort flush
        try { decoder.close(); } catch (e) {}
        self.postMessage({ type: "thumbs_done", thumbsList });
      }

      frame.close();
    },
    error(e) {
      setStatus("decode", e);
      self.postMessage({ type: "thumbs_error", message: String(e) });
    }
  });

  const demuxer = new MP4Demuxer(dataUri, {
    onConfig(config) {
      decoder.configure(config);
    },
    onChunk(chunk) {
      if (!done) decoder.decode(chunk);
    },
    setStatus
  });
}

// Listen for commands.
self.onmessage = (event) => {
  const data = event.data || {};
  if (data && data.type === "START_RENDER") {
    start(data);
    return;
  }
  if (data && data.type === "EXTRACT_THUMBS_RANGE") {
    extractThumbnailsForRange(data);
    return;
  }
  // Back-compat: if no type provided, treat as start
  if (data && !data.type) {
    start(data);
  }
};
