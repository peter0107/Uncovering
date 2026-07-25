do $move_coloso_product_planner$
declare
  target_company_id uuid;
begin
  select id
  into target_company_id
  from public.companies
  where code = 'DAY1-F3FF'
     or unique_code = 'DAY1-F3FF'
  limit 1;

  if target_company_id is null then
    raise exception 'DAY1-F3FF 기업을 찾을 수 없습니다.';
  end if;

  update public.job_simulations
  set company_id = target_company_id
  where company_id in (
    select id
    from public.companies
    where name = '데이원컴퍼니'
      and id <> target_company_id
  )
    and (title ilike '%콜로소%' or role_label ilike '%콜로소%')
    and (title ilike '%상품%기획%' or role_label ilike '%상품%기획%');
end;
$move_coloso_product_planner$;
