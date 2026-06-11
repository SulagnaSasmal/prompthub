export type Status =
  | "Draft"
  | "In Review"
  | "Testing"
  | "Approved"
  | "Production"
  | "Retired";

export type RiskLevel = "Low" | "Medium" | "High";

export interface User {
  user_id: string;
  username: string;
  email: string;
  full_name?: string;
  roles: string;
  is_active: boolean;
}

export interface Prompt {
  prompt_id: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  owner_id: string;
  status: Status;
  current_version?: string;
  target_model: string;
  risk_level: RiskLevel;
  tags: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  view_count: string;
}

export interface Version {
  version_id: string;
  prompt_id: string;
  version_number: string;
  prompt_text: string;
  change_summary: string;
  status: Status;
  created_by: string;
  created_at: string;
  submitted_at?: string;
}

export interface Evaluation {
  evaluation_id: string;
  version_id: string;
  run_number: number;
  accuracy_score: number;
  completeness_score: number;
  tone_score: number;
  hallucination_score: number;
  formatting_score: number;
  overall_score: number;
  evaluated_by: string;
  evaluated_at: string;
}

export interface TestCase {
  test_case_id: string;
  version_id: string;
  name: string;
  input: string;
  expected_behavior: string;
  result: "Pass" | "Fail" | "Not Run";
  evidence?: string;
  tested_by?: string;
  tested_at?: string;
  created_at: string;
}

export interface GovernanceCheck {
  check_id: string;
  version_id: string;
  check_type: "PII" | "Compliance" | "Bias" | "Hallucination" | "Ownership";
  result: "Pass" | "Flag" | "Fail";
  notes?: string;
  checked_by: string;
  checked_at: string;
}

export interface DashboardMetrics {
  total_prompts: number;
  approved_prompts: number;
  average_quality_score?: number;
  open_governance_flags: number;
  retired_prompts: number;
  failed_prompts_last_90_days: number;
  risk_distribution: Record<RiskLevel, number>;
  prompts_by_category: Record<string, number>;
  most_viewed: Array<{ prompt_id: string; name: string; view_count: string }>;
}
