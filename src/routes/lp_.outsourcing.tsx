import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { BrandLogo } from "@/components/BrandLogo";
import { submitLandingLead } from "@/lib/landing.functions";

export const Route = createFileRoute("/lp_/outsourcing")({
  head: () => ({
    meta: [
      { title: "Beginner — 업무 의뢰 상담" },
      {
        name: "description",
        content: "필요한 업무와 일정, 예산을 남기면 의뢰 방향을 상담해드립니다.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LpOutsourcingPage,
});

function ConsultationForm() {
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [requestDetail, setRequestDetail] = useState("");
  const [website, setWebsite] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await submitLandingLead({
        data: {
          companyName: companyName.trim(),
          contactName: contactName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          requestDetail: requestDetail.trim(),
          website,
        },
      });
      setIsSubmitted(true);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "접수하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className="consult-success" role="status" aria-live="polite">
        <b>상담 신청이 접수됐어요</b>
        <p>
          입력해 주신 연락처로 안내드릴게요.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="consult-form" aria-busy={isSubmitting}>
      <div className="consult-grid">
        <label className="consult-field">
          <span>기업명</span>
          <input
            type="text"
            required
            maxLength={100}
            autoComplete="organization"
            placeholder="기업명을 입력해주세요"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
          />
        </label>
        <label className="consult-field">
          <span>담당자명</span>
          <input
            type="text"
            required
            maxLength={100}
            autoComplete="name"
            placeholder="담당자명을 입력해주세요"
            value={contactName}
            onChange={(event) => setContactName(event.target.value)}
          />
        </label>
        <label className="consult-field">
          <span>이메일</span>
          <input
            type="email"
            required
            maxLength={200}
            autoComplete="email"
            placeholder="name@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="consult-field">
          <span>연락처</span>
          <input
            type="tel"
            required
            maxLength={20}
            inputMode="tel"
            autoComplete="tel"
            placeholder="010-1234-5678"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </label>
        <label className="consult-field full">
          <span>의뢰 내용</span>
          <textarea
            required
            maxLength={2000}
            placeholder="필요한 업무, 일정, 예산 범위를 적어주세요"
            value={requestDetail}
            onChange={(event) => setRequestDetail(event.target.value)}
          />
        </label>
      </div>
      <div style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }} aria-hidden="true">
        <label htmlFor="lp-outsourcing-website">웹사이트</label>
        <input
          id="lp-outsourcing-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>
      <button type="submit" className="go" disabled={isSubmitting}>
        {isSubmitting ? "접수 중..." : "상담 신청하기"}
      </button>
      {error && (
        <p role="alert" className="consult-error">{error}</p>
      )}
    </form>
  );
}

function LpOutsourcingPage() {
  return (
    <div className="lp-outsourcing">
      <div className="hero">
        <div className="wrap">
          <div className="nav">
            <div className="brand">
              <BrandLogo className="h-[1.9rem] w-auto max-w-[9.75rem] object-contain object-left" />
            </div>
            <div className="navlinks">
              <a href="#how">이용 방법</a>
              <a href="#price">가격</a>
              <a href="#faq">자주 묻는 질문</a>
              <a className="btn" href="#reserve">상담 신청</a>
            </div>
            <div className="burger">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
          <div className="heroin">
            <span className="pill">업무 의뢰 상담</span>
            <h1>
              귀찮은 업무,
              <br />
              <span style={{ color: "#435BDA" }}>지금 맡겨보세요</span>
            </h1>
            <p className="lead">
              업무 내용과 일정, 예산 범위를 남겨주세요.
              <br />
              적합한 진행 방식과 다음 단계를 함께 정리해드립니다.
            </p>
            <div className="ctas">
              <a className="btn btn-lg" href="#reserve">
                상담 신청하기 →
              </a>
            </div>
          </div>
        </div>
      </div>

      <section className="sect-gray" id="how">
        <div className="wrap">
          <div className="center">
            <p className="eyebrow">이용 방법</p>
            <h2>올리고, 받고, 쓰면 끝</h2>
          </div>
          <div className="grid3">
            <div className="card">
              <span className="step">1</span>
              <h3>필요한 업무 올리기</h3>
              <p>직무와 요청 내용, 마감일만 적으면 돼요. 상세 기획서는 없어도 괜찮아요.</p>
              <div className="mock">
                <div className="mockbar">
                  <i></i>
                  <i></i>
                  <i></i>
                </div>
                <div className="mockbody">
                  <span className="lbl">직무</span>
                  <div className="field">
                    <span>브랜드 디자인</span>
                    <span style={{ color: "#B7BEC9" }}>▾</span>
                  </div>
                  <span className="lbl">요청 내용</span>
                  <div
                    style={{
                      border: "1px solid #D5DAE3",
                      borderRadius: 7,
                      padding: "9px 10px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 5,
                    }}
                  >
                    <span className="bar" style={{ width: "92%" }}></span>
                    <span className="bar" style={{ width: "74%" }}></span>
                    <span className="bar" style={{ width: "52%" }}></span>
                  </div>
                  <span className="minibtn">등록하기</span>
                </div>
              </div>
            </div>

            <div className="card">
              <span className="step">2</span>
              <h3>학생이 결과물 제작</h3>
              <p>해당 직무를 준비하는 학생들이 실제 과제로 작업해 결과물을 제출해요.</p>
              <div className="mock">
                <div className="mockbar">
                  <i></i>
                  <i></i>
                  <i></i>
                </div>
                <div className="mockbody">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700 }}>작업 중 3명</span>
                    <span
                      style={{
                        fontSize: 10.5,
                        color: "#435BDA",
                        background: "#E9EEFC",
                        borderRadius: 5,
                        padding: "3px 7px",
                        fontWeight: 700,
                      }}
                    >
                      D-1
                    </span>
                  </div>
                  <div className="row">
                    <span className="av" style={{ background: "#C0446C" }}>
                      길
                    </span>
                    <span className="prog">
                      <i style={{ width: "72%" }}></i>
                    </span>
                  </div>
                  <div className="row">
                    <span className="av" style={{ background: "#2563EB" }}>
                      데
                    </span>
                    <span className="prog">
                      <i style={{ width: "48%" }}></i>
                    </span>
                  </div>
                  <div className="row">
                    <span className="av" style={{ background: "#0F9D58" }}>
                      노
                    </span>
                    <span className="prog">
                      <i style={{ width: "90%" }}></i>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <span className="step">3</span>
              <h3>받아서 바로 활용</h3>
              <p>마음에 드는 결과물을 선택해 그대로 쓰거나, 채용 후보로 연결할 수 있어요.</p>
              <div className="mock">
                <div className="mockbar">
                  <i></i>
                  <i></i>
                  <i></i>
                </div>
                <div className="mockbody">
                  <span style={{ fontSize: 11.5, fontWeight: 700 }}>도착한 결과물 3건</span>
                  <div className="thumbs">
                    <div className="on"></div>
                    <div></div>
                    <div></div>
                  </div>
                  <div style={{ display: "flex", gap: 7 }}>
                    <span
                      style={{
                        flex: 1,
                        background: "#435BDA",
                        color: "#fff",
                        fontSize: 11.5,
                        fontWeight: 700,
                        borderRadius: 7,
                        padding: "8px 0",
                        textAlign: "center",
                      }}
                    >
                      이 결과물 채택
                    </span>
                    <span
                      style={{
                        flex: 1,
                        border: "1px solid #D5DAE3",
                        color: "#4B5563",
                        fontSize: 11.5,
                        fontWeight: 700,
                        borderRadius: 7,
                        padding: "8px 0",
                        textAlign: "center",
                      }}
                    >
                      채용 제안
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="price">
        <div className="wrap two">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p className="eyebrow">왜 저렴한가요</p>
            <h2>
              학생에게는 경험이,
              <br />
              기업에는 결과물이 남으니까
            </h2>
            <p style={{ margin: 0, fontSize: 16, color: "#4B5563", lineHeight: 1.7 }}>
              학생은 실무 과제를 포트폴리오로 쌓고, 기업은 그 결과물을 저렴하게 활용해요. 기존 외주 대비 비용
              부담이 크게 줄어듭니다.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="pricerow">
              <span style={{ fontSize: 15, color: "#6B7280" }}>일반 외주 · 디자인 시안</span>
              <b style={{ fontSize: 17, color: "#9CA3AF", textDecoration: "line-through" }}>50만원~</b>
            </div>
            <div className="pricerow on">
              <span style={{ fontSize: 15, color: "#435BDA", fontWeight: 700 }}>Beginner</span>
              <b style={{ fontSize: 20, color: "#435BDA" }}>5만원~</b>
            </div>
            <span style={{ fontSize: 13, color: "#9CA3AF", paddingLeft: 4 }}>
              * 업무 난이도·분량에 따라 달라질 수 있어요
            </span>
          </div>
        </div>
      </section>

      <section id="reserve" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="cta">
            <b style={{ fontSize: "clamp(22px,3.4vw,30px)", letterSpacing: "-.6px" }}>
              업무 의뢰 상담을 신청하세요
            </b>
            <span style={{ fontSize: 15, color: "#D9E0FA", lineHeight: 1.6 }}>
              의뢰 내용을 남기면 확인 후 안내드립니다.
            </span>
            <ConsultationForm />
          </div>
        </div>
      </section>

      <div className="wrap">
        <footer id="faq">
          <span>© 2026 Beginner</span>
          <div>
            <a href="#faq">자주 묻는 질문</a>
            <a href="/terms">이용약관</a>
            <a href="/privacy">개인정보처리방침</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
