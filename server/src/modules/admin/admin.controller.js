import { User } from "../auth/auth.model.js";
import { CollegeCourse, CollegeRequest } from "../governance/governance.model.js";
import { Resource } from "../resources/resource.model.js";
import { ResourceReport } from "../resources/resourceReport.model.js";

export async function getAnalytics(req, res, next) {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [
      totalUsers,
      activeUsers,
      studentCount,
      representativeCount,
      adminCount,
      totalResources,
      resourcesThisWeek,
      totalColleges,
      pendingRequests,
      activeReports
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: "active" }),
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "representative" }),
      User.countDocuments({ role: "admin" }),
      Resource.countDocuments(),
      Resource.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
      CollegeCourse.countDocuments(),
      CollegeRequest.countDocuments({ status: "pending" }),
      ResourceReport.countDocuments({ status: "pending" })
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        roleDistribution: {
          students: studentCount,
          representatives: representativeCount,
          admins: adminCount
        },
        totalResources,
        resourcesThisWeek,
        totalColleges,
        pendingRequests,
        activeReports
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getPendingEmailMigrations(req, res, next) {
  try {
    const pending = await User.find({ pendingEmailMigrationStatus: "pending" })
      .select("_id fullName email role collegeName pendingEmailMigration createdAt")
      .sort("-createdAt");
      
    res.json({ success: true, data: pending });
  } catch (error) {
    next(error);
  }
}

export async function processEmailMigration(req, res, next) {
  try {
    const { userId } = req.params;
    const { action } = req.body; // "approve" or "reject"
    
    if (action !== "approve" && action !== "reject") {
      const error = new Error("Action must be approve or reject");
      error.statusCode = 400;
      throw error;
    }

    const user = await User.findById(userId);
    if (!user || user.pendingEmailMigrationStatus !== "pending") {
      const error = new Error("Pending email migration not found for this user");
      error.statusCode = 404;
      throw error;
    }

    if (action === "approve") {
      // Ensure email isn't somehow taken between request and approval
      const existing = await User.findOne({ email: user.pendingEmailMigration });
      if (existing) {
        const error = new Error("The requested email is already registered to another account.");
        error.statusCode = 409;
        throw error;
      }
      user.email = user.pendingEmailMigration;
    }

    user.pendingEmailMigration = "";
    user.pendingEmailMigrationStatus = "none";
    await user.save();

    res.json({
      success: true,
      message: `Email migration request ${action}d successfully.`,
      data: { id: user._id, email: user.email }
    });
  } catch (error) {
    next(error);
  }
}
