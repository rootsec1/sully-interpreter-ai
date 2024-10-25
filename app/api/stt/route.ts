import axios from "axios";
import { NextResponse } from "next/server";
import { OpenAI } from "openai";

const openAiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to read the uploaded audio file from the form data
const readFile = (req: Request): Promise<Buffer> =>
  new Promise(async (resolve, reject) => {
    const data = await req.formData();
    const file = data.get("file") as File | null;

    if (!file) {
      return reject("No file sent!");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    resolve(buffer);
  });

export async function POST(req: Request) {
  try {
    // Read the file from the request
    const audioBuffer = await readFile(req);

    // Send the file to Deepgram for transcription
    const response = await axios({
      method: "POST",
      url: "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&detect_language=true",
      headers: {
        Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
        "Content-Type": "audio/wav", // Modify if using a different format
      },
      data: audioBuffer,
    });

    let transcript =
      response.data.results.channels[0].alternatives[0].transcript;
    const detectedLanguage =
      response.data.results.channels[0].detected_language;

    if (detectedLanguage !== "en") {
      // Convert to english using openai
      const completion = await openAiClient.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a helpful clinical language interpreter/assistant that excels at translating spanish to english and detecting intents from messages.
              Return the english translation in JSON format like so: { 'transcript': <TRANSLATED_TEXT>, 'intent': <DETECTED_INTENT> }.
              Ensure you detect the following intents correctly by analyzing the content of the message.
              Possible intents: REPEAT, SCHEDULE_FOLLOW_UP, SEND_LAB_ORDER, NONE
              Examples:
              - Repeat what you just said (REPEAT)
              - Schedule a follow-up appointment for next week (SCHEDULE_FOLLOW_UP)
              - Send a lab order for me (SEND_LAB_ORDER)
              - I have stomach ache (NONE)
              `,
          },
          {
            role: "user",
            content: "Translate the following to english: " + transcript,
          },
        ],
      });
      transcript = completion.choices[0].message.content;
    } else {
      transcript = `{"transcript": "${transcript}", "intent": "NONE"}`;
    }

    transcript = transcript.trim();
    return NextResponse.json({ transcript });
  } catch (error) {
    console.error("Error in Speech-to-Text:", error);
    return NextResponse.json(
      { error: "Failed to transcribe audio" },
      { status: 500 }
    );
  }
}
