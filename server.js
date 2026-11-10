const express = require("express");
const youtubedl = require("youtube-dl-exec");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10kb" }));

// Serve the frontend UI on the homepage
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>VidGrab - Free Media Downloader</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; background: #f4f4f9; }
        .container { background: white; padding: 40px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 10px rgba(0,0,0,0.1); width: 400px; }
        h1 { color: #333; margin-bottom: 5px; }
        p { color: #666; font-size: 14px; margin-bottom: 25px; }
        input { width: 100%; padding: 12px; box-sizing: border-box; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px; }
        button { width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer; }
        button:hover { background: #0056b3; }
        #result { margin-top: 20px; font-weight: bold; }
        a { display: inline-block; margin-top: 10px; padding: 10px 20px; background: #28a745; color: white; text-decoration: none; border-radius: 6px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>VidGrab</h1>
        <p>Download video and media instantly</p>
        <input type="text" id="urlInput" placeholder="Paste video link here...">
        <button onclick="startDownload()">Download Video</button>
        <div id="result"></div>
      </div>
      <script>
        async function startDownload() {
          const url = document.getElementById('urlInput').value;
          const resultDiv = document.getElementById('result');
          if (!url) return alert('Please paste a link first!');
          
          resultDiv.innerHTML = "Processing download...";
          
          try {
            const res = await fetch('/api/download', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url })
            });
            
            if (res.ok) {
              const blob = await res.blob();
              const downloadUrl = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = downloadUrl;
              a.download = 'vidgrab-video.mp4';
              document.body.appendChild(a);
              a.click();
              a.remove();
              resultDiv.innerHTML = "Download started successfully!";
            } else {
              const data = await res.json();
              resultDiv.innerHTML = "Error: " + (data.error || "Failed to download.");
            }
          } catch (err) {
            resultDiv.innerHTML = "Error connecting to server.";
          }
        }
      </script>
    </body>
    </html>
  `);
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK" });
});

// Validate submitted URLs
function validateUrl(value) {
  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
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

// Download endpoint
app.post("/api/download", (req, res) => {
  const { url } = req.body;

  if (!url || !validateUrl(url)) {
    return res.status(400).json({ error: "Invalid video URL." });
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
      res.status(500).json({ error: "Unable to start the download." });
    } else {
      res.destroy();
    }
  });

  res.setHeader("Content-Disposition", 'attachment; filename="vidgrab-video.mp4"');
  res.setHeader("Content-Type", "video/mp4");

  downloader.stdout.pipe(res);

  downloader.on("close", code => {
    if (code !== 0) {
      console.error("Download failed:", errorOutput);
      if (!res.headersSent) {
        res.status(500).json({ error: "Download failed. This video may be unavailable." });
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
