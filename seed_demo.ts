import { db } from './src/firebase';
import { collection, addDoc } from 'firebase/firestore';

async function seed() {
  try {
    const docRef = await addDoc(collection(db, 'funder_grants'), {
      title: "NVIDIA Inception AI Accelerator",
      agency: "NVIDIA (Direct)",
      amount: "$250,000 + Credits",
      status: "Open",
      closeDate: "2026-12-31",
      isDirectMatch: true,
      funderId: "nvidia_confidential_001",
      description: "Direct access for Sovereign Agentic OS startups."
    });
    console.log("Successfully seeded Funder Match with ID:", docRef.id);
  } catch (e) {
    console.error("Error adding document: ", e);
  }
}
seed();
