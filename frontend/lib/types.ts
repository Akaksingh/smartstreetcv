export type SeverityLevel = 1 | 2 | 3 | 4;

export interface DetectedIssue {
  issue_type: string;
  severity: SeverityLevel;
  confidence: number | null;
  description_english: string | null;
  description_hindi: string | null;
  recommended_action: string | null;
  affected_area_m2: number | null;
}

export interface AnalysisResponse {
  issue_id: string;
  issues_detected: DetectedIssue[];
  severity_max: SeverityLevel;
  complaint_generated: boolean;
  complaint_pdf_path: string | null;
  whatsapp_url: string | null;
  processing_time: number;
}

export interface IssueRead {
  id: string;
  image_url: string;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  ward_name: string | null;
  issue_type: string;
  severity: SeverityLevel;
  confidence: number | null;
  description_en: string | null;
  description_hi: string | null;
  recommended_action: string | null;
  overall_condition: string | null;
  is_safe_vehicles: boolean | null;
  is_safe_pedestrians: boolean | null;
  affected_area_m2: number | null;
  status: string;
  created_at: string;
}
