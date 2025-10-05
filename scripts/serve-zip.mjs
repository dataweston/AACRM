import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const ZIP_NAME = process.env.ZIP_NAME || "aacrm.zip";
const zipPath = path.join(projectRoot, ZIP_NAME);
const port = Number(process.env.ZIP_PORT || 4321);

const server = http.createServer((req, res) => {
  const url = req.url ?? "/";

  if (url === "/" || url === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>aacrm zip download</title>
    <style>
      body { font-family: system-ui, sans-serif; padding: 2.5rem; max-width: 640px; margin: 0 auto; color: #1f1f1f; }
      a { color: #c83a2c; font-weight: 600; }
      code { background: #f8f5ec; padding: 0.1rem 0.3rem; border-radius: 0.25rem; }
    </style>
  </head>
  <body>
    <h1>Download aacrm</h1>
    <p>
      Click the link below to save the packaged project to your device. You can also
      use <code>curl</code> or <code>wget</code> with the same URL.
    </p>
    <p>
      <a download href="/${ZIP_NAME}">Download ${ZIP_NAME}</a>
    </p>
    <p style="margin-top:2rem; color:#555; font-size:0.9rem;">
      Tip: expose this server via your tunneling tool (ngrok, Cloudflare Tunnel) if you need
      to move the archive to another machine.
    </p>
  </body>
</html>`);
    return;
  }

  if (url === `/${ZIP_NAME}`) {
    fs.stat(zipPath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end(`${ZIP_NAME} not found. Run \"npm run package:zip\" then retry.`);
        return;
      }

      res.writeHead(200, {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${ZIP_NAME}"`,
        "Content-Length": stats.size,
      });

      const stream = fs.createReadStream(zipPath);
      stream.pipe(res);
      stream.on("error", (streamErr) => {
        console.error(streamErr);
        res.destroy(streamErr);
      });
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Serving ${ZIP_NAME} at http://localhost:${port}/${ZIP_NAME}`);
});
