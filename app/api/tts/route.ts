import axios from "axios";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const requestBody = await req.json();
  const { text } = requestBody;
  const ttsResponse = await axios({
    method: "POST",
    url: "https://api.deepgram.com/v1/speak?model=aura-asteria-en",
    headers: {
      Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
      "Content-Type": "application/json",
    },
    data: JSON.stringify({ text: text }),
    responseType: "stream",
  });

  // Prepare headers for the streaming response
  const headers = new Headers();
  headers.set("Content-Type", "audio/mpeg");
  headers.set("Content-Disposition", 'inline; filename="output.mp3"');

  // Use `NextResponse` to return a streamed response
  return new Response(ttsResponse.data, {
    headers,
  });
}
