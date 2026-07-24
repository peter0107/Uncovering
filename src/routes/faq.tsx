import { createFileRoute } from "@tanstack/react-router";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FooterPageLayout } from "@/components/FooterPageLayout";

const FAQS = [
  {
    question: "Beginner는 어떤 서비스인가요?",
    answer:
      "Beginner는 관심 직무와 관련된 업무 상황을 시뮬레이션으로 경험하고, 이력서와 결과물을 관리할 수 있는 서비스입니다. 기업이 제공하는 시뮬레이션과 현직자가 제시한 시뮬레이션을 각각 둘러볼 수 있습니다.",
  },
  {
    question: "기업 시뮬레이션과 현직자 제시 시뮬레이션은 무엇이 다른가요?",
    answer:
      "기업 시뮬레이션은 특정 기업이 등록한 직무 과제입니다. 답변과 이력서 공유에 동의하면 해당 기업 담당자가 지원 정보를 검토할 수 있습니다. 현직자 제시 시뮬레이션은 현직자가 자신의 업무 경험을 바탕으로 만든 과제입니다.",
  },
  {
    question: "관심 직무는 어떻게 바꾸나요?",
    answer:
      "추천 시뮬레이션 화면의 관심 직무 영역에서 수정할 수 있습니다. 변경한 관심 직무는 기업 시뮬레이션과 현직자 제시 시뮬레이션 추천에 함께 반영됩니다.",
  },
  {
    question: "시뮬레이션 답변은 어디에 저장되나요?",
    answer:
      "제출한 답변은 마이페이지의 완료한 시뮬레이션에서 다시 확인할 수 있습니다. 답변은 제출 시점의 시뮬레이션 정보와 함께 저장됩니다.",
  },
  {
    question: "기업에 답변과 이력서가 자동으로 전달되나요?",
    answer:
      "아닙니다. 기업에 공유하기로 동의한 경우에만 해당 기업의 지원자 검토 화면에 프로필, 이력서, 시뮬레이션 답변이 제공됩니다. 동의하지 않은 답변은 기업에 전달되지 않습니다.",
  },
  {
    question: "기업에는 어떤 정보가 보이나요?",
    answer:
      "기업 공유에 동의한 지원 건에서는 기본 정보, 구직 조건, 학력, 경력, 스킬과 툴, 활동, 선택한 이력서 내용 및 시뮬레이션 답변이 제공될 수 있습니다. 이력서 제목과 개인 메모처럼 공유 대상이 아닌 정보는 제공하지 않습니다.",
  },
  {
    question: "이력서는 여러 개 만들 수 있나요?",
    answer:
      "네. 직무와 지원 목적에 맞게 여러 개의 이력서를 만들고 관리할 수 있습니다. 기존 이력서는 복사해 새 이력서로 사용할 수도 있습니다.",
  },
  {
    question: "AI 활용 피드백은 무엇을 기준으로 하나요?",
    answer:
      "AI 활용 피드백은 시뮬레이션 수행 중 기록된 AI 어시스트 대화와 제출 결과를 바탕으로 생성됩니다. 피드백은 참고용이며, 채용 결과나 역량을 확정적으로 판단하지 않습니다.",
  },
  {
    question: "기업 코드는 어디서 받나요?",
    answer:
      "기업 코드는 Beginner 운영팀 또는 해당 기업 담당자가 제공합니다. 기업용 화면에서 코드를 입력하면 해당 기업이 등록한 직무와 지원자 정보를 확인할 수 있습니다.",
  },
  {
    question: "회원 탈퇴는 어떻게 하나요?",
    answer:
      "프로필 메뉴의 회원 탈퇴에서 직접 진행할 수 있습니다. 탈퇴하면 계정, 프로필, 이력서와 서비스에 저장된 제출 정보가 삭제됩니다. 이미 기업에 공유된 자료는 해당 기업의 채용 검토 기록에 따라 별도로 관리될 수 있습니다.",
  },
];

export const Route = createFileRoute("/faq")({
  head: () => ({ meta: [{ title: "자주 묻는 질문 | Beginner" }] }),
  component: FaqPage,
});

function FaqPage() {
  return (
    <FooterPageLayout title="자주 묻는 질문">
      <Accordion type="single" collapsible className="w-full">
        {FAQS.map((faq, index) => (
          <AccordionItem key={faq.question} value={`faq-${index}`}>
            <AccordionTrigger className="py-5 text-left text-[15px] font-medium text-zinc-900 hover:no-underline">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="pb-5 text-[15px] leading-7 text-zinc-600">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </FooterPageLayout>
  );
}
