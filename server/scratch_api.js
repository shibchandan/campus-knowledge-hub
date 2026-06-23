import mongoose from "mongoose";

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/campus-knowledge-hub');
  const User = mongoose.model('User', new mongoose.Schema({ collegeName: String, collegeNameNormalized: String, role: String }, { collection: 'users' }));
  const CollegeCourse = mongoose.model('CollegeCourse', new mongoose.Schema({ collegeName: String }, { collection: 'collegecourses' }));
  const CollegeProfile = mongoose.model('CollegeProfile', new mongoose.Schema({ collegeName: String }, { collection: 'collegeprofiles' }));

  const [userColleges, courseColleges, profileColleges, takenColleges] = await Promise.all([
    User.distinct("collegeName", { collegeName: { $ne: null, $ne: "" } }),
    CollegeCourse.distinct("collegeName", { collegeName: { $ne: null, $ne: "" } }),
    CollegeProfile.distinct("collegeName", { collegeName: { $ne: null, $ne: "" } }),
    User.distinct("collegeNameNormalized", { role: "representative" })
  ]);

  const allColleges = new Set([
    ...userColleges,
    ...courseColleges,
    ...profileColleges
  ].map(c => String(c).trim()).filter(Boolean));

  console.log('All Colleges:', Array.from(allColleges));
  
  process.exit(0);
}

run();
