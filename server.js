
const express = require("express");
const youtubedl = require("youtube-dl-exec");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10kb" }));

// ==========================================
// GOOGLE ADSENSE VERIFICATION
// ==========================================

app.get("/ads.txt", (req, res) => {
  res.setHeader("Content-Type", "text/plain");
  res.status(200).send(
    "google.com, pub-6600474514823885, DIRECT, f08c47fec0942fa0"
  );
});

// ==========================================
// FRONTEND WEBSITE
// ==========================================

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>VidGrab - Free Media Downloader</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; background: #f4f4f9; }
        .container { background: white; padding: 40px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 10px rgba(0,0,0,0.1); width: 420px; }
        h1 { color: #333; margin-bottom: 5px; }
        p { color: #666; font-size: 14px; margin-bottom: 25px; }
        input { width: 100%; padding: 12px; box-sizing: border-box; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px; }
        button { width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer; }
        button:hover { background: #0056b3; }
        #result { margin-top: 20px; font-size: 14px; word-break: break-all; }
        a { display: inline-block; margin-top: 10px; padding: 10px 20px; background: #28a745; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; }
        a:hover { background: #218838; }
        .error { color: #dc3545; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>VidGrab</h1>
        <p>Download video and media instantly</p>
        <input type="text" id="urlInput" placeholder="Paste video link here...">
        <button onclick="startDownload()">Grab Link</button>
        <div id="result"></div>
      </div>
      <script>
        async function startDownload() {
          const url = document.getElementById('urlInput').value;
          const resultDiv = document.getElementById('result');

          if (!url) return alert('Please paste a link first!');

          resultDiv.innerHTML = "Processing link...";

          try {
            const res = await fetch('/api/download', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url })
            });

            const data = await res.json();

            if (res.ok && data.downloadUrl) {
              resultDiv.innerHTML = \`<a href="\${data.downloadUrl}" target="_blank">Download File Now</a>\`;
            } else {
              resultDiv.innerHTML = \`<span class="error">Error: \${data.error || "Failed to process."}</span>\`;
            }
          } catch (err) {
            resultDiv.innerHTML = '<span class="error">Error connecting to server.</span>';
          }
        }
      </script>
    </body>
    </html>
  `);
});

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/api/health", (req, res) => {
  res.json({ status: "OK" });
});

// ==========================================
// URL VALIDATION
// ==========================================

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

// ==========================================
// VIDEO INFORMATION / DOWNLOAD ENDPOINT
// ==========================================

app.post("/api/download", async (req, res) => {
  const { url } = req.body;

  if (!url || !validateUrl(url)) {
    return res.status(400).json({
      error: "Invalid video URL."
    });
  }

  try {
    const output = await youtubedl(url, {
      dumpSingleJson: true,
      noPlaylist: true,
      noWarnings: true,
      skipDownload: true,
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      extractorArgs: "youtube:player_client=android,web"
    });

    const videoUrl =
      output.url ||
      (output.formats &&
       output.formats[output.formats.length - 1].url);

    if (!videoUrl) {
      return res.status(500).json({
        error: "Could not extract direct stream URL."
      });
    }

    res.json({ downloadUrl: videoUrl });

  } catch (error) {
    console.error("Downloader error:", error.message);

    res.status(500).json({
      error: "Could not process this link. Try another video or platform."
    });
  }
});

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, "0.0.0.0", () => {
  console.log(`VidGrab running on port ${PORT}`);
});
