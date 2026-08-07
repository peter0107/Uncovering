import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { BrandLogo } from "@/components/BrandLogo";
import { createTrialOrder, TRIAL_PLAN_LABELS, TRIAL_PLAN_PRICES } from "@/lib/landing.functions";

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

const JOB_ROLES = [
  "CRM 마케터",
  "브랜드 디자이너",
  "서비스 기획자",
  "UI/UX 디자이너",
  "데이터 분석가",
  "콘텐츠 마케터",
  "공정 엔지니어",
  "그 외 직무",
];

const COMPANY_TYPES = ["IT 스타트업", "대기업", "중견기업", "공공기관", "기타"];

const OTHER_JOB_ROLE = "그 외 직무";
const OTHER_COMPANY_TYPE = "기타";

type Plan = keyof typeof TRIAL_PLAN_PRICES;
const PLAN_ORDER: Plan[] = ["single", "pack3", "monthly"];

function formatPrice(amount: number): string {
  return `${amount.toLocaleString()}원`;
}

function ApplyForm() {
  const [step, setStep] = useState<1 | 2>(1);
  const [jobRole, setJobRole] = useState(JOB_ROLES[0]);
  const [customJobRole, setCustomJobRole] = useState("");
  const [companyType, setCompanyType] = useState(COMPANY_TYPES[0]);
  const [customCompanyType, setCustomCompanyType] = useState("");
  const [plan, setPlan] = useState<Plan>("single");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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
    if (step === 1) {
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
          plan,
          email: email.trim(),
          phone: phone.trim(),
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
        <span className="apply-step">Step {step} / 2</span>
        <h3>{step === 1 ? "직무와 기업을 선택해주세요" : "이메일 주소를 입력해주세요"}</h3>
      </div>

      {step === 1 ? (
        <>
          <div className="fgroup">
            <span className="flabel">체험할 직무</span>
            <div className="select">
              <select value={jobRole} onChange={(event) => setJobRole(event.target.value)}>
                {JOB_ROLES.map((role) => (
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
            <span className="flabel">결제 옵션</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {PLAN_ORDER.map((key) => {
                const label = TRIAL_PLAN_LABELS[key];
                const isOn = plan === key;
                return (
                  <div
                    key={key}
                    className={isOn ? "opt on" : "opt"}
                    onClick={() => setPlan(key)}
                    role="radio"
                    aria-checked={isOn}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setPlan(key);
                      }
                    }}
                  >
                    <div>
                      <b>{label.name}</b>
                      <span className="sub">{label.sub}</span>
                    </div>
                    <span className="price">{formatPrice(TRIAL_PLAN_PRICES[key])}</span>
                  </div>
                );
              })}
            </div>
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
            <span className="flabel">휴대폰번호</span>
            <input
              type="tel"
              required
              maxLength={20}
              className="textinput"
              placeholder="010-1234-5678"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
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
        {step === 2 && (
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
          {step === 1 ? "다음" : isSubmitting ? "결제창으로 이동 중..." : "결제창으로 이동하기"}
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
                    <b>IT 스타트업</b>
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
                    <b style={{ fontSize: 18, color: "#435BDA" }}>9,900원</b>
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
                <b style={{ fontSize: 16, letterSpacing: "-.3px" }}>현직자 매칭 · 과제 준비</b>
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
                    <span>현직자 매칭 완료</span>
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
