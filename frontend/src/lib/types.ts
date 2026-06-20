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

export interface IntegrationCapability {
  source: string;
  status: string;
  capabilities: string[];
  guidance: string;
}

export interface IntegrationConnection {
  connection_id: string;
  provider: string;
  name: string;
  status: string;
  created_by: string;
  created_at: string;
  config_json: Record<string, unknown>;
  secret_status?: string;
}

export interface SourceReference {
  source_reference_id: string;
  provider: string;
  locator: string;
  content_hash: string;
  metadata_json: Record<string, unknown>;
  created_at: string;
}

export interface OpenApiDiff {
  base_reference: string;
  head_reference: string;
  added: string[];
  removed: string[];
  unchanged_count: number;
  summary: string;
  diff_markdown: string;
}

export interface RunExport {
  run_id: string;
  filename: string;
  target_type: "markdown";
  content: string;
}

export interface ExportEvent {
  export_id: string;
  run_id: string;
  target_type: string;
  target_reference?: string;
  exported_by: string;
  created_at: string;
  status: string;
}

export interface RunComparison {
  left_run_id: string;
  right_run_id: string;
  left_output: string;
  right_output: string;
  diff_lines: string[];
}

export interface ReviewQueueItem {
  version_id: string;
  prompt_id: string;
  workflow_name: string;
  version_number: string;
  status: Status;
  owner_id: string;
  risk_level: RiskLevel;
  queue_section: string;
  missing_requirements: string[];
  primary_action: string;
  last_activity: string;
}

export interface DeploymentSummary {
  prompt_id: string;
  workflow_name: string;
  current_version?: string;
  risk_level: RiskLevel;
  run_count: number;
  webhook_delivery_status: string;
  failed_deliveries: number;
  updated_at: string;
}

export interface WorkflowPack {
  pack_id: string;
  name: string;
  source_url?: string;
  license: string;
  imported_by: string;
  created_at: string;
  status: string;
  manifest_json: Record<string, unknown>;
}

export interface ModelProvider {
  provider_id: string;
  name: string;
  provider_type: string;
  model_name: string;
  status: string;
  config_json: Record<string, unknown>;
  credential_status?: string;
  created_by: string;
  created_at: string;
}

export interface AuditEvent {
  audit_event_id: string;
  actor_id?: string;
  event_type: string;
  target_type: string;
  target_id?: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface RetentionPolicy {
  retention_policy_id: string;
  name: string;
  applies_to: string;
  retention_days: number;
  redact_sensitive_inputs: boolean;
  private_source_storage: string;
  created_by: string;
  created_at: string;
}

export interface EnterpriseAuthConfig {
  auth_config_id: string;
  provider_type: string;
  name: string;
  issuer_url?: string;
  client_id?: string;
  secret_status?: string;
  status: string;
  created_by: string;
  created_at: string;
}

export interface WebhookEndpoint {
  webhook_id: string;
  name: string;
  url: string;
  event_type: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export interface WebhookDelivery {
  delivery_id: string;
  webhook_id: string;
  event_type: string;
  status: "Pending" | "Delivered" | "Failed";
  attempt_count: number;
  max_attempts: number;
  next_retry_at?: string;
  last_status_code?: number;
  last_error?: string;
  created_at: string;
  delivered_at?: string;
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
