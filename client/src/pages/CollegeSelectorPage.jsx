import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SectionCard } from "../components/SectionCard";
import { useCollege } from "../college/CollegeContext";

const FILTERS = {
  city: "city",
  collegeType: "collegeType",
  sort: "sort"
};

function normalizeSearchValue(value = "") {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function getCityFromLocation(location = "") {
  return location.split(",")[0]?.trim() || location;
}

function getCollegeType(college) {
  const name = `${college.name} ${college.shortName}`.toLowerCase();

  if (name.includes("indian institute of technology") || name.includes("iit")) {
    return "IIT";
  }

  if (name.includes("national institute of technology") || name.includes("nit")) {
    return "NIT";
  }

  if (name.includes("university")) {
    return "University";
  }

  return "Institute";
}

function FilterChip({ active, label, onClick, value }) {
  return (
    <button
      className={`filter-chip-button${active ? " active" : ""}`}
      onClick={onClick}
      type="button"
    >
      <span>{value ? `${label}: ${value}` : label}</span>
      <span className="filter-chip-caret">{active ? "x" : "v"}</span>
    </button>
  );
}

function matchesCollegeSearch(college, rawTerm) {
  const term = normalizeSearchValue(rawTerm);

  if (!term) {
    return true;
  }

  const searchFields = [
    college.name,
    college.shortName,
    college.location,
    getCityFromLocation(college.location),
    getCollegeType(college)
  ]
    .map((value) => normalizeSearchValue(value))
    .filter(Boolean);

  return searchFields.some((field) => field.includes(term));
}

export function CollegeSelectorPage() {
  const navigate = useNavigate();
  const {
    colleges,
    visibleColleges = colleges,
    selectedCollege,
    selectCollegeById
  } = useCollege();
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedCollegeType, setSelectedCollegeType] = useState("");
  const [openFilter, setOpenFilter] = useState("");
  const [modalSearch, setModalSearch] = useState("");

  const cityOptions = useMemo(
    () =>
      [...new Set(visibleColleges.map((college) => getCityFromLocation(college.location)).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [visibleColleges]
  );

  const typeOptions = useMemo(
    () =>
      [...new Set(visibleColleges.map((college) => getCollegeType(college)).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [visibleColleges]
  );

  useEffect(() => {
    if (!openFilter) {
      setModalSearch("");
    }
  }, [openFilter]);

  const filteredColleges = useMemo(() => {
    const filtered = visibleColleges.filter((college) => {
      const collegeCity = getCityFromLocation(college.location);
      const collegeType = getCollegeType(college);

      return (
        matchesCollegeSearch(college, query) &&
        (!selectedCity || collegeCity === selectedCity) &&
        (!selectedCollegeType || collegeType === selectedCollegeType)
      );
    });

    filtered.sort((left, right) => {
      if (sortBy === "location-asc") {
        return left.location.localeCompare(right.location);
      }

      if (sortBy === "short-asc") {
        return left.shortName.localeCompare(right.shortName);
      }

      return left.name.localeCompare(right.name);
    });

    return filtered;
  }, [visibleColleges, query, selectedCity, selectedCollegeType, sortBy]);

  const popupOptions = useMemo(() => {
    const term = modalSearch.trim().toLowerCase();

    if (openFilter === FILTERS.city) {
      return cityOptions.filter((option) => !term || option.toLowerCase().includes(term));
    }

    if (openFilter === FILTERS.collegeType) {
      return typeOptions.filter((option) => !term || option.toLowerCase().includes(term));
    }

    if (openFilter === FILTERS.sort) {
      return [
        { label: "College Name (A-Z)", value: "name-asc" },
        { label: "City (A-Z)", value: "location-asc" },
        { label: "Short Name (A-Z)", value: "short-asc" }
      ].filter((option) => !term || option.label.toLowerCase().includes(term));
    }

    return [];
  }, [cityOptions, modalSearch, openFilter, typeOptions]);

  function handleOpenCollege(collegeId) {
    selectCollegeById(collegeId);
    navigate("/dashboard");
  }

  function handleOptionClick(option) {
    if (openFilter === FILTERS.city) {
      setSelectedCity(option);
    }

    if (openFilter === FILTERS.collegeType) {
      setSelectedCollegeType(option);
    }

    if (openFilter === FILTERS.sort) {
      setSortBy(option.value);
    }

    setOpenFilter("");
  }

  function clearAllFilters() {
    setQuery("");
    setSelectedCity("");
    setSelectedCollegeType("");
    setSortBy("name-asc");
    setOpenFilter("");
  }

  const activeFilterCount = [selectedCity, selectedCollegeType].filter(Boolean).length + (sortBy !== "name-asc" ? 1 : 0);

  return (
    <div className="page-stack">
      <SectionCard
        title="Choose College Dashboard"
        description="Filter colleges and open any college dashboard."
      >
        <div className="college-search-wrap">
          <input
            className="college-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search college by name or location..."
            value={query}
          />

          <div className="filter-chip-row">
            <FilterChip
              active={openFilter === FILTERS.city}
              label="City"
              onClick={() => setOpenFilter((current) => (current === FILTERS.city ? "" : FILTERS.city))}
              value={selectedCity}
            />
            <FilterChip
              active={openFilter === FILTERS.collegeType}
              label="Type Of College"
              onClick={() =>
                setOpenFilter((current) => (current === FILTERS.collegeType ? "" : FILTERS.collegeType))
              }
              value={selectedCollegeType}
            />
            <FilterChip
              active={openFilter === FILTERS.sort}
              label="Sort"
              onClick={() => setOpenFilter((current) => (current === FILTERS.sort ? "" : FILTERS.sort))}
              value={
                sortBy === "location-asc"
                  ? "City"
                  : sortBy === "short-asc"
                    ? "Short Name"
                    : "College Name"
              }
            />
            <button className="clear-filter-button" onClick={clearAllFilters} type="button">
              Clear All
            </button>
          </div>

          {selectedCollege ? (
            <p className="muted">
              Current college: <strong>{selectedCollege.name}</strong>
            </p>
          ) : (
            <p className="muted">No college selected yet.</p>
          )}
          <p className="muted">
            {filteredColleges.length} colleges visible {activeFilterCount ? `| ${activeFilterCount} filters active` : ""}
          </p>
        </div>
      </SectionCard>

      {openFilter ? (
        <div className="filter-modal-overlay" onClick={() => setOpenFilter("")} role="presentation">
          <div className="filter-modal-card" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <div className="filter-modal-header">
              <h3>
                {openFilter === FILTERS.city
                  ? "City"
                  : openFilter === FILTERS.collegeType
                    ? "Type Of College"
                    : "Sort Colleges"}
              </h3>
              <button className="filter-modal-close" onClick={() => setOpenFilter("")} type="button">
                x
              </button>
            </div>

            <input
              className="filter-modal-search"
              onChange={(event) => setModalSearch(event.target.value)}
              placeholder={
                openFilter === FILTERS.city
                  ? "Find cities"
                  : openFilter === FILTERS.collegeType
                    ? "Find college type"
                    : "Find sort option"
              }
              value={modalSearch}
            />

            <div className="filter-modal-options">
              {popupOptions.length ? (
                popupOptions.map((option) => {
                  const optionLabel = typeof option === "string" ? option : option.label;
                  const optionValue = typeof option === "string" ? option : option.value;
                  const checked =
                    (openFilter === FILTERS.city && selectedCity === optionValue) ||
                    (openFilter === FILTERS.collegeType && selectedCollegeType === optionValue) ||
                    (openFilter === FILTERS.sort && sortBy === optionValue);

                  return (
                    <button
                      className={`filter-modal-option${checked ? " active" : ""}`}
                      key={optionValue}
                      onClick={() => handleOptionClick(option)}
                      type="button"
                    >
                      <span className={`filter-modal-checkbox${checked ? " checked" : ""}`}>{checked ? "✓" : ""}</span>
                      <span>{optionLabel}</span>
                    </button>
                  );
                })
              ) : (
                <p className="muted">No matching options found.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <SectionCard
        title="College List"
        description="Open a college and continue with your existing department/branch/semester flow."
      >
        <div className="college-grid">
          {filteredColleges.map((college) => (
            <article className="college-card" key={college.id}>
              <p className="program-badge">{getCollegeType(college)}</p>
              <h3>{college.name}</h3>
              <p className="muted">{college.location}</p>
              <button
                className="open-college-button"
                onClick={() => handleOpenCollege(college.id)}
                type="button"
              >
                Open Dashboard
              </button>
            </article>
          ))}
          {!filteredColleges.length ? <p className="muted">No colleges matched the current filters.</p> : null}
        </div>
      </SectionCard>
    </div>
  );
}
