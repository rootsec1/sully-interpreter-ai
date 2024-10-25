"use server";

import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from "openai";

const openAiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  const requestBody = await req.json();
  const { patient, doctor } = requestBody;

  // Convert to english using openai
  const completion = await openAiClient.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `
        You are a clinical assistant.
        I will provide you with two sets of conversations: one from a patient and the other from a doctor.
        Your task is to analyze the conversation, generate a concise summary of the interaction, and detect and list any key intents or purposes conveyed by both parties.
        Please format your response as follows:
        1. **Summary**: Provide a brief summary of the conversation, capturing the essence of what was discussed, any important topics, and overall context.
        2. **Detected Intents**:
        - **Patient Intents**: Identify and list the primary intents or concerns expressed by the patient.
        - **Doctor Intents**: Identify and list the key actions, advice, or recommendations provided by the doctor.

        Here are the conversations:
        **Patient Conversations**:
        {{patient_conversations}}

        **Doctor Conversations**:
        {{doctor_conversations}}

        Please ensure the response is clear and informative.
        `,
      },
      {
        role: "user",
        content: `
        Patient Conversations:
        ${patient}

        Doctor Conversations:
        ${doctor}
        `,
      },
    ],
  });

  const response = completion.choices[0].message.content;

  return NextResponse.json({ summary: response });
}
