import { createFileRoute } from "@tanstack/react-router";
import { FooterPageLayout, FooterPageSection } from "@/components/FooterPageLayout";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "이용약관 | Beginner" }] }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <FooterPageLayout title="이용약관" effectiveDate="2026년 7월 31일">
      <FooterPageSection title="제1조 목적">
        <p>
          이 약관은 Beginner 운영팀(이하 “운영팀”)이 제공하는 Beginner 서비스의 이용 조건, 회원과
          운영팀의 권리와 의무, 책임 사항을 정하는 것을 목적으로 합니다.
        </p>
      </FooterPageSection>

      <FooterPageSection title="제2조 서비스 내용">
        <p>Beginner는 다음 기능을 제공합니다.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>직무 시뮬레이션의 탐색과 수행</li>
          <li>프로필 및 이력서 작성, 보관, 관리</li>
          <li>회원이 동의한 경우 시뮬레이션 결과물의 기업 공유</li>
          <li>현직자 제시 시뮬레이션의 탐색과 수행</li>
          <li>시뮬레이션 결과와 AI 활용 피드백의 확인</li>
        </ul>
        <p>서비스의 구성과 제공 방식은 운영상 필요에 따라 변경될 수 있습니다.</p>
      </FooterPageSection>

      <FooterPageSection title="제3조 시뮬레이션 콘텐츠의 성격">
        <p>
          서비스에서 제공하는 직무 시뮬레이션은 공개된 채용공고 등 공개 정보를 참고해 운영팀이
          제작한 <strong>지원 준비용 학습 콘텐츠</strong>입니다. 별도로 표시된 경우를 제외하고, 해당
          기업이 직접 제작하거나 검수 또는 승인한 콘텐츠가 아닙니다.
        </p>
        <p>
          콘텐츠에 사용된 기업명, 직무명, 브랜드 명칭은 지원자가 직무 맥락을 이해하도록 돕기 위한
          것이며, 해당 기업과의 제휴, 후원 또는 채용 대행 관계를 의미하지 않습니다. 시뮬레이션에
          포함된 상황, 자료, 수치는 학습을 위해 구성한 가상의 내용으로 해당 기업의 실제 업무, 내부
          자료 또는 채용 기준과 다를 수 있습니다.
        </p>
        <p>
          기업이 직접 제작하거나 승인한 콘텐츠는 서비스 화면에 그 사실을 별도로 표시합니다. 기업은
          자사와 관련된 콘텐츠에 대해 아래 문의처를 통해 수정 또는 게시 중단을 요청할 수 있으며,
          운영팀은 요청을 확인한 후 지체 없이 조치합니다.
        </p>
      </FooterPageSection>

      <FooterPageSection title="제4조 회원의 의무">
        <p>
          회원은 자신의 정보를 정확하게 입력해야 하며, 타인의 개인정보 또는 계정을 사용해서는 안
          됩니다.
        </p>
        <p>회원은 다음 행위를 해서는 안 됩니다.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>타인의 계정, 개인정보 또는 결과물을 무단으로 사용하거나 공유하는 행위</li>
          <li>시뮬레이션 콘텐츠를 무단 복제, 배포 또는 판매하는 행위</li>
          <li>서비스의 정상적인 운영을 방해하거나 보안을 침해하는 행위</li>
          <li>허위 이력서 또는 채용 판단을 오도할 수 있는 정보를 제출하는 행위</li>
        </ul>
      </FooterPageSection>

      <FooterPageSection title="제5조 콘텐츠와 결과물">
        <p>
          회원이 작성한 이력서와 시뮬레이션 답변의 권리는 회원에게 있습니다. 다만 회원이 특정 기업에
          결과물 공유를 동의한 경우, 해당 기업은 채용 검토에 필요한 범위에서 이를 열람할 수
          있습니다.
        </p>
        <p>
          운영팀, 기업 또는 현직자가 제공한 시뮬레이션 콘텐츠의 저작권과 관련 권리는 각 제공자 또는
          운영팀에게 있습니다. 회원은 개인적인 학습과 서비스 이용 목적 외로 해당 콘텐츠를 이용해서는
          안 됩니다.
        </p>
      </FooterPageSection>

      <FooterPageSection title="제6조 AI 기능">
        <p>
          서비스는 시뮬레이션 수행을 돕거나 결과에 대한 피드백을 제공하기 위해 AI 기능을 사용할 수
          있습니다. AI가 생성한 내용과 평가는 참고 정보이며, 사실성, 완전성 또는 채용 결과를
          보장하지 않습니다.
        </p>
      </FooterPageSection>

      <FooterPageSection title="제7조 채용 결과에 대한 비보장">
        <p>
          서비스 이용, 시뮬레이션 수행, 기업에 대한 결과물 공유는 채용, 면접 제안 또는 합격을
          보장하지 않습니다. 채용 과정과 판단은 각 기업의 책임과 기준에 따라 이루어집니다.
        </p>
      </FooterPageSection>

      <FooterPageSection title="제8조 회원 탈퇴">
        <p>
          회원은 언제든지 마이페이지 하단의 회원 탈퇴 기능을 통해 직접 탈퇴할 수 있으며, 별도의 승인
          절차는 필요하지 않습니다.
        </p>
        <p>
          탈퇴 시 계정 정보, 프로필, 이력서, 시뮬레이션 답변과 제출 기록, 업로드한 파일이
          삭제됩니다. 기업에 공유된 결과물도 함께 삭제되어 기업 화면에서 더 이상 열람할 수 없습니다.
          다만 탈퇴 이전에 기업이 이미 열람하거나 내려받은 내용에 대해서는 운영팀이 삭제를 보장할 수
          없습니다.
        </p>
        <p>
          삭제된 정보는 복구할 수 없으므로 탈퇴 전에 필요한 자료를 미리 보관하시기 바랍니다. 관계
          법령에 따라 보관이 필요한 정보는 해당 법령에서 정한 기간 동안 보관하며, 자세한 내용은
          개인정보처리방침을 따릅니다.
        </p>
        <p>탈퇴 후 동일한 이메일로 다시 가입할 수 있으나, 이전 이용 기록은 복원되지 않습니다.</p>
      </FooterPageSection>

      <FooterPageSection title="제9조 이용 제한 및 서비스 변경">
        <p>
          운영팀은 법령 또는 이 약관을 위반한 경우 회원의 이용을 제한하거나 계정을 삭제할 수
          있습니다. 안정적인 운영, 기능 개선 또는 법령 변경을 위해 서비스의 일부 또는 전부를
          변경하거나 중단할 수 있습니다.
        </p>
      </FooterPageSection>

      <FooterPageSection title="제10조 약관의 변경">
        <p>
          운영팀은 관련 법령을 위반하지 않는 범위에서 이 약관을 변경할 수 있습니다. 변경 사항은
          적용일과 변경 사유를 명시해 서비스 내 공지 또는 이메일로 안내하며, 회원에게 불리한 변경은
          적용일 7일 전부터 안내합니다.
        </p>
      </FooterPageSection>

      <FooterPageSection title="제11조 준거법 및 분쟁 해결">
        <p>
          이 약관은 대한민국 법령에 따라 해석되며, 서비스 이용과 관련해 발생한 분쟁은 민사소송법에
          따른 관할 법원에서 다룹니다.
        </p>
      </FooterPageSection>

      <FooterPageSection title="제12조 문의처">
        <p>서비스 이용 문의: u.ncovering2026@gmail.com</p>
      </FooterPageSection>
    </FooterPageLayout>
  );
}
