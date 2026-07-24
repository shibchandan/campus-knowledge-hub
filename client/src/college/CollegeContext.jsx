import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiClient } from "../lib/apiClient";
import { useAuthState } from "../auth/AuthContext";
import { colleges } from "./collegeData";

const COLLEGE_STORAGE_KEY = "campus-knowledge-hub-college";

const CollegeStateContext = createContext(null);
const CollegeDispatchContext = createContext(null);

function readStoredCollege() {
  try {
    const raw = localStorage.getItem(COLLEGE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function mergeColleges(...collegeGroups) {
  return Array.from(
    new Map(
      collegeGroups
        .flat()
        .filter(Boolean)
        .map((item) => [item.name.trim().toLowerCase(), item])
    ).values()
  ).sort((left, right) => left.name.localeCompare(right.name));
}

export function CollegeProvider({ children }) {
  const { user } = useAuthState();
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

  const refreshColleges = useCallback(async () => {
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
              location: item.profile?.location || "Campus location not added yet"
            }
          ])
        ).values()
      );

      setAvailableColleges((current) =>
        mergeColleges(current, colleges, approvedColleges)
      );
    } catch {
      setAvailableColleges((current) =>
        mergeColleges(current, colleges)
      );
    }
  }, []);

  useEffect(() => {
    refreshColleges();
  }, [refreshColleges]);

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

    if (
      selectedCollege &&
      selectedCollege.name.trim().toLowerCase() === lockedCollegeName.toLowerCase()
    ) {
      return;
    }

    const existingCollege =
      colleges.find(
        (item) => item.name.trim().toLowerCase() === lockedCollegeName.toLowerCase()
      ) || {
        id: lockedCollegeName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name: lockedCollegeName,
        shortName: lockedCollegeName,
        location: "Assigned college"
      };

    setSelectedCollege(existingCollege);

    setAvailableColleges((current) => {
      const exists = current.some(
        (item) => item.name.trim().toLowerCase() === existingCollege.name.trim().toLowerCase()
      );
      if (exists) {
        return current;
      }
      return [...current, existingCollege].sort((left, right) => left.name.localeCompare(right.name));
    });
  }, [lockedCollegeName, selectedCollege]);

  const selectCollegeById = useCallback((collegeId) => {
    setAvailableColleges((currentAvailable) => {
      const college = currentAvailable.find((item) => item.id === collegeId) || null;

      if (
        lockedCollegeName &&
        college &&
        college.name.trim().toLowerCase() !== lockedCollegeName.toLowerCase()
      ) {
        return currentAvailable;
      }

      setSelectedCollege(college);
      return currentAvailable;
    });
  }, [lockedCollegeName]);

  const clearCollege = useCallback(() => {
    if (lockedCollegeName) {
      return;
    }
    setSelectedCollege(null);
  }, [lockedCollegeName]);

  const stateValue = useMemo(
    () => ({
      colleges: availableColleges,
      visibleColleges,
      selectedCollege,
      lockedCollegeName,
    }),
    [availableColleges, visibleColleges, lockedCollegeName, selectedCollege]
  );

  const dispatchValue = useMemo(
    () => ({
      selectCollegeById,
      clearCollege,
      refreshColleges
    }),
    [selectCollegeById, clearCollege, refreshColleges]
  );

  return (
    <CollegeStateContext.Provider value={stateValue}>
      <CollegeDispatchContext.Provider value={dispatchValue}>
        {children}
      </CollegeDispatchContext.Provider>
    </CollegeStateContext.Provider>
  );
}

export function useCollegeState() {
  const context = useContext(CollegeStateContext);
  if (!context) {
    throw new Error("useCollegeState must be used inside CollegeProvider");
  }
  return context;
}

export function useCollegeDispatch() {
  const context = useContext(CollegeDispatchContext);
  if (!context) {
    throw new Error("useCollegeDispatch must be used inside CollegeProvider");
  }
  return context;
}

// Retained for backward compatibility
export function useCollege() {
  const state = useCollegeState();
  const dispatch = useCollegeDispatch();
  return { ...state, ...dispatch };
}
