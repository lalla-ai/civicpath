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
    console.log("✅ SUCCESS: Seeded Funder Match with ID:", docRef.id);
  } catch (e) {
    console.error("❌ ERROR: If you see 'Permission Denied', wait 60s for Google to finish enabling.", e);
  }
}
seed();
