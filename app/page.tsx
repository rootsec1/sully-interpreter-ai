"use client";

import { Button, Listbox, ListboxItem, Textarea } from "@nextui-org/react";
import axios from "axios";
import { SnackbarProvider } from "notistack";
import { useRef, useState } from "react";
import { PiSpeakerHighFill } from "react-icons/pi";

export default function Home() {
  const [isRecordingPatient, setIsRecordingPatient] = useState(false);
  const [isRecordingDoctor, setIsRecordingDoctor] = useState(false);
  const [patientMessages, setPatientMessages] = useState<JSON[]>([]);
  const [doctorMessages, setDoctorMessages] = useState<JSON[]>([]);
  const [summary, setSummary] = useState("");

  const patientMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const doctorMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const patientAudioChunksRef = useRef<Blob[]>([]);
  const doctorAudioChunksRef = useRef<Blob[]>([]);

  const startPatientRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          patientAudioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(patientAudioChunksRef.current, {
          type: "audio/wav",
        });
        patientAudioChunksRef.current = [];
        sendAudioToAPI(audioBlob, "patient");
      };

      mediaRecorder.start();
      patientMediaRecorderRef.current = mediaRecorder;
      setIsRecordingPatient(true);
    } catch (error) {
      console.error("Error starting patient recording:", error);
    }
  };

  const stopPatientRecording = () => {
    if (patientMediaRecorderRef.current) {
      patientMediaRecorderRef.current.stop();
      setIsRecordingPatient(false);
    }
  };

  const startDoctorRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          doctorAudioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(doctorAudioChunksRef.current, {
          type: "audio/wav",
        });
        doctorAudioChunksRef.current = [];
        sendAudioToAPI(audioBlob, "doctor");
      };

      mediaRecorder.start();
      doctorMediaRecorderRef.current = mediaRecorder;
      setIsRecordingDoctor(true);
    } catch (error) {
      console.error("Error starting doctor recording:", error);
    }
  };

  const stopDoctorRecording = () => {
    if (doctorMediaRecorderRef.current) {
      doctorMediaRecorderRef.current.stop();
      setIsRecordingDoctor(false);
    }
  };

  const sendAudioToAPI = async (audioBlob: Blob, role: string) => {
    const formData = new FormData();
    formData.append("file", audioBlob, `${role}_recording.wav`);

    try {
      const response = await fetch("/api/stt", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (role === "patient") {
          setPatientMessages((prevMessages) => [
            ...prevMessages,
            data.transcript,
          ]);
        } else {
          setDoctorMessages((prevMessages) => [
            ...prevMessages,
            data.transcript,
          ]);
        }
      } else {
        console.error(`Failed to transcribe ${role} audio`);
      }
    } catch (error) {
      console.error(`Error sending ${role} audio:`, error);
    }
  };

  const handlePlayAudio = async (text: string) => {
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
      } else {
        console.error("Failed to get TTS audio");
      }
    } catch (error) {
      console.error("Error fetching TTS audio:", error);
    }
  };

  const handleGetSummary = async () => {
    try {
      const patientConversation = patientMessages.join(" ");
      const doctorConversation = doctorMessages.join(" ");

      const response = await axios.post("/api/summarize", {
        patient: patientConversation,
        doctor: doctorConversation,
      });

      if (response.status === 200) {
        setSummary(response.data.summary);
      }
    } catch (error) {
      console.error("Error getting summary:", error);
    }
  };

  return (
    <div>
      <div className="w-full flex flex-col lg:flex-row">
        <SnackbarProvider />

        {/* Patient Section */}
        <div className="w-full lg:w-1/2 p-4 border-b lg:border-b-0 lg:border-r border-gray-300">
          <h2 className="text-2xl mb-4">Patient</h2>
          <Listbox aria-label="Patient Transcripts">
            {patientMessages.map((message, index) => (
              <ListboxItem
                key={index}
                variant="bordered"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onPress={() => handlePlayAudio(message as any)}
              >
                <div className="flex items-center justify-between">
                  <span>{message.toString()}</span>
                  <PiSpeakerHighFill />
                </div>
              </ListboxItem>
            ))}
          </Listbox>
          <Button
            onPress={
              isRecordingPatient ? stopPatientRecording : startPatientRecording
            }
            className="w-full"
          >
            {isRecordingPatient
              ? "Stop Patient Recording"
              : "Start Patient Recording"}
          </Button>
        </div>

        {/* Doctor Section */}
        <div className="w-full lg:w-1/2 p-4">
          <h2 className="text-2xl mb-4">Doctor</h2>
          <Listbox aria-label="Doctor Transcripts">
            {doctorMessages.map((message, index) => (
              <ListboxItem key={index}>
                <div className="flex items-center justify-between">
                  <span>{message.toString()}</span>
                  <PiSpeakerHighFill />
                </div>
              </ListboxItem>
            ))}
          </Listbox>
          <Button
            onPress={
              isRecordingDoctor ? stopDoctorRecording : startDoctorRecording
            }
            className="w-full"
          >
            {isRecordingDoctor
              ? "Stop Doctor Recording"
              : "Start Doctor Recording"}
          </Button>
        </div>
      </div>

      <Button className="m-4 mt-8" onPress={handleGetSummary}>
        Summarize conversation
      </Button>
      <Textarea
        className="m-4"
        placeholder="Summary of conversation"
        isReadOnly
        value={summary}
      />
    </div>
  );
}
