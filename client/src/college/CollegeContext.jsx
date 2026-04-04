import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiClient } from "../lib/apiClient";
import { useAuth } from "../auth/AuthContext";
import { colleges } from "./collegeData";

const COLLEGE_STORAGE_KEY = "campus-knowledge-hub-college";
const CollegeContext = createContext(null);

function readStoredCollege() {
  try {
    const raw = localStorage.getItem(COLLEGE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function CollegeProvider({ children }) {
  const { user } = useAuth();
  const [availableColleges, setAvailableColleges] = useState(colleges);
  const [selectedCollege, setSelectedCollege] = useState(() => readStoredCollege());
  const lockedCollegeName = user?.role === "student" ? user.collegeName?.trim() : "";
  const visibleColleges = useMemo(() => {
    if (!lockedCollegeName) {
      return availableColleges;
    }

    return availableColleges.filter(
      (item) => item.name.trim().toLowerCase() === lockedCollegeName.toLowerCase()
    );
  }, [availableColleges, lockedCollegeName]);

  useEffect(() => {
    async function loadApprovedColleges() {
      try {
        const response = await apiClient.get("/governance/approved-courses");
        const approvedColleges = Array.from(
          new Map(
            response.data.data.map((item) => [
              item.collegeName.toLowerCase(),
              {
                id: item.collegeName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                name: item.collegeName,
                shortName: item.collegeName,
                location: item.profile?.rankings?.other || "Campus location not added yet"
              }
            ])
          ).values()
        );

        const mergedColleges = Array.from(
          new Map(
            [...colleges, ...approvedColleges].map((item) => [
              item.name.toLowerCase(),
              item
            ])
          ).values()
        ).sort((left, right) => left.name.localeCompare(right.name));

        setAvailableColleges(mergedColleges);
      } catch {
        setAvailableColleges(colleges);
      }
    }

    loadApprovedColleges();
  }, []);

  useEffect(() => {
    if (selectedCollege) {
      localStorage.setItem(COLLEGE_STORAGE_KEY, JSON.stringify(selectedCollege));
      return;
    }

    localStorage.removeItem(COLLEGE_STORAGE_KEY);
  }, [selectedCollege]);

  useEffect(() => {
    if (!lockedCollegeName) {
      return;
    }

    const existingCollege =
      availableColleges.find(
        (item) => item.name.trim().toLowerCase() === lockedCollegeName.toLowerCase()
      ) || {
        id: lockedCollegeName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name: lockedCollegeName,
        shortName: lockedCollegeName,
        location: "Assigned college"
      };

    setAvailableColleges((current) => {
      const hasCollege = current.some(
        (item) => item.name.trim().toLowerCase() === existingCollege.name.trim().toLowerCase()
      );
      if (hasCollege) {
        return current;
      }

      return [...current, existingCollege].sort((left, right) => left.name.localeCompare(right.name));
    });

    setSelectedCollege(existingCollege);
  }, [availableColleges, lockedCollegeName]);

  function selectCollegeById(collegeId) {
    const college = availableColleges.find((item) => item.id === collegeId) || null;

    if (
      lockedCollegeName &&
      college &&
      college.name.trim().toLowerCase() !== lockedCollegeName.toLowerCase()
    ) {
      return selectedCollege;
    }

    setSelectedCollege(college);
    return college;
  }

  function clearCollege() {
    if (lockedCollegeName) {
      return;
    }
    setSelectedCollege(null);
  }

  const value = useMemo(
    () => ({
      colleges: availableColleges,
      visibleColleges,
      selectedCollege,
      lockedCollegeName,
      selectCollegeById,
      clearCollege
    }),
    [availableColleges, visibleColleges, lockedCollegeName, selectedCollege]
  );

  return <CollegeContext.Provider value={value}>{children}</CollegeContext.Provider>;
}

export function useCollege() {
  const context = useContext(CollegeContext);

  if (!context) {
    throw new Error("useCollege must be used inside CollegeProvider");
  }

  return context;
}
