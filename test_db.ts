import { testConnection } from './src/lib/db';
import { getRagStats, getDistinctSpeakers, getDistinctTopics } from './src/services/rag.service';

async function run() {
  try {
    const connected = await testConnection();
    console.log("Connected:", connected);

    console.log("Getting stats...");
    const stats = await getRagStats();
    console.log("Stats:", Object.keys(stats));

    console.log("Getting speakers...");
    const speakers = await getDistinctSpeakers();
    console.log("Speakers:", speakers.length);
    
    console.log("Getting topics...");
    const topics = await getDistinctTopics();
    console.log("Topics:", topics.length);

    console.log("Success");
  } catch (err) {
    console.error("ERROR CAUGHT:");
    console.error(err);
  }
}
run();
