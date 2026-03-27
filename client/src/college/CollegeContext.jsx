import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiClient } from "../lib/apiClient";
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
  const [availableColleges, setAvailableColleges] = useState(colleges);
  const [selectedCollege, setSelectedCollege] = useState(() => readStoredCollege());

  useEffect(() => {
    async function loadApprovedColleges() {
      try {
        const response = await apiClient.get("/governance/approved-courses");
        const uniqueColleges = Array.from(
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

        if (uniqueColleges.length) {
          setAvailableColleges(uniqueColleges);
        }
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

  function selectCollegeById(collegeId) {
    const college = availableColleges.find((item) => item.id === collegeId) || null;
    setSelectedCollege(college);
    return college;
  }

  const value = useMemo(
    () => ({
      colleges: availableColleges,
      selectedCollege,
      selectCollegeById,
      clearCollege: () => setSelectedCollege(null)
    }),
    [availableColleges, selectedCollege]
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
