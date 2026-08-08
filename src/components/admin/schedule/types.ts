export type ScheduleContact = {
  id?: string;
  name?: string | null;
  phone?: string | null;
};

export type ScheduleLead = {
  id: string;
  stage: string;
  site?: string | null;
  channel?: string | null;
  utm_source?: string | null;
  created_at: string;
  contacts?: ScheduleContact | ScheduleContact[] | null;
};

export type ScheduleAppointment = {
  id: string;
  lead_id: string;
  title: string;
  starts_at: string;
  ends_at?: string | null;
  status: string;
  location?: string | null;
  appointment_type?: string | null;
  leads?:
    | {
        id?: string;
        contact_id?: string;
        contacts?: ScheduleContact | ScheduleContact[] | null;
      }
    | Array<{
        id?: string;
        contact_id?: string;
        contacts?: ScheduleContact | ScheduleContact[] | null;
      }>
    | null;
};
