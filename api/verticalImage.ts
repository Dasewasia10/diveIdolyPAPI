import { IncomingMessage, ServerResponse } from "http";

// Format URL Cloudflare R2 (sesuaikan dengan domainmu)
const BASE_URL = "https://r2.yourdomain.com/cards/";

export default function handler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "", "http://localhost"); // Parsing URL
  const id = url.searchParams.get("id");

  if (!id) {
    res.statusCode = 400;
    res.end("Invalid request");
    return;
  }

  // Bentuk URL otomatis berdasarkan nama file
  const imageUrl = `${BASE_URL}${id}.png`;

  res.writeHead(301, { Location: imageUrl });
  res.end();
}
