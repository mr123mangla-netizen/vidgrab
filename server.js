const express = require('express');
const { YtDlp } = require('@distube/yt-dlp');

const app = express();
const ytdlp = new YtDlp();

app.use(express.json());

app.get('/', (req, res) => {
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
        <p>Download video reels and images instantly</p>
        <input type="text" id="urlInput" placeholder="Paste link here (Instagram, YouTube, etc.)">
        <button onclick="fetchDownload()">Grab Content</button>
        <div id="result"></div>
      </div>
      <script>
        async function fetchDownload() {
          const url = document.getElementById('urlInput').value;
          const resultDiv = document.getElementById('result');
          if (!url) return alert('Please paste a link first!');
          resultDiv.innerHTML = "Processing your link...";
          try {
            const res = await fetch('/api/get-link', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url })
            });
            const data = await res.json();
            if (data.downloadUrl) {
              resultDiv.innerHTML = \`<a href="\${data.downloadUrl}" target="_blank" download>Download File Now</a>\`;
            } else {
              resultDiv.innerHTML = "Error: Could not retrieve download link.";
            }
          } catch (err) {
            resultDiv.innerHTML = "Error fetching link. Try another URL.";
          }
        }
      </script>
    </body>
    </html>
  `);
});

app.post('/api/get-link', async (req, res) => {
  try {
    const info = await ytdlp.getInfo(req.body.url);
    const downloadUrl = info.url || (info.formats && info.formats[0].url);
    res.json({ downloadUrl });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process link' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`VidGrab server running on port ${PORT}`));
