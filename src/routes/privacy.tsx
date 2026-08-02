import { createFileRoute } from "@tanstack/react-router";
import { FooterPageLayout, FooterPageSection } from "@/components/FooterPageLayout";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "개인정보처리방침 | Beginner" }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <FooterPageLayout title="개인정보처리방침" effectiveDate="2026년 7월 31일">
      <FooterPageSection title="1. 수집하는 개인정보">
        <p>Beginner는 회원 가입과 서비스 제공을 위해 다음 정보를 수집할 수 있습니다.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>계정 정보: 이메일, 인증 정보, 계정 식별자</li>
          <li>프로필 정보: 이름, 프로필 사진, 전화번호, 거주 지역, 한 줄 소개, 링크 정보</li>
          <li>
            이력서 정보: 학력, 경력, 희망 연봉, 지역, 근무 형태, 스킬과 툴, 활동, 이력서 파일 및
            사진
          </li>
          <li>시뮬레이션 정보: 선택한 직무, 답변, 제출 일시, 기업 공유 동의 여부</li>
          <li>AI 기능 이용 정보: AI 어시스트 대화 기록 및 AI 피드백 생성에 필요한 입력 정보</li>
          <li>
            서비스 이용 정보: 접속 기록, 쿠키, 기기와 브라우저 정보, 오류 기록, 부정 이용 방지 정보
          </li>
          <li>문의 정보: 기업 문의 또는 커피챗 신청 시 입력한 이름, 이메일, 소속, 신청 내용</li>
        </ul>
      </FooterPageSection>

      <FooterPageSection title="2. 개인정보의 이용 목적">
        <ul className="list-disc space-y-1 pl-5">
          <li>회원 식별과 계정 관리</li>
          <li>관심 직무 기반 시뮬레이션 추천</li>
          <li>이력서 작성, 보관과 시뮬레이션 수행 지원</li>
          <li>회원이 동의한 기업 지원과 채용 검토 자료 제공</li>
          <li>AI 어시스트 및 AI 피드백 제공</li>
          <li>서비스 개선, 오류 분석, 보안과 부정 이용 방지</li>
        </ul>
      </FooterPageSection>

      <FooterPageSection title="3. 기업에 대한 개인정보 제공">
        <p>
          회원이 특정 기업에 답변과 이력서 공유에 동의한 경우에만, 해당 기업에 채용 검토에 필요한
          정보를 제공합니다.
        </p>
        <p>
          제공 항목에는 프로필, 이력서의 기업 공유 대상 정보, 시뮬레이션 답변 및 제출 정보가 포함될
          수 있습니다. 이력서 제목과 개인 메모 등 공유 대상이 아닌 정보는 제공하지 않습니다.
        </p>
      </FooterPageSection>

      <FooterPageSection title="4. 개인정보 처리의 위탁 및 외부 서비스">
        <p>서비스 운영을 위해 다음 외부 서비스를 이용합니다.</p>
        <div className="overflow-x-auto border-y border-zinc-200">
          <table className="w-full min-w-[560px] text-left text-sm leading-6">
            <thead className="border-b border-zinc-200 text-zinc-900">
              <tr>
                <th className="px-3 py-3 font-medium">서비스</th>
                <th className="px-3 py-3 font-medium">이용 목적</th>
                <th className="px-3 py-3 font-medium">처리 정보</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-zinc-200">
                <td className="px-3 py-3">Supabase</td>
                <td className="px-3 py-3">계정 인증, 데이터베이스, 파일 저장</td>
                <td className="px-3 py-3">계정, 프로필, 이력서, 시뮬레이션 정보</td>
              </tr>
              <tr className="border-b border-zinc-200">
                <td className="px-3 py-3">Anthropic Claude</td>
                <td className="px-3 py-3">AI 어시스트, 결과물 평가, 피드백 생성</td>
                <td className="px-3 py-3">AI 기능에 입력한 시뮬레이션, 이력서 관련 정보</td>
              </tr>
              <tr className="border-b border-zinc-200">
                <td className="px-3 py-3">Resend</td>
                <td className="px-3 py-3">이메일 인증, 비밀번호 재설정 등 메일 발송</td>
                <td className="px-3 py-3">이메일 주소, 발송 내역</td>
              </tr>
              <tr className="border-b border-zinc-200">
                <td className="px-3 py-3">Google</td>
                <td className="px-3 py-3">소셜 로그인</td>
                <td className="px-3 py-3">계정 식별 정보, 이메일</td>
              </tr>
              <tr className="border-b border-zinc-200">
                <td className="px-3 py-3">Cloudflare Turnstile</td>
                <td className="px-3 py-3">자동화와 부정 이용 방지</td>
                <td className="px-3 py-3">접속 환경 및 보안 확인 정보</td>
              </tr>
              <tr className="border-b border-zinc-200">
                <td className="px-3 py-3">PostHog, Google Analytics, Microsoft Clarity</td>
                <td className="px-3 py-3">서비스 이용 분석과 오류 개선</td>
                <td className="px-3 py-3">접속·이용 이벤트 및 화면 기록 정보(비밀번호·인증번호 제외)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          서비스는 이용 분석과 로그인 유지를 위해 쿠키 및 유사 기술을 사용할 수 있으며, 이용자는
          브라우저 설정에서 쿠키 저장을 거부할 수 있습니다.
        </p>
      </FooterPageSection>

      <FooterPageSection title="5. 개인정보의 국외 이전">
        <p>서비스 운영을 위해 아래와 같이 개인정보를 국외로 이전합니다.</p>
        <div className="overflow-x-auto border-y border-zinc-200">
          <table className="w-full min-w-[720px] text-left text-sm leading-6">
            <thead className="border-b border-zinc-200 text-zinc-900">
              <tr>
                <th className="px-3 py-3 font-medium">이전받는 자</th>
                <th className="px-3 py-3 font-medium">이전 국가</th>
                <th className="px-3 py-3 font-medium">이전 항목</th>
                <th className="px-3 py-3 font-medium">이전 목적</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-zinc-200">
                <td className="px-3 py-3">Supabase, Inc.</td>
                <td className="px-3 py-3">미국</td>
                <td className="px-3 py-3">계정, 프로필, 이력서, 시뮬레이션 정보</td>
                <td className="px-3 py-3">계정 인증, 데이터베이스, 파일 저장</td>
              </tr>
              <tr className="border-b border-zinc-200">
                <td className="px-3 py-3">Anthropic PBC</td>
                <td className="px-3 py-3">미국</td>
                <td className="px-3 py-3">AI 기능에 입력한 시뮬레이션·이력서 관련 정보</td>
                <td className="px-3 py-3">AI 어시스트, 결과물 평가, 피드백 생성</td>
              </tr>
              <tr className="border-b border-zinc-200">
                <td className="px-3 py-3">Resend, Inc.</td>
                <td className="px-3 py-3">일본</td>
                <td className="px-3 py-3">이메일 주소, 발송 내역</td>
                <td className="px-3 py-3">인증·비밀번호 재설정 등 메일 발송</td>
              </tr>
              <tr className="border-b border-zinc-200">
                <td className="px-3 py-3">Google LLC</td>
                <td className="px-3 py-3">미국</td>
                <td className="px-3 py-3">계정 식별 정보, 이용 이벤트 정보</td>
                <td className="px-3 py-3">소셜 로그인, 서비스 이용 분석</td>
              </tr>
              <tr className="border-b border-zinc-200">
                <td className="px-3 py-3">PostHog, Inc.</td>
                <td className="px-3 py-3">미국</td>
                <td className="px-3 py-3">접속·이용 이벤트 및 화면 기록 정보(비밀번호·인증번호 제외)</td>
                <td className="px-3 py-3">서비스 이용 분석과 오류 개선</td>
              </tr>
              <tr className="border-b border-zinc-200">
                <td className="px-3 py-3">Microsoft Corporation</td>
                <td className="px-3 py-3">미국</td>
                <td className="px-3 py-3">접속 및 이용 이벤트 정보</td>
                <td className="px-3 py-3">서비스 이용 분석</td>
              </tr>
              <tr className="border-b border-zinc-200">
                <td className="px-3 py-3">Cloudflare, Inc.</td>
                <td className="px-3 py-3">미국</td>
                <td className="px-3 py-3">접속 환경 및 보안 확인 정보</td>
                <td className="px-3 py-3">서비스 제공, 자동화·부정 이용 방지</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>이전 일시 및 방법: 서비스 이용 시점에 정보통신망을 통해 수시로 전송합니다.</p>
        <p>보유 및 이용 기간: 회원 탈퇴 또는 위탁 계약 종료 시까지 보유합니다.</p>
        <p>
          이용자는 개인정보의 국외 이전을 거부할 수 있습니다. 다만 위 이전은 서비스 제공에
          필수적이므로, 거부하는 경우 회원 가입 및 서비스 이용이 제한될 수 있습니다. 거부 의사는
          아래 문의처로 알려주시기 바랍니다.
        </p>
      </FooterPageSection>

      <FooterPageSection title="6. 보유 및 이용 기간">
        <p>
          개인정보는 회원 탈퇴 또는 처리 목적 달성 시까지 보유합니다. 회원 탈퇴 시 서비스에 저장된
          계정, 프로필, 이력서와 제출 정보는 삭제됩니다.
        </p>
        <p>
          다만 관계 법령에 따라 보관이 필요한 정보, 법적 분쟁 대응 기록, 부정 이용 및 보안 기록은
          해당 법령과 내부 보안 기준에 따라 필요한 기간 동안 보관할 수 있습니다.
        </p>
      </FooterPageSection>

      <FooterPageSection title="7. 이용자의 권리">
        <p>
          회원은 자신의 개인정보를 열람, 수정, 삭제하거나 처리 정지를 요청할 수 있습니다. 프로필과
          이력서는 서비스 내에서 직접 수정하거나 삭제할 수 있으며, 회원 탈퇴는 마이페이지 맨 아래의
          회원 탈퇴 기능으로 직접 진행할 수 있습니다.
        </p>
        <p>
          서비스 내에서 처리하기 어려운 요청은 아래 문의처로 접수할 수 있습니다. Beginner는 만 14세
          미만 아동의 회원 가입을 받지 않습니다.
        </p>
      </FooterPageSection>

      <FooterPageSection title="8. 개인정보 보호책임자 및 문의처">
        <p>
          Beginner는 개인정보 처리에 관한 업무를 총괄해 책임지고, 개인정보 처리와 관련한 이용자의
          문의와 피해 구제를 처리하기 위해 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>개인정보 보호책임자: 박규현</li>
          <li>이메일: u.ncovering2026@gmail.com</li>
        </ul>
        <p>
          개인정보 침해에 대한 상담이 필요한 경우 개인정보침해신고센터(privacy.kisa.or.kr, 국번 없이
          118), 개인정보 분쟁조정위원회(kopico.go.kr, 1833-6972), 대검찰청 사이버수사과(spo.go.kr,
          1301), 경찰청 사이버수사국(ecrm.police.go.kr, 182)에 문의하실 수 있습니다.
        </p>
      </FooterPageSection>

      <FooterPageSection title="9. 방침 변경">
        <p>
          이 방침은 법령, 서비스 운영 또는 보안 정책 변경에 따라 수정될 수 있습니다. 중요한 변경이
          있는 경우 서비스 내 공지 또는 이메일을 통해 안내합니다.
        </p>
      </FooterPageSection>
    </FooterPageLayout>
  );
}
