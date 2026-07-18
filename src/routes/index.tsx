import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, Check, Clock3, Lightbulb, Menu, X } from "lucide-react";
import { useState } from "react";

import { AccountMenu } from "@/components/AccountMenu";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Beginner - 현직자가 제시한 업무를 직접 경험하는 직무 시뮬레이션" },
      {
        name: "description",
        content:
          "현직자가 제시한 실제 업무를 시뮬레이션으로 경험하고, 나에게 맞는 직무를 확인해보세요.",
      },
    ],
  }),
  component: Index,
});

function Brand() {
  return (
    <span className="home-brand" aria-label="Beginner 홈">
      <span className="home-brand-mark" aria-hidden="true">
        <span>B</span>
      </span>
      <span>Beginner</span>
    </span>
  );
}

function ExpertPreview() {
  return (
    <figure className="home-expert-preview" aria-label="현직자 제시 시뮬레이션 예시">
      <div className="home-expert-preview-head">
        <span className="home-expert-icon" aria-hidden="true">
          <Lightbulb />
        </span>
        <div>
          <p className="home-expert-name">소영</p>
          <p className="home-expert-meta">스타트업 · 6~10년차 · 브랜드 디자이너</p>
        </div>
      </div>
      <div className="home-expert-preview-body">
        <p className="home-preview-label">현직자 제시</p>
        <h2>브랜드 첫 화면의 방향을 제안해보세요.</h2>
        <p>업무의 맥락을 읽고, 실제로 어떤 판단을 할지 답안으로 정리합니다.</p>
        <div className="home-expert-preview-foot">
          <span>
            <Clock3 aria-hidden="true" /> 약 25분
          </span>
          <ArrowUpRight aria-hidden="true" />
        </div>
      </div>
    </figure>
  );
}

function InterestPreview() {
  return (
    <div className="home-process-visual" aria-label="관심 직무 선택 예시">
      <p className="home-visual-title">관심 직무</p>
      <div className="home-role-list">
        <span>기획·전략</span>
        <span className="is-selected">
          디자인 <Check aria-hidden="true" />
        </span>
        <span>AI·개발·데이터</span>
      </div>
      <p className="home-visual-note">현직자 제시 업무를 먼저 찾아볼 수 있어요.</p>
    </div>
  );
}

function TaskPreview() {
  return (
    <div className="home-process-visual" aria-label="시뮬레이션 답안 작성 예시">
      <div className="home-task-visual-head">
        <span>브랜드 디자이너</span>
        <span>
          <Clock3 aria-hidden="true" /> 25분
        </span>
      </div>
      <p className="home-task-question">첫 화면에서 가장 먼저 보여줄 메시지를 정리해 주세요.</p>
      <div className="home-answer-lines" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function ResultPreview() {
  return (
    <div className="home-process-visual" aria-label="답안 저장 예시">
      <p className="home-visual-title">내 이력</p>
      <div className="home-result-row">
        <span className="home-result-check" aria-hidden="true">
          <Check />
        </span>
        <div>
          <p>현직자 제시 시뮬레이션</p>
          <span>작성한 답안을 다시 확인할 수 있어요.</span>
        </div>
      </div>
      <div className="home-result-row is-muted">
        <span className="home-result-check" aria-hidden="true">
          <Check />
        </span>
        <div>
          <p>채용 제안 받아보기</p>
          <span>동의한 경우에만 기업에 공유돼요.</span>
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  {
    number: "01",
    title: "관심 있는 일을 고릅니다.",
    description:
      "직무군을 선택하면, 그 일을 실제로 하고 있는 현직자가 제시한 시뮬레이션을 찾아볼 수 있어요.",
    preview: <InterestPreview />,
  },
  {
    number: "02",
    title: "현직자가 제시한 업무를 해봅니다.",
    description:
      "문제를 푸는 순서와 판단의 기준이 담긴 과제를 따라가며, 내가 이 일을 어떻게 풀어가는지 확인합니다.",
    preview: <TaskPreview />,
  },
  {
    number: "03",
    title: "내가 만든 답안을 남깁니다.",
    description:
      "제출한 결과물은 이력과 함께 저장됩니다. 공유에 동의한 경우에는 채용 제안을 받는 데에도 활용할 수 있어요.",
    preview: <ResultPreview />,
  },
];

function Index() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="home-header-inner">
          <Link to="/" aria-label="Beginner 홈">
            <Brand />
          </Link>

          <nav className="home-desktop-nav" aria-label="주요 메뉴">
            <a href="#how-it-works">서비스 소개</a>
            <Link to="/simulations">기업 시뮬레이션</Link>
            <Link to="/expert-simulations">현직자 제시</Link>
            <Link to="/biz">기업용</Link>
          </nav>

          <div className="home-desktop-actions">
            {user ? (
              <AccountMenu />
            ) : (
              <>
                <Link to="/login" search={{ redirect: "/" }} className="home-login-link">
                  로그인
                </Link>
                <Link to="/start" className="home-header-action">
                  시작하기
                </Link>
              </>
            )}
          </div>

          <div className="home-mobile-actions">
            {user && <AccountMenu />}
            <button
              type="button"
              onClick={() => setIsMenuOpen((current) => !current)}
              aria-label={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
              aria-expanded={isMenuOpen}
              className="home-mobile-menu-button"
            >
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {isMenuOpen && (
          <nav className="home-mobile-nav" aria-label="모바일 주요 메뉴">
            <a href="#how-it-works" onClick={() => setIsMenuOpen(false)}>
              서비스 소개
            </a>
            <Link to="/simulations" onClick={() => setIsMenuOpen(false)}>
              기업 시뮬레이션
            </Link>
            <Link to="/expert-simulations" onClick={() => setIsMenuOpen(false)}>
              현직자 제시
            </Link>
            <Link to="/biz" onClick={() => setIsMenuOpen(false)}>
              기업용
            </Link>
            {!user && (
              <div className="home-mobile-auth">
                <Link to="/login" search={{ redirect: "/" }} onClick={() => setIsMenuOpen(false)}>
                  로그인
                </Link>
                <Link to="/start" onClick={() => setIsMenuOpen(false)}>
                  시작하기
                </Link>
              </div>
            )}
          </nav>
        )}
      </header>

      <main>
        <section className="home-hero">
          <div className="home-hero-copy">
            <p className="home-hero-label">현직자 제시 시뮬레이션</p>
            <h1>
              <span>현직자가 제시한</span>
              <span>
                업무를 <br className="home-mobile-break" />
                직접 해보세요.
              </span>
            </h1>
            <p className="home-hero-description">
              실제 현업의 문제와 판단 기준을 담은 시뮬레이션으로
              <br className="home-desktop-break" /> 내게 맞는 일을 경험해보세요.
            </p>
            <div className="home-hero-actions">
              <Link to="/expert-simulations" className="home-action home-action-primary">
                현직자 제시 보기 <ArrowRight aria-hidden="true" />
              </Link>
              <Link to="/simulations" className="home-action home-action-secondary">
                기업 시뮬레이션 보기
              </Link>
            </div>
          </div>
          <ExpertPreview />
        </section>

        <section id="how-it-works" className="home-workflow">
          <header className="home-section-heading">
            <p>이용 흐름</p>
            <h2>
              답을 보기 전에,
              <br />
              일하는 방식을 경험합니다.
            </h2>
          </header>

          <ol className="home-steps">
            {STEPS.map((step) => (
              <li key={step.number} className="home-step">
                <div className="home-step-copy">
                  <span className="home-step-number">{step.number}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </div>
                {step.preview}
              </li>
            ))}
          </ol>
        </section>

        <section className="home-closing">
          <p>처음부터 완벽하게 고를 필요는 없어요.</p>
          <h2>현직자가 제시한 업무부터, 직접 시작해보세요.</h2>
          <Link to="/expert-simulations" className="home-closing-link">
            현직자 제시 시뮬레이션 보기 <ArrowRight aria-hidden="true" />
          </Link>
        </section>
      </main>

      <footer className="home-footer">
        <div>
          <span>© 2026 Beginner. All rights reserved.</span>
          <nav aria-label="하단 메뉴">
            <a href="#faq">자주 묻는 질문</a>
            <a href="#terms">이용약관</a>
            <a href="#privacy">개인정보처리방침</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
