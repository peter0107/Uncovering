import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ChangeEvent, type ReactElement, type ReactNode } from "react";
import {
  Camera,
  FileText,
  CheckCircle2,
  GraduationCap,
  Briefcase,
  Building2,
  MapPin,
  Sparkles,
  Github,
  Globe,
  Linkedin,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import {
  type ProfileFormData,
  INITIAL_PROFILE_FORM,
  EducationFields,
  JobInterestFields,
  CompanyInterestFields,
  WorkPreferenceFields,
} from "@/lib/profile-fields";

export const Route = createFileRoute("/my")({
  head: () => ({ meta: [{ title: "프로필 — 언커버링" }] }),
  component: MyPage,
});

type ExternalLinks = { github?: string; portfolio?: string; linkedin?: string };

type CompletedSimulation = {
  submissionId: string;
  title: string;
  companyName: string;
  submittedAt: string | null;
};

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

type SectionKey = "education" | "jobInterests" | "companyInterests" | "workPreference";

type ProfileFieldsProps = {
  data: ProfileFormData;
  setData: (d: Partial<ProfileFormData>) => void;
};

const PROFILE_SECTIONS: {
  key: SectionKey;
  fields: (keyof ProfileFormData)[];
  Component: (props: ProfileFieldsProps) => ReactElement;
}[] = [
  {
    key: "education",
    fields: ["education_level", "majors", "academic_mark"],
    Component: EducationFields,
  },
  { key: "jobInterests", fields: ["job_interests"], Component: JobInterestFields },
  { key: "companyInterests", fields: ["company_interests"], Component: CompanyInterestFields },
  {
    key: "workPreference",
    fields: ["work_regions", "employment_types", "willing_to_relocate"],
    Component: WorkPreferenceFields,
  },
];

function serializeProfileField(key: keyof ProfileFormData, value: unknown) {
  if (key === "academic_mark") {
    return value ? parseFloat(value as string) : null;
  }
  if (Array.isArray(value)) {
    return value.length ? value : null;
  }
  if (typeof value === "string") {
    return value || null;
  }
  return value;
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
      {children}
    </span>
  );
}

function SectionRow({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="py-5 first:pt-0 last:pb-0">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-700">
        <Icon className="h-4 w-4 text-zinc-400" />
        {label}
      </div>
      {children}
    </div>
  );
}

const LINK_PILL_CLASS =
  "inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 hover:border-zinc-400 hover:text-zinc-900";

function MyPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [oneLineIntro, setOneLineIntro] = useState("");
  const [links, setLinks] = useState<ExternalLinks>({});
  const [profileForm, setProfileFormRaw] = useState<ProfileFormData>(INITIAL_PROFILE_FORM);

  const [editingAll, setEditingAll] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [draftIntro, setDraftIntro] = useState("");
  const [draftLinks, setDraftLinks] = useState<ExternalLinks>({});
  const [draftForm, setDraftFormRaw] = useState<ProfileFormData>(INITIAL_PROFILE_FORM);

  const [discoverySaving, setDiscoverySaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [history, setHistory] = useState<CompletedSimulation[] | null>(null);

  const setDraftForm = (partial: Partial<ProfileFormData>) =>
    setDraftFormRaw((prev) => ({ ...prev, ...partial }));

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login", search: { redirect: "/my" } });
      return;
    }

    (async () => {
      const { data: seeker } = await supabase
        .from("job_seekers")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      setHasProfile(!!seeker);
      setOneLineIntro(seeker?.one_line_intro ?? "");
      setLinks((seeker?.external_links as ExternalLinks) ?? {});
      setAvatarUrl(seeker?.avatar_url ?? null);
      setProfileFormRaw({
        education_level: seeker?.education_level ?? "",
        majors: seeker?.majors ?? [],
        academic_mark: seeker?.academic_mark != null ? String(seeker.academic_mark) : "",
        job_interests: seeker?.job_interests ?? [],
        company_interests: seeker?.company_interests ?? [],
        work_regions: seeker?.work_regions ?? [],
        employment_types: seeker?.employment_types ?? [],
        willing_to_relocate: seeker?.willing_to_relocate ?? false,
        discovery_consent: seeker?.discovery_consent ?? false,
      });

      const { data: submissions } = await supabase
        .from("submissions")
        .select(
          "id, submitted_at, job_simulations(title, companies(name))",
        )
        .eq("job_seeker_id", user.id)
        .not("submitted_at", "is", null)
        .order("submitted_at", { ascending: false });

      type Row = {
        id: string;
        submitted_at: string | null;
        job_simulations: { title: string; companies: { name: string } | null } | null;
      };
      const rows = (submissions ?? []) as unknown as Row[];
      setHistory(
        rows.map((r) => ({
          submissionId: r.id,
          title: r.job_simulations?.title ?? "",
          companyName: r.job_simulations?.companies?.name ?? "",
          submittedAt: r.submitted_at,
        })),
      );
    })();
  }, [user, authLoading, navigate]);

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드할 수 있어요.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("5MB 이하의 이미지만 업로드할 수 있어요.");
      return;
    }

    setUploadingAvatar(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setUploadingAvatar(false);
      toast.error("사진 업로드 중 오류가 발생했어요.");
      return;
    }

    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${pub.publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("job_seekers")
      .update({ avatar_url: url })
      .eq("id", user.id);

    setUploadingAvatar(false);

    if (updateError) {
      toast.error("사진 저장 중 오류가 발생했어요.");
      return;
    }

    setAvatarUrl(url);
    toast.success("프로필 사진이 업데이트됐어요.");
  };

  const toggleDiscovery = async (next: boolean) => {
    if (!user) return;
    setDiscoverySaving(true);
    const { error } = await supabase
      .from("job_seekers")
      .update({ discovery_consent: next })
      .eq("id", user.id);
    setDiscoverySaving(false);

    if (error) {
      toast.error("저장 중 오류가 발생했어요.");
      return;
    }

    setProfileFormRaw((prev) => ({ ...prev, discovery_consent: next }));
    toast.success(next ? "발견 동의로 변경됐어요." : "발견 동의를 해제했어요.");
  };

  const startEditAll = () => {
    setDraftIntro(oneLineIntro);
    setDraftLinks(links);
    setDraftFormRaw(profileForm);
    setEditingAll(true);
  };

  const cancelEditAll = () => {
    setEditingAll(false);
  };

  const saveAll = async () => {
    if (!user) return;

    setSavingAll(true);
    const patch: TablesUpdate<"job_seekers"> = {
      one_line_intro: draftIntro || null,
      external_links: draftLinks,
    };
    for (const section of PROFILE_SECTIONS) {
      for (const field of section.fields) {
        (patch as Record<string, unknown>)[field] = serializeProfileField(field, draftForm[field]);
      }
    }
    const { error } = await supabase.from("job_seekers").update(patch).eq("id", user.id);
    setSavingAll(false);

    if (error) {
      toast.error("저장 중 오류가 발생했어요.");
      return;
    }

    setOneLineIntro(draftIntro);
    setLinks(draftLinks);
    setProfileFormRaw(draftForm);
    setEditingAll(false);
    toast.success("저장됐어요.");
  };

  if (authLoading || hasProfile === null) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-6 h-40 w-full" />
      </div>
    );
  }

  if (!hasProfile) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Card className="p-8 text-center">
          <h1 className="text-xl font-bold text-zinc-900">아직 프로필이 없어요</h1>
          <p className="mt-2 text-sm text-zinc-500">
            온보딩을 완료하면 프로필과 추천 시뮬레이션을 볼 수 있어요.
          </p>
          <Link to="/onboarding">
            <Button className="mt-6 rounded-xl bg-zinc-900 text-white hover:bg-zinc-700">
              온보딩 시작하기
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const hasAnyLink = Boolean(links.github || links.portfolio || links.linkedin);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold text-zinc-900">프로필</h1>

      <Card className="mt-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatarUrl ?? undefined} alt="프로필 사진" />
                <AvatarFallback className="text-lg">
                  {(user?.email ?? "?").slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                aria-label="프로필 사진 변경"
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-white shadow hover:bg-zinc-700 disabled:opacity-50"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <div className="min-w-0">
              {editingAll ? (
                <Input
                  value={draftIntro}
                  onChange={(e) => setDraftIntro(e.target.value)}
                  placeholder="나를 한 줄로 소개해보세요"
                  maxLength={100}
                  className="text-base font-semibold"
                />
              ) : (
                <p className="text-lg font-bold text-zinc-900">
                  {oneLineIntro || (
                    <span className="font-normal text-zinc-400">한줄소개를 작성해보세요</span>
                  )}
                </p>
              )}
              <p className="mt-1 text-sm text-zinc-400">{user?.email}</p>

              {editingAll ? (
                <div className="mt-4 grid gap-3">
                  <div>
                    <Label htmlFor="github">GitHub</Label>
                    <Input
                      id="github"
                      value={draftLinks.github ?? ""}
                      onChange={(e) => setDraftLinks((prev) => ({ ...prev, github: e.target.value }))}
                      placeholder="https://github.com/..."
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="portfolio">포트폴리오</Label>
                    <Input
                      id="portfolio"
                      value={draftLinks.portfolio ?? ""}
                      onChange={(e) =>
                        setDraftLinks((prev) => ({ ...prev, portfolio: e.target.value }))
                      }
                      placeholder="https://..."
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="linkedin">LinkedIn</Label>
                    <Input
                      id="linkedin"
                      value={draftLinks.linkedin ?? ""}
                      onChange={(e) =>
                        setDraftLinks((prev) => ({ ...prev, linkedin: e.target.value }))
                      }
                      placeholder="https://linkedin.com/in/..."
                      className="mt-2"
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {links.github && (
                    <a href={links.github} target="_blank" rel="noreferrer" className={LINK_PILL_CLASS}>
                      <Github className="h-3.5 w-3.5" /> GitHub
                    </a>
                  )}
                  {links.portfolio && (
                    <a href={links.portfolio} target="_blank" rel="noreferrer" className={LINK_PILL_CLASS}>
                      <Globe className="h-3.5 w-3.5" /> 포트폴리오
                    </a>
                  )}
                  {links.linkedin && (
                    <a href={links.linkedin} target="_blank" rel="noreferrer" className={LINK_PILL_CLASS}>
                      <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                    </a>
                  )}
                  {!hasAnyLink && (
                    <p className="text-sm text-zinc-400">수정하기를 눌러 링크를 등록해보세요</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {!editingAll && (
            <Button variant="outline" onClick={startEditAll} className="shrink-0 rounded-xl">
              프로필 수정
            </Button>
          )}
        </div>
      </Card>

      <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-5 py-4">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
          <div>
            <p className="text-sm font-semibold text-zinc-700">기업에게 발견되기</p>
            <p className="mt-0.5 text-xs text-zinc-400">
              동의하면 관심 기업 담당자가 내 프로필을 보고 제안을 보낼 수 있어요
            </p>
          </div>
        </div>
        <Switch
          checked={profileForm.discovery_consent}
          onCheckedChange={toggleDiscovery}
          disabled={discoverySaving}
        />
      </div>

      <Card className="mt-4 p-6">
        {editingAll ? (
          <>
            {PROFILE_SECTIONS.map((section, i) => (
              <div key={section.key}>
                {i > 0 && <Separator className="my-6" />}
                <section.Component data={draftForm} setData={setDraftForm} />
              </div>
            ))}
            <div className="mt-6 flex gap-2">
              <Button
                onClick={saveAll}
                disabled={savingAll}
                className="rounded-xl bg-zinc-900 text-white hover:bg-zinc-700"
              >
                {savingAll ? "저장 중..." : "저장"}
              </Button>
              <Button
                variant="outline"
                onClick={cancelEditAll}
                disabled={savingAll}
                className="rounded-xl"
              >
                취소
              </Button>
            </div>
          </>
        ) : (
          <>
            <SectionRow icon={GraduationCap} label="학력">
              {profileForm.education_level || profileForm.majors.length || profileForm.academic_mark ? (
                <div className="flex flex-wrap items-center gap-2">
                  {profileForm.education_level && (
                    <span className="text-sm text-zinc-800">{profileForm.education_level}</span>
                  )}
                  {profileForm.majors.map((m) => (
                    <Tag key={m}>{m}</Tag>
                  ))}
                  {profileForm.academic_mark && (
                    <span className="text-sm text-zinc-500">학점 {profileForm.academic_mark}/4.5</span>
                  )}
                </div>
              ) : (
                <p className="text-sm text-zinc-400">아직 입력하지 않았어요</p>
              )}
            </SectionRow>

            <Separator />

            <SectionRow icon={Briefcase} label="관심 직무">
              {profileForm.job_interests.length ? (
                <div className="flex flex-wrap gap-2">
                  {profileForm.job_interests.map((j) => (
                    <Tag key={j}>{j}</Tag>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-400">아직 선택하지 않았어요</p>
              )}
            </SectionRow>

            <Separator />

            <SectionRow icon={Building2} label="관심 기업">
              {profileForm.company_interests.length ? (
                <div className="flex flex-wrap gap-2">
                  {profileForm.company_interests.map((c) => (
                    <Tag key={c}>{c}</Tag>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-400">아직 선택하지 않았어요</p>
              )}
            </SectionRow>

            <Separator />

            <SectionRow icon={MapPin} label="근무 선호">
              {profileForm.work_regions.length ||
              profileForm.employment_types.length ||
              profileForm.willing_to_relocate ? (
                <div className="flex flex-wrap gap-2">
                  {profileForm.work_regions.map((r) => (
                    <Tag key={r}>{r}</Tag>
                  ))}
                  {profileForm.employment_types.map((t) => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                  {profileForm.willing_to_relocate && <Tag>이주 가능</Tag>}
                </div>
              ) : (
                <p className="text-sm text-zinc-400">아직 입력하지 않았어요</p>
              )}
            </SectionRow>
          </>
        )}
      </Card>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-900">완료한 시뮬레이션</h2>
        {history === null ? (
          <Skeleton className="mt-4 h-24 w-full" />
        ) : history.length === 0 ? (
          <Card className="mt-4 p-6 text-center text-sm text-zinc-400">
            <FileText className="mx-auto h-8 w-8 opacity-40" />
            <p className="mt-2">아직 완료한 시뮬레이션이 없어요.</p>
            <Link to="/simulations" className="mt-3 inline-block text-sm text-zinc-600 underline">
              추천 시뮬레이션 보러 가기
            </Link>
          </Card>
        ) : (
          <ul className="mt-4 space-y-2">
            {history.map((h) => (
              <li key={h.submissionId}>
                <Card className="flex items-center gap-3 p-4">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-zinc-400" />
                  <div>
                    <p className="font-medium text-zinc-900">{h.title}</p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {h.companyName}
                      {h.submittedAt &&
                        ` · ${new Date(h.submittedAt).toLocaleDateString("ko-KR")}`}
                    </p>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
