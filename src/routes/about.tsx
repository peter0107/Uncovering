import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Beginner" },
      { name: "application-name", content: "Beginner" },
      { property: "og:title", content: "Beginner" },
      { name: "twitter:title", content: "Beginner" },
      {
        name: "description",
        content:
          "Beginner는 취업준비생이 실제 업무 과제를 경험하며 직무 적합성과 실무 역량을 확인하는 직무 시뮬레이션 서비스입니다.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <main className="min-h-screen bg-white px-6 py-16 text-zinc-950 sm:py-24">
      <article className="mx-auto max-w-3xl">
        <section className="border-b border-zinc-200 pb-12">
          <p className="text-sm font-semibold text-blue-600">
            현직자와의 소규모 커피챗 모임
          </p>
          <img
            src="/brand/브랜드로고.jpg"
            alt="Beginner"
            className="mt-4 w-full max-w-sm"
          />
          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-600">
            저희는 현직자와 취준생분들 간의 <strong>소규모 대화 자리</strong>를
            만들고 싶은 성균관대 소속 팀입니다.
            <br />
            <strong>현직자와 편하게 이야기 나누고 질문하며</strong>
            <br />
            취업에 도움을 많이 받을 수 있을 것 같아 이 모임을 열게 됐습니다.
          </p>
        </section>

        <header className="pt-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            &quot;직무가 궁금한데 사람 많은데는 질문하기 힘들어서 싫어&quot;
          </h1>
          <div className="mx-auto mt-10 max-w-2xl space-y-5 text-left text-lg leading-8 text-zinc-600">
            <p>취준과 관련된 정보는 이미 너무 많습니다.</p>
            <p>유튜브, 인스타그램, 대형 강연만 봐도 넘쳐나죠.</p>
            <p>
              하지만 막상 우리가 궁금한 건
              <br />
              <strong>“그래서 나는 지금 뭘 해야 하지?”</strong>
              <br />
              <strong>“나 지금 잘 준비하고 있는 거 맞나?”</strong>
              <br />
              같은, 나에게 맞는 구체적인 답입니다.
            </p>
            <p>
              이런 질문에 가장 직접적으로 답해줄 수 있는 사람은
              <br />
              내가 가고 싶은 분야에서 실제로 일하고 있는 <strong>현직자</strong>
              입니다.
            </p>
            <p>
              문제는 현직자를 만날 기회가 있어도
              <br />
              대형 강연에서는 사람이 많아 내가 궁금한 걸 충분히 질문하기
              어렵습니다.
            </p>
            <p>반대로 1:1 커피챗은 혼자라서 좀 부담되고요.</p>
            <p>그래서 저희는 그 사이를 만들고자 했습니다.</p>
            <p className="text-2xl font-bold leading-tight tracking-tight text-zinc-950 sm:text-3xl">
              현직자 1명과 참가자 4~6명이 함께하는 소규모 모임
            </p>
            <p>
              현직자의 실제 업무 이야기를 듣고,
              <br />
              각자가 궁금했던 질문을 편하게 물어볼 수 있는 자리입니다.
            </p>
          </div>
        </header>
      </article>
    </main>
  );
}
