// Exam registry. To add an exam: generate public/data/<file>.json with scripts/cutoffs/build_static.py
// (or load its cutoffs into the database) and set ready: true.
export type ExamInfo = { id: string; label: string; full: string; file: string; ready: boolean };

export const EXAMS: ExamInfo[] = [
  { id: "MHT-CET", label: "MHT CET", full: "Maharashtra Common Entrance Test", file: "mhtcet", ready: true },
  { id: "JEE-MAIN", label: "JEE Main", full: "Joint Entrance Examination (Main)", file: "jeemain", ready: false },
  { id: "NEET", label: "NEET", full: "National Eligibility cum Entrance Test", file: "neet", ready: false },
  { id: "CUET", label: "CUET", full: "Common University Entrance Test", file: "cuet", ready: false },
];
