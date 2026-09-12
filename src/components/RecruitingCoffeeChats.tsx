import { ArrowRight, CalendarDays, MapPin, Users } from "lucide-react";

// Tally 폼 URL은 여기서만 교체하면 됩니다.
const TALLY_APPLICATION_URLS = {
  kakaoPay: "https://tally.so/r/5BAN5Q?utm_source=website",
  toss: "https://tally.so/r/jaRR4Q?utm_source=website",
} as const;

const RECRUITING_COFFEE_CHATS = [
  {
    id: "kakao-pay-growth-marketer",
    date: "9/13(일) 19:00~21:00",
    deadlineDate: "2026-09-12",
    title: "카카오페이 그로스 마케터와 커피챗",
    location: "강남역 인근",
    capacity: "4~6명",
    imageSrc: "/coffee-chats/카카오페이마케터.jpg",
    applicationUrl: TALLY_APPLICATION_URLS.kakaoPay,
  },
  {
    id: "toss-frontend-developer",
    date: "9/18(금) 19:00~21:00",
    deadlineDate: "2026-09-17",
    title: "토스 프론트엔드 개발자와 커피챗",
    location: "강남역 인근",
    capacity: "4~6명",
    imageSrc: "/coffee-chats/토스개발자분.jpg",
    applicationUrl: TALLY_APPLICATION_URLS.toss,
  },
] as const;

function getDeadlineLabel(deadlineDate: string) {
  const deadline = new Date(`${deadlineDate}T23:59:59+09:00`);
  const remainingDays = Math.ceil(
    (deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  if (remainingDays < 0) return "마감";
  if (remainingDays === 0) return "오늘 마감";
  return `${remainingDays}일 후 마감`;
}

type RecruitingCoffeeChatsProps = {
  headingClassName?: string;
};

export function RecruitingCoffeeChats({
  headingClassName = "text-xl font-semibold tracking-tight",
}: RecruitingCoffeeChatsProps) {
  return (
    <section
      className="border-t border-neutral-200 bg-white"
      aria-labelledby="recruiting-coffee-chats-title"
    >
      <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
        <h2 id="recruiting-coffee-chats-title" className={headingClassName}>
          모집 중인 커피챗
        </h2>
        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          {RECRUITING_COFFEE_CHATS.map((chat) => (
            <article
              key={chat.id}
              className="overflow-hidden rounded-md border border-neutral-200 bg-white"
            >
              <div className="relative">
                <img
                  src={chat.imageSrc}
                  alt=""
                  className="h-52 w-full bg-neutral-100 object-cover"
                />
                <span className="absolute left-3 top-3 rounded-full bg-[#e7f7e9] px-2.5 py-1 text-xs font-semibold text-[#277a3d] shadow-sm">
                  모집중
                </span>
              </div>
              <div className="p-5">
                <p className="flex items-center gap-2 text-sm text-neutral-500">
                  <CalendarDays className="h-4 w-4 shrink-0" />
                  {chat.date}
                </p>
                <h3 className="mt-3 text-lg font-semibold tracking-tight">
                  {chat.title}
                </h3>
                <p className="mt-2 text-sm font-medium text-rose-600">
                  {getDeadlineLabel(chat.deadlineDate)}
                </p>
                <div className="mt-5 flex items-center justify-between gap-4 text-sm text-neutral-500">
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      {chat.location}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      {chat.capacity}
                    </span>
                  </div>
                  <a
                    href={chat.applicationUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${chat.title} 신청하기`}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-neutral-300 text-neutral-700 transition-colors hover:border-neutral-900 hover:bg-neutral-900 hover:text-white"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
