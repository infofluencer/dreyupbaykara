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
  lead_id: string | null;
  wa_conversation_id: string | null;
  last_message_at: string | null;
  locked_by: string | null;
  locked_at: string | null;
  created_at: string;
};

export type MessageDirection = "inbound" | "outbound";
export type MessageStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

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
  created_at: string;
};
