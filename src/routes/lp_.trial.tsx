import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";

import { BrandLogo } from "@/components/BrandLogo";
import { DOMAIN_CATEGORIES, type DomainCategory } from "@/lib/domain-categories";
import {
  createTrialOrder,
  TRIAL_PLAN_PRICES,
  TRIAL_SINGLE_DISCOUNT_PERCENT,
  TRIAL_SINGLE_ORIGINAL_PRICE,
} from "@/lib/landing.functions";
import { capturePostHogEvent } from "@/lib/posthog";

export const Route = createFileRoute("/lp_/trial")({
  head: () => ({
    meta: [
      { title: "Beginner — 직무 체험 신청 (24시간 내 제공)" },
      {
        name: "description",
        content: "원하는 직무와 기업 유형을 고르면, 현직자가 만든 실무 과제가 24시간 안에 도착해요.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LpTrialPage,
});

const OTHER_JOB_ROLE = "직접 입력";
const OTHER_COMPANY_TYPE = "희망 기업 직접 입력";

function trackTrialEvent(event: string, properties?: Record<string, unknown>) {
  void capturePostHogEvent(event, { landing_page: "trial", ...properties });
}

const JOB_ROLES_BY_CATEGORY: Record<DomainCategory, string[]> = {
  "기획·전략": ["서비스 기획자", "사업 전략 기획자", "PM/PO", "신사업 기획자", OTHER_JOB_ROLE],
  "법무·사무·총무": ["법무 담당자", "계약 검토 담당자", "총무 담당자", "사무 지원", OTHER_JOB_ROLE],
  "인사·HR": ["채용 담당자", "인사 운영 담당자", "조직문화 담당자", "교육/HRD 담당자", OTHER_JOB_ROLE],
  "회계·세무": ["회계 담당자", "세무 담당자", "재무 분석가", "결산 담당자", OTHER_JOB_ROLE],
  "마케팅·광고·MD": ["CRM 마케터", "콘텐츠 마케터", "퍼포먼스 마케터", "MD", OTHER_JOB_ROLE],
  "AI·개발·데이터": ["데이터 분석가", "백엔드 개발자", "프론트엔드 개발자", "AI/ML 엔지니어", OTHER_JOB_ROLE],
  디자인: ["브랜드 디자이너", "UI/UX 디자이너", "그래픽 디자이너", "프로덕트 디자이너", OTHER_JOB_ROLE],
  "물류·무역": ["물류 운영 담당자", "무역 사무원", "SCM 담당자", "수출입 담당자", OTHER_JOB_ROLE],
  "운전·운송·배송": ["배송 기사", "물류센터 운영자", "운송 관리자", OTHER_JOB_ROLE],
  영업: ["기업영업 담당자", "영업 관리자", "세일즈 매니저", OTHER_JOB_ROLE],
  "고객상담·TM": ["고객상담원", "텔레마케터", "CS 매니저", OTHER_JOB_ROLE],
  "금융·보험": ["금융 분석가", "보험 심사역", "자산관리 담당자", OTHER_JOB_ROLE],
  "식·음료": ["매장 운영자", "메뉴 개발자", "F&B MD", OTHER_JOB_ROLE],
  "고객서비스·리테일": ["매장 매니저", "리테일 MD", "CS 담당자", OTHER_JOB_ROLE],
  "엔지니어링·설계": ["공정 엔지니어", "기계 설계 엔지니어", "품질 엔지니어", OTHER_JOB_ROLE],
  "제조·생산": ["생산관리 담당자", "품질관리 담당자", "공정 개선 담당자", OTHER_JOB_ROLE],
  교육: ["커리큘럼 기획자", "교육 운영 담당자", "교육 콘텐츠 개발자", OTHER_JOB_ROLE],
  "건축·시설": ["시설관리 담당자", "건축 설계 보조", "안전관리 담당자", OTHER_JOB_ROLE],
  "의료·바이오": ["임상시험 코디네이터", "바이오 연구원", "의료데이터 분석가", OTHER_JOB_ROLE],
  "미디어·문화·스포츠": ["콘텐츠 PD", "미디어 마케터", "이벤트 기획자", OTHER_JOB_ROLE],
  "공공·복지": ["정책 기획자", "복지 서비스 담당자", "공공사업 운영자", OTHER_JOB_ROLE],
};

const COMPANY_TYPES = ["스타트업", "중소기업", "중견기업", "대기업", OTHER_COMPANY_TYPE];

function ApplyForm() {
  const [step, setStep] = useState<1 | 2>(1);
  const [jobCategory, setJobCategory] = useState<DomainCategory>(DOMAIN_CATEGORIES[0]);
  const [jobRole, setJobRole] = useState(JOB_ROLES_BY_CATEGORY[DOMAIN_CATEGORIES[0]][0]);
  const [customJobRole, setCustomJobRole] = useState("");

  function handleCategoryChange(category: DomainCategory) {
    setJobCategory(category);
    setJobRole(JOB_ROLES_BY_CATEGORY[category][0]);
    setCustomJobRole("");
    trackTrialEvent("trial_form_input_changed", {
      field: "job_category",
      value: category,
    });
  }
  const [companyType, setCompanyType] = useState(COMPANY_TYPES[0]);
  const [customCompanyType, setCustomCompanyType] = useState("");
  const [email, setEmail] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [website, setWebsite] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  function getSelections() {
    const effectiveJobRole = jobRole === OTHER_JOB_ROLE ? customJobRole.trim() : jobRole;
    const effectiveCompanyType = companyType === OTHER_COMPANY_TYPE ? customCompanyType.trim() : companyType;

    if (jobRole === OTHER_JOB_ROLE && !effectiveJobRole) {
      setError("체험하고 싶은 직무를 입력해주세요.");
      return null;
    }
    if (companyType === OTHER_COMPANY_TYPE && !effectiveCompanyType) {
      setError("기업을 입력해주세요.");
      return null;
    }
    return { effectiveJobRole, effectiveCompanyType };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const selections = getSelections();
    if (!selections) {
      return;
    }
    if (step < 2) {
      trackTrialEvent("trial_apply_next_clicked", {
        step: 1,
        job_category: jobCategory,
        job_role: selections.effectiveJobRole,
        company_type: selections.effectiveCompanyType,
      });
      setStep(2);
      return;
    }
    if (!agreedToTerms) {
      setError("환불 정책과 이용약관에 동의해주세요.");
      return;
    }
    trackTrialEvent("trial_checkout_started", {
      job_category: jobCategory,
      job_role: selections.effectiveJobRole,
      company_type: selections.effectiveCompanyType,
      email: email.trim(),
      plan: "single",
    });
    setIsSubmitting(true);
    try {
      const result = await createTrialOrder({
        data: {
          jobRole: selections.effectiveJobRole,
          companyType: selections.effectiveCompanyType,
          plan: "single",
          email: email.trim(),
          agreedToTerms: true,
          website,
        },
      });
      window.location.href = result.payurl;
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "신청하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <form className="apply" onSubmit={handleSubmit}>
      <div className="apply-head">
        <span className="apply-step" aria-live="polite">
          Step {step} / 2
        </span>
        <h3>{step === 1 ? "직무와 기업을 선택해주세요" : "이메일과 결제 정보를 확인해주세요"}</h3>
      </div>

      {step === 1 ? (
        <>
          <div className="fgroup">
            <span className="flabel">직무 분야</span>
            <div className="select">
              <select
                value={jobCategory}
                onChange={(event) => handleCategoryChange(event.target.value as DomainCategory)}
              >
                {DOMAIN_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <span style={{ color: "#9CA3AF", fontSize: 12 }}>▾</span>
            </div>
          </div>

          <div className="fgroup">
            <span className="flabel">체험할 직무</span>
            <div className="select">
              <select
                value={jobRole}
                onChange={(event) => {
                  const value = event.target.value;
                  setJobRole(value);
                  trackTrialEvent("trial_form_input_changed", {
                    field: "job_role",
                    value,
                  });
                }}
              >
                {JOB_ROLES_BY_CATEGORY[jobCategory].map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <span style={{ color: "#9CA3AF", fontSize: 12 }}>▾</span>
            </div>
            {jobRole === OTHER_JOB_ROLE && (
              <input
                type="text"
                maxLength={100}
                className="textinput"
                placeholder="체험하고 싶은 직무를 입력해주세요"
                value={customJobRole}
                onChange={(event) => setCustomJobRole(event.target.value)}
                onBlur={() => {
                  const value = customJobRole.trim();
                  if (value) {
                    trackTrialEvent("trial_form_input_changed", {
                      field: "custom_job_role",
                      value,
                    });
                  }
                }}
              />
            )}
          </div>

          <div className="fgroup">
            <span className="flabel">기업</span>
            <div className="select">
              <select
                value={companyType}
                onChange={(event) => {
                  const value = event.target.value;
                  setCompanyType(value);
                  trackTrialEvent("trial_form_input_changed", {
                    field: "company_type",
                    value,
                  });
                }}
              >
                {COMPANY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <span style={{ color: "#9CA3AF", fontSize: 12 }}>▾</span>
            </div>
            {companyType === OTHER_COMPANY_TYPE && (
              <input
                type="text"
                maxLength={100}
                className="textinput"
                placeholder="기업을 입력해주세요"
                value={customCompanyType}
                onChange={(event) => setCustomCompanyType(event.target.value)}
                onBlur={() => {
                  const value = customCompanyType.trim();
                  if (value) {
                    trackTrialEvent("trial_form_input_changed", {
                      field: "custom_company_type",
                      value,
                    });
                  }
                }}
              />
            )}
          </div>
        </>
      ) : (
        <>
          <div className="selection-summary">
            <span>
              직무 <b>{jobRole === OTHER_JOB_ROLE ? customJobRole : jobRole}</b>
            </span>
            <span>
              기업 <b>{companyType === OTHER_COMPANY_TYPE ? customCompanyType : companyType}</b>
            </span>
          </div>

          <div className="fgroup">
            <span className="flabel">
              이메일 <span style={{ color: "#435BDA" }}>*</span>
            </span>
            <input
              type="email"
              required
              maxLength={200}
              className="textinput"
              placeholder="과제를 받을 이메일 주소"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => {
                const [, domain] = email.trim().split("@");
                if (domain) {
                  trackTrialEvent("trial_form_input_completed", {
                    field: "email",
                    email_domain: domain.toLowerCase(),
                  });
                }
              }}
            />
          </div>

          <div className="fgroup">
            <span className="flabel">결제 옵션</span>
            <div className="opt solo">
              <span>
                <b>체험 1회</b>
                <span className="sub">과제 1건 · 현직자 답안 포함</span>
              </span>
              <span className="price">
                <s className="price-original">{TRIAL_SINGLE_ORIGINAL_PRICE.toLocaleString()}원</s>
                <span className="price-badge">{TRIAL_SINGLE_DISCOUNT_PERCENT}%</span>
                <b>{TRIAL_PLAN_PRICES.single.toLocaleString()}원</b>
              </span>
            </div>
            <p className="purchase-count">15명이 구매했어요!</p>
          </div>
        </>
      )}

      <div style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }} aria-hidden="true">
        <label htmlFor="lp-trial-website">웹사이트</label>
        <input
          id="lp-trial-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>

      {step === 2 && (
        <label className="agree">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(event) => {
              setAgreedToTerms(event.target.checked);
              trackTrialEvent("trial_terms_consent_changed", { agreed: event.target.checked });
            }}
          />
          <span>
            <a
              href="/terms"
              target="_blank"
              rel="noreferrer"
              onClick={() => trackTrialEvent("trial_policy_link_clicked", { policy: "terms", placement: "form" })}
            >
              이용약관
            </a>{" "}
            및{" "}
            <a
              href="/privacy"
              target="_blank"
              rel="noreferrer"
              onClick={() => trackTrialEvent("trial_policy_link_clicked", { policy: "privacy", placement: "form" })}
            >
              개인정보처리방침
            </a>
            , 환불 정책에 동의합니다.
          </span>
        </label>
      )}

      {error && (
        <p role="alert" className="formerror">
          {error}
        </p>
      )}

      {step === 1 && (
        <a
          href={`/simulation/${PREVIEW_SIMULATION_ID}?demo=1`}
          style={{ textAlign: "center", fontSize: 13.5, color: "#435BDA", textDecoration: "underline" }}
          onClick={() => trackTrialEvent("trial_preview_simulation_clicked", { placement: "apply_step1" })}
        >
          시뮬레이션 미리보기
        </a>
      )}

      <div className="apply-actions">
        {step > 1 && (
          <button
            type="button"
            className="back"
            onClick={() => {
              trackTrialEvent("trial_apply_back_clicked", { step: 2 });
              setError("");
              setStep(1);
            }}
          >
            이전
          </button>
        )}
        <button
          type="submit"
          className="submit"
          disabled={isSubmitting}
          onClick={() => trackTrialEvent("trial_apply_primary_button_clicked", { step })}
        >
          {step < 2 ? "다음" : isSubmitting ? "결제창으로 이동 중..." : "결제창으로 이동하기"}
        </button>
      </div>
      {step === 2 && (
        <span style={{ textAlign: "center", fontSize: 12.5, color: "#9CA3AF" }}>
          24시간 내 미제공 시 전액 환불
        </span>
      )}
    </form>
  );
}

// 실제 현직자 시뮬레이션 "온라인 쇼핑몰 구매 이탈 원인 분석 및 구매 흐름 개선"
// (job_simulations.id = 9ab768b1-…, 작성자 김*현)의 상황·단계·모범답안을 그대로 옮긴 미리보기.
// 모범답안은 유료 콘텐츠라 1단계 일부만 노출하고 나머지는 잠금 처리한다.
const PREVIEW_AUTOPLAY_MS = 4000;

// 미리보기가 옮겨 담은 실제 시뮬레이션. demo=1로 열면 비로그인도 과제 형식을 볼 수 있다.
const PREVIEW_SIMULATION_ID = "9ab768b1-86a8-4eb5-a0ff-7d59b1ce5165";

const PREVIEW_STEPS = [
  { no: 1, title: "핵심 문제 분석", min: 7 },
  { no: 2, title: "개선된 구매 흐름 설계", min: 8 },
  { no: 3, title: "핵심 화면 개선안 제작", min: 12 },
];

const PREVIEW_SLIDES = [
  {
    label: "시뮬레이션 예시 보기",
    actionOnly: false,
    content: (
      <>
        <div className="pv-head">
          <b className="pv-title">온라인 쇼핑몰 구매 이탈 원인 분석 및 구매 흐름 개선</b>
          <span className="pv-tag">UI/UX 디자인 · 약 30분</span>
        </div>
        <div className="pv-card">
          <p className="pv-quote">
            "상품 조회와 장바구니 담기는 꾸준히 늘고 있는데, 결제 완료율은 오히려 낮아지고 있습니다.
            어디서, 왜 이탈이 발생하는지 직접 분석해 개선안을 제안해주세요."
          </p>
        </div>
        <div className="pv-steps">
          {PREVIEW_STEPS.map((step) => (
            <div className="pv-step" key={step.no}>
              <span className="pv-stepno">{step.no}</span>
              <b>{step.title}</b>
              <span className="pv-stepmin">{step.min}분</span>
            </div>
          ))}
        </div>
      </>
    ),
    foot: null,
  },
  {
    label: "모범 답안 예시 보기",
    actionOnly: false,
    content: (
      <>
        <div className="pv-head">
          <b className="pv-title">1단계 · 핵심 문제 분석</b>
          <span className="pv-tag pv-tag-blue">모범 답안</span>
        </div>
        <div className="pv-card">
          <p className="pv-body">
            가장 큰 문제는 장바구니에서 주문서로 넘어가는 구간이다. 장바구니에 들어온{" "}
            <b>3,900명 중 주문서로 이동한 사용자는 1,700명</b>뿐이다. 장바구니에서는 쿠폰 할인,
            배송비, 최종 결제 금액을 정확히 확인하기 어렵다.
          </p>
          <div className="pv-callout">
            <span className="pv-calloutlbl">핵심 문제</span>
            사용자가 장바구니에서 실제 결제 금액을 미리 알기 어려워, 구매를 계속해도 되는지 확신하지
            못하고 이탈하고 있다.
          </div>
        </div>
        <div className="pv-lock">🔒 2·3단계 모범답안은 과제를 제출하면 전체 공개돼요</div>
      </>
    ),
    foot: null,
  },
  {
    label: "현직자 코멘트",
    actionOnly: false,
    content: (
      <div className="pv-card">
        <div className="pv-person">
          <span className="pv-avatar">김</span>
          <span className="pv-personinfo">
            <b>김*현 · UI/UX 디자인</b>
            <span className="pv-meta">라이프스타일 커머스 · 스타트업 · 1~2년차</span>
          </span>
          <span className="pv-tag pv-tag-green">검수 완료</span>
        </div>
        <p className="pv-quote">
          "실무에서는 '전환율이 떨어진다'는 말만 듣고 시작하는 경우가 많아요. 그래서 이 과제도 정답을
          정해두지 않았어요. 데이터에서 이탈 구간을 직접 찾고, 왜 그 화면이라고 판단했는지 설명할 수
          있는지를 봅니다."
        </p>
      </div>
    ),
    foot: <span className="pv-note">✓ 모든 과제는 해당 직무 현직자가 만들고 검수해요</span>,
  },
  {
    label: "시뮬레이션 미리보기",
    actionOnly: true,
    content: null,
    foot: (
      <a
        className="pv-btn"
        href={`/simulation/${PREVIEW_SIMULATION_ID}?demo=1`}
        onClick={() => trackTrialEvent("trial_preview_simulation_clicked", { placement: "preview_slide_4" })}
      >
        시뮬레이션 미리보기 →
      </a>
    ),
  },
];

function PreviewCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % PREVIEW_SLIDES.length);
    }, PREVIEW_AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="carousel">
      <div className="carousel-track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {PREVIEW_SLIDES.map((slide, i) => (
          <div className="carousel-slide" key={i}>
            <div className="pv-frame">
              {slide.actionOnly ? (
                <div className="pv-action-only">{slide.foot}</div>
              ) : (
                <>
                  <b className="pv-label">{slide.label}</b>
                  {/* 실제 수행 화면(SimulationShell)과 같은 구성: 상단 진행바 → 회색 본문 → 하단 액션바 */}
                  <div className="mock mock-app">
                    <div className="appbar">
                      <span className="appbar-logo">Beginner</span>
                      <span className="appbar-right">
                        <span className="appbar-stepname">핵심 문제 분석</span>
                        <span className="appbar-prog">
                          <i />
                        </span>
                        <span>1/3</span>
                      </span>
                    </div>
                    <div className="mockbody">{slide.content}</div>
                    {slide.foot && <div className="appfoot">{slide.foot}</div>}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="carousel-dots">
        {PREVIEW_SLIDES.map((slide, i) => (
          <button
            key={i}
            type="button"
            className={i === index ? "on" : ""}
            onClick={() => {
              trackTrialEvent("trial_preview_slide_selected", { slide_index: i + 1, slide_label: slide.label });
              setIndex(i);
            }}
            aria-label={slide.label}
          />
        ))}
      </div>
    </div>
  );
}

function LpTrialPage() {
  return (
    <div className="lp-trial ph-no-capture">
      <div className="hero">
        <div className="wrap">
          <div className="nav">
            <div className="brand">
              <BrandLogo className="h-[1.9rem] w-auto max-w-[9.75rem] object-contain object-left" />
            </div>
            <div className="navlinks">
              <a
                href={`/simulation/${PREVIEW_SIMULATION_ID}?demo=1`}
                onClick={() => trackTrialEvent("trial_navigation_clicked", { destination: "simulation_preview" })}
              >
                미리보기
              </a>
              <a href="#how" onClick={() => trackTrialEvent("trial_navigation_clicked", { destination: "how" })}>
                이용 방법
              </a>
              <a href="#refund" onClick={() => trackTrialEvent("trial_navigation_clicked", { destination: "refund" })}>
                환불 정책
              </a>
              <a className="btn" href="#apply" onClick={() => trackTrialEvent("trial_navigation_clicked", { destination: "apply" })}>
                체험 신청하기
              </a>
            </div>
          </div>

          <div className="heroin" id="apply">
            <div className="hero-copy">
            <div className="arrival" aria-label="환불 정책">
              <span>24시간 내 미제공 시 전액 환불</span>
              <span>불만족 시 3일 내 환불</span>
            </div>
              <h1>
                궁금한 직무,
                <br />
                직접 해보고 판단하세요!
              </h1>
              <p className="lead">
                원하는 직무와 기업 유형을 고르면,
                <br />
                그 분야 현직자가 만든 실무 과제가 24시간 안에 도착해요.
              </p>
            </div>

            <ApplyForm />
          </div>
        </div>
      </div>

      <section id="how">
        <div className="wrap">
          <p className="eyebrow">이렇게 진행돼요</p>
          <h2 style={{ marginTop: 9 }}>신청부터 체험 과제 도착까지, 24시간</h2>
          <div className="grid3">
            <div>
              <div className="stepttl">
                <span className="stepnum">1</span>
                <b style={{ fontSize: 16, letterSpacing: "-.3px" }}>직무 고르고 신청</b>
              </div>
              <div className="mock">
                <div className="mockbar">
                  <i></i>
                  <i></i>
                  <i></i>
                </div>
                <div className="mockbody">
                  <div className="kv">
                    <span>직무</span>
                    <b>CRM 마케터</b>
                  </div>
                  <div className="kv">
                    <span>기업 유형</span>
                    <b>스타트업</b>
                  </div>
                  <div className="kv">
                    <span>결제 옵션</span>
                    <b>체험 1회</b>
                  </div>
                  <div
                    style={{
                      borderTop: "1px dashed #E3E6EC",
                      paddingTop: 10,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 12, color: "#6B7280" }}>결제 금액</span>
                    <b style={{ fontSize: 18, color: "#435BDA" }}>{TRIAL_PLAN_PRICES.single.toLocaleString()}원</b>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="stepttl">
                <span className="stepnum">2</span>
                <b style={{ fontSize: 16, letterSpacing: "-.3px" }}>현직자 검수 · 과제 준비</b>
              </div>
              <div className="mock">
                <div className="mockbar">
                  <i></i>
                  <i></i>
                  <i></i>
                </div>
                <div className="mockbody">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <b style={{ fontSize: 12.5 }}>도착까지</b>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: "#435BDA",
                        background: "#E9EEFC",
                        borderRadius: 6,
                        padding: "4px 9px",
                      }}
                    >
                      18:42:07
                    </span>
                  </div>
                  <div className="prog">
                    <i style={{ width: "38%" }}></i>
                  </div>
                  <div className="check">
                    <span className="dot done">✓</span>
                    <span>신청 접수</span>
                  </div>
                  <div className="check">
                    <span className="dot done">✓</span>
                    <span>현직자 검수 완료</span>
                  </div>
                  <div className="check">
                    <span className="dot now"></span>
                    <b style={{ color: "#1B2440" }}>체험 과제 준비 중</b>
                  </div>
                  <div className="check" style={{ color: "#B7BEC9" }}>
                    <span className="dot todo"></span>
                    <span>과제 도착</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="stepttl">
                <span className="stepnum">3</span>
                <b style={{ fontSize: 16, letterSpacing: "-.3px" }}>체험하고 답안 비교</b>
              </div>
              <div className="mock">
                <div className="mockbar">
                  <i></i>
                  <i></i>
                  <i></i>
                </div>
                <div className="mockbody">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <b style={{ fontSize: 12.5 }}>CRM 마케터 체험</b>
                    <span style={{ fontSize: 11, color: "#0F9D58", fontWeight: 700 }}>21시간 만에 도착</span>
                  </div>
                  <div
                    style={{
                      border: "1px solid #E9ECF2",
                      borderRadius: 8,
                      padding: 11,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <span className="bar" style={{ width: "88%" }}></span>
                    <span className="bar" style={{ width: "70%" }}></span>
                    <span className="bar" style={{ width: "46%" }}></span>
                  </div>
                  <div style={{ display: "flex", gap: 7 }}>
                    <div
                      style={{
                        flex: 1,
                        background: "#F5F6F9",
                        border: "1px solid #E9ECF2",
                        borderRadius: 8,
                        padding: "9px 10px",
                      }}
                    >
                      <span style={{ fontSize: 10.5, color: "#9CA3AF", fontWeight: 700, display: "block" }}>
                        내 답안
                      </span>
                      <span style={{ fontSize: 11.5, color: "#4B5563" }}>이탈률부터 확인</span>
                    </div>
                    <div
                      style={{
                        flex: 1,
                        background: "#E9EEFC",
                        border: "1px solid #D2DAF6",
                        borderRadius: 8,
                        padding: "9px 10px",
                      }}
                    >
                      <span style={{ fontSize: 10.5, color: "#435BDA", fontWeight: 700, display: "block" }}>
                        현직자 답안
                      </span>
                      <span style={{ fontSize: 11.5, color: "#4B5563" }}>첫 결제 코호트부터</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="sect-gray" id="preview">
        <div className="wrap">
          <div className="center">
            <p className="eyebrow">미리보기</p>
            <h2 style={{ marginTop: 9 }}>체험 과제, 이런 모습이에요</h2>
          </div>
          <PreviewCarousel />
        </div>
      </section>

      <section id="refund">
        <div className="wrap">
          <div className="center">
            <p className="eyebrow">환불 정책</p>
            <h2>
              못 받으면 환불,
              <br />
              마음에 안 들어도 환불
            </h2>
          </div>
          <div className="grid2">
            <div className="card">
              <h3>24시간 내 미제공 시 전액 환불해 드려요</h3>
              <p>신청 시점부터 24시간 안에 체험 과제가 도착하지 않으면, 고객센터로 알려주세요. 전액 환불해 드려요.</p>
            </div>
            <div className="card">
              <h3>불만족 시 3일 내 환불</h3>
              <p>체험을 마친 뒤 3일 안에 환불을 요청하면, 사유를 묻지 않고 처리해 드려요.</p>
            </div>
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="cta">
            <b style={{ fontSize: "clamp(22px,3.4vw,30px)", letterSpacing: "-.6px" }}>
              오늘 신청하면, 내일 체험해요
            </b>
            <span style={{ fontSize: 15, color: "#D9E0FA", lineHeight: 1.6 }}>
              24시간 내 미제공 시 전액 환불 · 불만족 시 3일 내 환불
            </span>
            <a className="go" href="#apply" onClick={() => trackTrialEvent("trial_cta_clicked", { placement: "bottom" })}>
              체험 신청하기 →
            </a>
          </div>
        </div>
      </section>

      <div className="wrap">
        <footer>
          <div className="footer-contact">
            <span>© 2026 Beginner. All rights reserved.</span>
            <a href="mailto:info@beginner.today">Contact: info@beginner.today</a>
          </div>
          <div>
            <a href="#refund" onClick={() => trackTrialEvent("trial_policy_link_clicked", { policy: "refund", placement: "footer" })}>
              환불 정책
            </a>
            <a href="/terms" onClick={() => trackTrialEvent("trial_policy_link_clicked", { policy: "terms", placement: "footer" })}>
              이용약관
            </a>
            <a href="/privacy" onClick={() => trackTrialEvent("trial_policy_link_clicked", { policy: "privacy", placement: "footer" })}>
              개인정보처리방침
            </a>
          </div>
        </footer>
        <div className="bizinfo">
          {/* TODO: 사업자정보 확정 후 실값으로 교체 (상호/대표자/사업자등록번호/통신판매업신고번호/주소/연락처) */}
          상호 [TODO] · 대표 [TODO] · 사업자등록번호 [TODO] · 통신판매업신고번호 [TODO]
          <br />
          주소 [TODO] · 고객센터 [TODO]
        </div>
      </div>
    </div>
  );
}
