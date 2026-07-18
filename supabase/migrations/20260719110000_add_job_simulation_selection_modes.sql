alter table public.job_simulations
  add column if not exists selection_mode text not null default 'separated',
  add column if not exists shared_situation text not null default '',
  add column if not exists shared_materials text not null default '';

alter table public.job_simulations
  drop constraint if exists job_simulations_selection_mode_check;

alter table public.job_simulations
  add constraint job_simulations_selection_mode_check
  check (selection_mode in ('separated', 'common'));
