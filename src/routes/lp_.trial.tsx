import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { BrandLogo } from "@/components/BrandLogo";
import { DOMAIN_CATEGORIES, type DomainCategory } from "@/lib/domain-categories";
import {
  createTrialOrder,
  TRIAL_PLAN_PRICES,
  TRIAL_SINGLE_DISCOUNT_PERCENT,
  TRIAL_SINGLE_ORIGINAL_PRICE,
} from "@/lib/landing.functions";

export const Route = createFileRoute("/lp_/trial")({
  head: () => ({
    meta: [
      { title: "Beginner — 직무 체험 신청 (24시간 내 제공)" },
      {
        name: "description",
        content: "원하는 직무와 기업 유형을 고르면, 현직자가 만든 체험 과제가 24시간 안에 도착해요.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LpTrialPage,
});

const OTHER_JOB_ROLE = "직접 입력";
const OTHER_COMPANY_TYPE = "희망 기업 직접 입력";

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
      setStep(2);
      return;
    }
    if (!agreedToTerms) {
      setError("환불 정책과 이용약관에 동의해주세요.");
      return;
    }
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
              <select value={jobRole} onChange={(event) => setJobRole(event.target.value)}>
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
              />
            )}
          </div>

          <div className="fgroup">
            <span className="flabel">기업</span>
            <div className="select">
              <select value={companyType} onChange={(event) => setCompanyType(event.target.value)}>
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
            onChange={(event) => setAgreedToTerms(event.target.checked)}
          />
          <span>
            <a href="/terms" target="_blank" rel="noreferrer">
              이용약관
            </a>{" "}
            및{" "}
            <a href="/privacy" target="_blank" rel="noreferrer">
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

      <div className="apply-actions">
        {step > 1 && (
          <button
            type="button"
            className="back"
            onClick={() => {
              setError("");
              setStep(1);
            }}
          >
            이전
          </button>
        )}
        <button type="submit" className="submit" disabled={isSubmitting}>
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

function LpTrialPage() {
  return (
    <div className="lp-trial">
      <div className="hero">
        <div className="wrap">
          <div className="nav">
            <div className="brand">
              <BrandLogo className="h-[1.9rem] w-auto max-w-[9.75rem] object-contain object-left" />
            </div>
            <div className="navlinks">
              <a href="#jobs">직무 둘러보기</a>
              <a href="#how">이용 방법</a>
              <a href="#refund">환불 정책</a>
              <a className="btn" href="#apply">
                체험 신청하기
              </a>
            </div>
            <div className="burger">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>

          <div className="heroin" id="apply">
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <span className="pill">신청 후 24시간 내 도착</span>
              <h1>
                궁금한 직무,
                <br />
                <span style={{ color: "#435BDA" }}>내일 직접 해보세요</span>
              </h1>
              <p className="lead">
                원하는 직무와 기업 유형을 고르면, 그 분야 현직자가 만든 체험 과제가 24시간 안에 도착해요. 늦으면
                전액 환불합니다.
              </p>
              <div className="guars">
                <span className="guar">✓ 24시간 내 미제공 시 전액 환불</span>
                <span className="guar">✓ 불만족 시 3일 내 환불</span>
              </div>
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
                  <span
                    style={{
                      background: "#435BDA",
                      color: "#fff",
                      fontSize: 12.5,
                      fontWeight: 700,
                      borderRadius: 8,
                      padding: "10px 0",
                      textAlign: "center",
                    }}
                  >
                    신청 완료하기
                  </span>
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
                  <span
                    style={{
                      border: "1px solid #D5DAE3",
                      color: "#4B5563",
                      fontSize: 12,
                      fontWeight: 700,
                      borderRadius: 8,
                      padding: "9px 0",
                      textAlign: "center",
                    }}
                  >
                    3일 내 환불 요청
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="sect-gray" id="refund">
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

      <section id="jobs">
        <div className="wrap">
          <h2>체험할 수 있는 직무</h2>
          <div className="grid4">
            <div className="job">
              <b>CRM 마케터</b>
              <span>리텐션 · 코호트 분석</span>
            </div>
            <div className="job">
              <b>브랜드 디자이너</b>
              <span>브랜드 진단 · 시안</span>
            </div>
            <div className="job">
              <b>서비스 기획자</b>
              <span>요구사항 · 우선순위</span>
            </div>
            <div className="job">
              <b>UI/UX 디자이너</b>
              <span>온보딩 개선안</span>
            </div>
            <div className="job">
              <b>데이터 분석가</b>
              <span>퍼널 · 가설 검증</span>
            </div>
            <div className="job">
              <b>콘텐츠 마케터</b>
              <span>채널 전략 · 기획</span>
            </div>
            <div className="job">
              <b>공정 엔지니어</b>
              <span>불량 원인 분석</span>
            </div>
            <div className="job" style={{ background: "#F7F8FA" }}>
              <b style={{ color: "#6B7280" }}>그 외 직무 요청</b>
              <span>신청 후 매칭</span>
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
            <a className="go" href="#apply">
              체험 신청하기 →
            </a>
          </div>
        </div>
      </section>

      <div className="wrap">
        <footer>
          <span>© 2026 Beginner</span>
          <div>
            <a href="#refund">환불 정책</a>
            <a href="/terms">이용약관</a>
            <a href="/privacy">개인정보처리방침</a>
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
