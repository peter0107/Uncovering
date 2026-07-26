-- Apply this after the full schema migration history and before CSV import.
-- The CSV export is the source of truth for these tables, so seeded rows from
-- historical migrations must not remain in the new project.

truncate table
  public.expert_simulation_share_feedback,
  public.company_applicant_ai_reviews,
  public.company_simulation_ai_reviews,
  public.company_applicant_review_states,
  public.company_saved_applicants,
  public.company_job_postings,
  public.submissions,
  public.resumes,
  public.applicants,
  public.job_simulations,
  public.job_seekers,
  public.ai_prompt_settings,
  public.coffee_chat_bookings,
  public.service_applications,
  public.companies
restart identity cascade;
