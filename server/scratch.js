import mongoose from "mongoose";

async function run() {
  await mongoose.connect('mongodb://localhost:27017/campus-knowledge-hub');
  const collections = await mongoose.connection.db.listCollections().toArray();
  for (let c of collections) {
    const coll = mongoose.connection.db.collection(c.name);
    const regexDocs = await coll.find({
      $or: [
        { collegeName: /Motilal/i },
        { name: /Motilal/i }
      ]
    }).toArray();
    if (regexDocs.length > 0) {
      console.log(c.name, 'Regex:', regexDocs.map(d => d.collegeName || d.name));
    }
  }
  process.exit(0);
}

run();
