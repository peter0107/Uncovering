import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ChangeEvent, type ReactElement } from "react";
import { Camera, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
  DiscoveryConsentFields,
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

type SectionKey = "education" | "jobInterests" | "companyInterests" | "workPreference" | "discovery";

type ProfileFieldsProps = {
  data: ProfileFormData;
  setData: (d: Partial<ProfileFormData>) => void;
};

const PROFILE_SECTIONS: {
  key: SectionKey;
  label: string;
  fields: (keyof ProfileFormData)[];
  Component: (props: ProfileFieldsProps) => ReactElement;
  summary: (d: ProfileFormData) => string;
}[] = [
  {
    key: "education",
    label: "학력",
    fields: ["education_level", "majors", "academic_mark"],
    Component: EducationFields,
    summary: (d) => {
      const parts = [d.education_level, d.majors.join(", ")].filter(Boolean);
      if (d.academic_mark) parts.push(`학점 ${d.academic_mark}/4.5`);
      return parts.length ? parts.join(" · ") : "아직 입력하지 않았어요";
    },
  },
  {
    key: "jobInterests",
    label: "관심 직무",
    fields: ["job_interests"],
    Component: JobInterestFields,
    summary: (d) => (d.job_interests.length ? d.job_interests.join(", ") : "아직 선택하지 않았어요"),
  },
  {
    key: "companyInterests",
    label: "관심 기업",
    fields: ["company_interests"],
    Component: CompanyInterestFields,
    summary: (d) =>
      d.company_interests.length ? d.company_interests.join(", ") : "아직 선택하지 않았어요",
  },
  {
    key: "workPreference",
    label: "근무 선호",
    fields: ["work_regions", "employment_types", "willing_to_relocate"],
    Component: WorkPreferenceFields,
    summary: (d) => {
      const parts = [d.work_regions.join(", "), d.employment_types.join(", ")].filter(Boolean);
      if (d.willing_to_relocate) parts.push("이주 가능");
      return parts.length ? parts.join(" · ") : "아직 입력하지 않았어요";
    },
  },
  {
    key: "discovery",
    label: "Discovery 동의",
    fields: ["discovery_consent"],
    Component: DiscoveryConsentFields,
    summary: (d) => (d.discovery_consent ? "네, 발견되고 싶어요" : "지금은 괜찮아요"),
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

function MyPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [oneLineIntro, setOneLineIntro] = useState("");
  const [links, setLinks] = useState<ExternalLinks>({});
  const [profileForm, setProfileFormRaw] = useState<ProfileFormData>(INITIAL_PROFILE_FORM);
  const [draftForm, setDraftFormRaw] = useState<ProfileFormData>(INITIAL_PROFILE_FORM);
  const [editingAll, setEditingAll] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [history, setHistory] = useState<CompletedSimulation[] | null>(null);
  const [saving, setSaving] = useState(false);

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
      const loadedForm: ProfileFormData = {
        education_level: seeker?.education_level ?? "",
        majors: seeker?.majors ?? [],
        academic_mark: seeker?.academic_mark != null ? String(seeker.academic_mark) : "",
        job_interests: seeker?.job_interests ?? [],
        company_interests: seeker?.company_interests ?? [],
        work_regions: seeker?.work_regions ?? [],
        employment_types: seeker?.employment_types ?? [],
        willing_to_relocate: seeker?.willing_to_relocate ?? false,
        discovery_consent: seeker?.discovery_consent ?? false,
      };
      setProfileFormRaw(loadedForm);
      setDraftFormRaw(loadedForm);

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

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("job_seekers")
      .update({ one_line_intro: oneLineIntro || null, external_links: links })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("저장 중 오류가 발생했어요.");
      return;
    }
    toast.success("저장됐어요.");
  };

  const startEditAll = () => {
    setDraftFormRaw(profileForm);
    setEditingAll(true);
  };

  const cancelEditAll = () => {
    setEditingAll(false);
  };

  const saveAll = async () => {
    if (!user) return;

    setSavingAll(true);
    const patch: TablesUpdate<"job_seekers"> = {};
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold text-zinc-900">프로필</h1>

      <Card className="mt-6 p-6">
        <div className="flex items-center gap-4">
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
          <p className="text-sm text-zinc-500">
            {uploadingAvatar ? "업로드 중..." : "프로필 사진을 등록해보세요"}
          </p>
        </div>

        <div className="mt-6">
          <Label htmlFor="intro">한줄소개</Label>
          <Input
            id="intro"
            value={oneLineIntro}
            onChange={(e) => setOneLineIntro(e.target.value)}
            placeholder="나를 한 줄로 소개해보세요"
            maxLength={100}
            className="mt-2"
          />
        </div>

        <div className="mt-6 grid gap-3">
          <div>
            <Label htmlFor="github">GitHub</Label>
            <Input
              id="github"
              value={links.github ?? ""}
              onChange={(e) => setLinks((prev) => ({ ...prev, github: e.target.value }))}
              placeholder="https://github.com/..."
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="portfolio">포트폴리오</Label>
            <Input
              id="portfolio"
              value={links.portfolio ?? ""}
              onChange={(e) => setLinks((prev) => ({ ...prev, portfolio: e.target.value }))}
              placeholder="https://..."
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="linkedin">LinkedIn</Label>
            <Input
              id="linkedin"
              value={links.linkedin ?? ""}
              onChange={(e) => setLinks((prev) => ({ ...prev, linkedin: e.target.value }))}
              placeholder="https://linkedin.com/in/..."
              className="mt-2"
            />
          </div>
        </div>
      </Card>

      <Button
        onClick={saveProfile}
        disabled={saving}
        className="mt-6 rounded-xl bg-zinc-900 text-white hover:bg-zinc-700"
      >
        {saving ? "저장 중..." : "저장"}
      </Button>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-900">온보딩 답변</h2>
        {PROFILE_SECTIONS.map((section) => (
          <Card key={section.key} className="mt-4 p-6">
            {editingAll ? (
              <section.Component data={draftForm} setData={setDraftForm} />
            ) : (
              <div>
                <p className="text-sm font-semibold text-zinc-700">{section.label}</p>
                <p className="mt-1 text-sm text-zinc-500">{section.summary(profileForm)}</p>
              </div>
            )}
          </Card>
        ))}

        <div className="mt-4 flex gap-2">
          {editingAll ? (
            <>
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
            </>
          ) : (
            <Button variant="outline" onClick={startEditAll} className="rounded-xl">
              전체수정
            </Button>
          )}
        </div>
      </div>

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
                <Card className="flex items-center justify-between p-4">
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
