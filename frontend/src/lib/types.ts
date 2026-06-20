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
  task_type: string;
  usage_notes: string;
  style_profile_id?: string;
  run_count: number;
  formal_quality_score?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  view_count: string;
}

export interface Variable {
  variable_id: string;
  version_id: string;
  name: string;
  label: string;
  help_text: string;
  var_type: "text" | "long-text" | "select" | "source-reference";
  required: boolean;
  default_value?: string;
  example_value?: string;
  options: string[];
}

export interface Run {
  run_id: string;
  version_id: string;
  run_by: string;
  input_payload: Record<string, unknown>;
  output_text?: string;
  model: string;
  latency_ms: number;
  style_profile_applied?: string;
  governance_result: "Pass" | "Blocked";
  blocked_reason?: string;
  created_at: string;
}

export interface RunRating {
  rating_id: string;
  run_id: string;
  rated_by: string;
  tags: string[];
  comment?: string;
  created_at: string;
}

export interface Example {
  example_id: string;
  version_id: string;
  input_payload: Record<string, unknown>;
  output_text: string;
  note: string;
  source_run_id?: string;
  is_stale: boolean;
}

export interface FieldQuality {
  version_id: string;
  total_ratings: number;
  positive_count: number;
  negative_count: number;
  useful_rate: number;
  risk_tags: Record<string, number>;
}

export interface StyleRule {
  rule_id: string;
  style_profile_id: string;
  rule_type: string;
  pattern: string;
  message: string;
  severity: "error" | "warning";
}

export interface StyleProfile {
  style_profile_id: string;
  name: string;
  owner_id: string;
  status: Status;
  version_number: string;
  created_at: string;
  rules: StyleRule[];
}

export interface StyleFlag {
  rule_id: string;
  rule_type: string;
  pattern: string;
  message: string;
  severity: "error" | "warning";
  start: number;
  end: number;
  matched_text: string;
}

export interface Comment {
  comment_id: string;
  target_type: "workflow" | "version" | "run";
  target_id: string;
  author_id: string;
  body: string;
  created_at: string;
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
