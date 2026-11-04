export type Pathway = {
  id: string;
  title: string;
  field: string;
  qualification: string;
  summary: string;
  duration: string;
  typical_entry: string;
  study_topics: string[];
  job_roles: string[];
  industries: string[];
  next_steps: string[];
  eligibility_note: string;
  demand_note: string;
  source_urls: string[];
};

export type Resource = {
  id: string;
  title: string;
  description?: string;
  url: string;
  source: string;
  kind: "video" | "book" | "official" | "other";
  thumbnail?: string;
};
