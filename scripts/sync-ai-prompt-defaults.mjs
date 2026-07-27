import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(currentDirectory, "..");
const envPath = path.join(repositoryRoot, ".env.local");
const defaultsPath = path.join(repositoryRoot, "src/lib/ai-prompt.defaults.ts");

const promptConstants = {
  company_simulation_result_review: "DEFAULT_COMPANY_SIMULATION_RESULT_PROMPT",
  company_ai_utilization_review: "DEFAULT_COMPANY_AI_UTILIZATION_PROMPT",
  company_interview_question_recommendation: "DEFAULT_COMPANY_INTERVIEW_QUESTIONS_PROMPT",
  company_simulation_assistant: "DEFAULT_COMPANY_SIMULATION_ASSISTANT_PROMPT",
  simulation_generator_draft: "DEFAULT_SIMULATION_GENERATOR_PROMPT",
};

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(".env.local 파일을 찾을 수 없습니다.");
  }

  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        const key = line.slice(0, separatorIndex);
        const value = line.slice(separatorIndex + 1).replace(/^['\"]|['\"]$/g, "");
        return [key, value];
      }),
  );
}

function asTemplateLiteral(value) {
  return `\`${value.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${")}\``;
}

const env = loadEnvFile(envPath);
const supabaseUrl = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(".env.local에 SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const promptKeys = Object.keys(promptConstants);
const { data, error } = await supabase
  .from("ai_prompt_settings")
  .select("key,prompt")
  .in("key", promptKeys);

if (error) {
  throw new Error(`AI 프롬프트를 불러오지 못했습니다: ${error.message}`);
}

const promptsByKey = new Map((data ?? []).map((item) => [item.key, item.prompt]));
const missingKeys = promptKeys.filter((key) => {
  const prompt = promptsByKey.get(key);
  return typeof prompt !== "string" || !prompt.trim();
});

if (missingKeys.length > 0) {
  throw new Error(`비어 있거나 없는 프롬프트: ${missingKeys.join(", ")}`);
}

let defaultsSource = fs.readFileSync(defaultsPath, "utf8");

for (const [key, constantName] of Object.entries(promptConstants)) {
  const prompt = promptsByKey.get(key);
  const declaration = new RegExp("(export const " + constantName + " = )`[\\s\\S]*?`;");

  if (!declaration.test(defaultsSource)) {
    throw new Error(`${constantName} 기본값 선언을 찾지 못했습니다.`);
  }

  defaultsSource = defaultsSource.replace(declaration, `$1${asTemplateLiteral(prompt)};`);
}

fs.writeFileSync(defaultsPath, defaultsSource);
console.log(`Synced ${promptKeys.length} AI prompt defaults from ai_prompt_settings.`);
