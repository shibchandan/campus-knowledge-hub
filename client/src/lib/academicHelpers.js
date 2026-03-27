export function groupStructuresIntoPrograms(structures) {
  const programMap = new Map();

  for (const item of structures) {
    if (!programMap.has(item.programId)) {
      programMap.set(item.programId, {
        id: item.programId,
        name: item.programName,
        branchLabel: "Branch / Domain",
        branches: new Map()
      });
    }

    const program = programMap.get(item.programId);

    if (!program.branches.has(item.branchId)) {
      program.branches.set(item.branchId, {
        id: item.branchId,
        name: item.branchName,
        description: item.branchDescription || "Admin-managed branch structure.",
        semesters: []
      });
    }

    const branch = program.branches.get(item.branchId);
    branch.semesters.push({
      id: item.semesterId,
      semester: item.semesterName,
      subjects: [],
      semesterOrder: item.semesterOrder
    });
  }

  return Array.from(programMap.values()).map((program) => ({
    ...program,
    branches: Array.from(program.branches.values()).map((branch) => ({
      ...branch,
      semesters: branch.semesters.sort((a, b) => a.semesterOrder - b.semesterOrder)
    }))
  }));
}

export function getDynamicProgramById(programs, programId) {
  return programs.find((program) => program.id === programId);
}

export function getDynamicBranchById(program, branchId) {
  return program?.branches.find((branch) => branch.id === branchId);
}
