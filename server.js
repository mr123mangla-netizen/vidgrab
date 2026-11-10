
const express = require("express");
const youtubedl = require("youtube-dl-exec");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10kb" }));

// Homepage / server status
app.get("/", (req, res) => {
  res.json({
    name: "VidGrab",
    status: "Online",
    message: "VidGrab API is running!"
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK" });
});

// Validate submitted URLs
function validateUrl(value) {
  try {
    const parsed = new URL(value);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false;
    }

    const host = parsed.hostname.toLowerCase();

    if (
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.startsWith("10.") ||
      host.startsWith("192.168.")
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// Get video information
app.post("/api/info", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url || !validateUrl(url)) {
      return res.status(400).json({
        error: "Please provide a valid public video URL."
      });
    }

    const info = await youtubedl(url, {
      dumpSingleJson: true,
      noPlaylist: true,
      noWarnings: true,
      skipDownload: true
    });

    res.json({
      title: info.title,
      thumbnail: info.thumbnail,
      duration: info.duration,
      uploader: info.uploader,
      formats: (info.formats || [])
        .filter(format => format.url)
        .map(format => ({
          formatId: format.format_id,
          extension: format.ext,
          quality: format.format_note || format.resolution
        }))
    });

  } catch (error) {
    console.error("Info error:", error.message);

    res.status(500).json({
      error: "Unable to retrieve video information."
    });
  }
});

// Download public media you have permission to download
app.post("/api/download", (req, res) => {
  const { url } = req.body;

  if (!url || !validateUrl(url)) {
    return res.status(400).json({
      error: "Invalid video URL."
    });
  }

  const downloader = youtubedl.exec(url, {
    output: "-",
    format: "best[ext=mp4][acodec!=none][vcodec!=none]/best[acodec!=none][vcodec!=none]",
    noPlaylist: true,
    noWarnings: true,
    noProgress: true
  }, {
    timeout: 600000
  });

  let errorOutput = "";

  downloader.stderr.on("data", chunk => {
    errorOutput = (errorOutput + chunk.toString()).slice(-4000);
  });

  downloader.on("error", error => {
    console.error("Downloader error:", error.message);

    if (!res.headersSent) {
      res.status(500).json({
        error: "Unable to start the download."
      });
    } else {
      res.destroy();
    }
  });

  res.setHeader(
    "Content-Disposition",
    'attachment; filename="vidgrab-video"'
  );

  res.setHeader("Content-Type", "application/octet-stream");

  downloader.stdout.pipe(res);

  downloader.on("close", code => {
    if (code !== 0) {
      console.error("Download failed:", errorOutput);

      if (!res.headersSent) {
        res.status(500).json({
          error: "Download failed. This video may be unavailable."
        });
      } else {
        res.destroy();
      }
    }
  });

  req.on("close", () => {
    if (!res.writableEnded) {
      downloader.kill();
    }
  });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`VidGrab running on port ${PORT}`);
});
