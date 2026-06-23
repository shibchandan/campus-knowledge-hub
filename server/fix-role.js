import mongoose from "mongoose";

// Replace with the email of the person you want to demote to a student
const EMAIL_TO_DEMOTE = "the_email_to_remove@example.com";

async function run() {
  await mongoose.connect('mongodb://localhost:27017/campus-knowledge-hub');
  const User = mongoose.model('User', new mongoose.Schema({ email: String, role: String }, { collection: 'users' }));
  
  const user = await User.findOne({ email: EMAIL_TO_DEMOTE });
  
  if (!user) {
    console.log(`User with email ${EMAIL_TO_DEMOTE} not found!`);
  } else {
    user.role = "student";
    await user.save();
    console.log(`Successfully changed role for ${EMAIL_TO_DEMOTE} from representative to student!`);
  }
  
  process.exit(0);
}

run();
