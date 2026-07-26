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
    -- 새 프로젝트의 schema 적용 단계에서는 기업 CSV를 아직 넣지 않았다.
    -- 이후 데이터 복원 시 현재 회사/시뮬레이션 관계가 그대로 들어오므로,
    -- 여기서 임시 기업을 만들거나 migration 전체를 중단하지 않는다.
    return;
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
