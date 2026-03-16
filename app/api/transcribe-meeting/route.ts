import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const settings = await prisma.systemSettings.findUnique({
            where: { id: "default" },
            select: { geminiApiKey: true }
        });
        
        const apiKey = settings?.geminiApiKey;
        
        if (!apiKey) {
            return NextResponse.json({ success: false, error: "Missing Gemini API Key. Please configure it in Admin Settings > General." }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ success: false, error: "No audio file provided." }, { status: 400 });
        }

        // Check if file is an audio or video file
        if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
            return NextResponse.json({ success: false, error: "Invalid file type. Please upload audio or video." }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        
        // Write to temp file because the Gemini File API expects a path for standard file manager usage
        // Note: For simpler usage we can also send inlineData, but inlineData is limited in size for audio.
        const tempDir = os.tmpdir();
        const tempFilePath = path.join(tempDir, `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`);
        fs.writeFileSync(tempFilePath, buffer);

        const mimeType = file.type || "audio/mp3";
        
        // Use inline data for audio prompt since @google/genai File API requires the separate `@google/generative-ai/server` file manager.
        // gemini-1.5-flash handles up to 9.5 hours of audio, inline base64 is supported.
        const audioPart = {
            inlineData: {
                data: buffer.toString("base64"),
                mimeType
            }
        };

        const prompt = `You are an expert meeting assistant. Please listen to this meeting recording carefully. 
Transcribe the key points and provide a professional, structured meeting summary. 

Format the output in clean text with bullet points, using the following structure:
- **Key Discussion Points:** (Main topics discussed)
- **Decisions Made:** (Any conclusions reached)
- **Action Items:** (Tasks assigned, if any)

Do not include any robotic intros like "Here is the summary" - just provide the actual structured summary.`;

        const result = await model.generateContent([
            audioPart,
            prompt
        ]);
        
        const response = await result.response;
        const text = response.text();

        // Cleanup
        try { fs.unlinkSync(tempFilePath); } catch (e) {}

        return NextResponse.json({ success: true, summary: text });

    } catch (error: any) {
        console.error("Transcription Error:", error);
        return NextResponse.json({ success: false, error: error.message || "Failed to transcribe audio." }, { status: 500 });
    }
}
