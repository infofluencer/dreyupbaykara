export type UserRole =
  | "admin"
  | "doctor"
  | "assistant"
  | "agency"
  | "editor";

export type LeadStage =
  | "new"
  | "contacted"
  | "qualified"
  | "appointment"
  | "won"
  | "lost"
  | "spam";

export type Profile = {
  id: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
};

export type Contact = {
  id: string;
  phone: string;
  name: string | null;
  patient_no?: number | null;
  birth_date?: string | null;
  national_id?: string | null;
  gender?: string | null;
  city?: string | null;
  address?: string | null;
  allergies?: string | null;
  summary?: string | null;
  created_at: string;
  updated_at: string;
};

export type PatientNoteKind = "clinical" | "admin" | "surgery" | "followup";

export type PatientNote = {
  id: string;
  contact_id: string;
  body: string;
  kind: PatientNoteKind;
  created_by: string | null;
  created_at: string;
};

export type Lead = {
  id: string;
  contact_id: string;
  stage: LeadStage;
  status?: string;
  last_contacted_at?: string | null;
  next_action_at?: string | null;
  next_action_note?: string | null;
  lost_reason?: string | null;
  needs_followup?: boolean;
  assigned_to: string | null;
  site: string | null;
  channel: string | null;
  campaign: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  gclid: string | null;
  fbclid: string | null;
  ctwa_clid: string | null;
  lead_ref: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Conversation = {
  id: string;
  contact_id: string;
  patient_id: string | null;
  lead_id: string | null;
  wa_phone: string | null;
  contact_name: string | null;
  status: "open" | "pending" | "closed";
  last_message_at: string | null;
  last_message_preview: string | null;
  last_message_direction: "inbound" | "outbound" | null;
  unread_count: number;
  assigned_to: string | null;
  wa_conversation_id: string | null;
  locked_by: string | null;
  locked_at: string | null;
  created_at: string;
  updated_at?: string;
};

export type MessageDirection = "inbound" | "outbound";
export type MessageStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "read"
  | "failed"
  | "received";

export type Message = {
  id: string;
  conversation_id: string;
  wa_message_id: string | null;
  direction: MessageDirection;
  body: string | null;
  media_type: string | null;
  media_url: string | null;
  status: MessageStatus;
  sent_by: string | null;
  automated?: boolean;
  created_at: string;
};
