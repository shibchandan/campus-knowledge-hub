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
