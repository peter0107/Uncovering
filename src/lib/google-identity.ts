type GoogleCredentialResponse = {
  credential: string;
};

type GooglePromptMomentNotification = {
  isNotDisplayed(): boolean;
  isSkippedMoment(): boolean;
};

export type GoogleIdentity = {
  accounts: {
    id: {
      initialize(options: {
        client_id: string;
        callback(response: GoogleCredentialResponse): void;
        nonce?: string;
        auto_select?: boolean;
        use_fedcm_for_prompt?: boolean;
      }): void;
      prompt(
        callback?: (notification: GooglePromptMomentNotification) => void,
      ): void;
      disableAutoSelect(): void;
      renderButton(
        parent: HTMLElement,
        options: {
          type?: "standard" | "icon";
          theme?: "outline" | "filled_blue" | "filled_black";
          size?: "large" | "medium" | "small";
          shape?: "rectangular" | "pill" | "circle" | "square";
          text?: "signin_with" | "signup_with" | "continue_with";
          width?: number;
          logo_alignment?: "left" | "center";
        },
      ): void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

const GOOGLE_IDENTITY_SCRIPT = "https://accounts.google.com/gsi/client";
let googleIdentityPromise: Promise<GoogleIdentity> | null = null;

export function loadGoogleIdentity(): Promise<GoogleIdentity> {
  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google);
  }

  if (googleIdentityPromise) {
    return googleIdentityPromise;
  }

  googleIdentityPromise = new Promise((resolve, reject) => {
    const finish = () => {
      if (window.google?.accounts?.id) {
        resolve(window.google);
      } else {
        googleIdentityPromise = null;
        reject(new Error("Google Identity Services를 초기화하지 못했습니다."));
      }
    };

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_IDENTITY_SCRIPT}"]`,
    );

    if (existing) {
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener(
        "error",
        () => {
          googleIdentityPromise = null;
          reject(new Error("Google 로그인 스크립트를 불러오지 못했습니다."));
        },
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_IDENTITY_SCRIPT;
    script.async = true;
    script.onload = finish;
    script.onerror = () => {
      googleIdentityPromise = null;
      reject(new Error("Google 로그인 스크립트를 불러오지 못했습니다."));
    };
    document.head.appendChild(script);
  });

  return googleIdentityPromise;
}

export function createGoogleNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export async function hashGoogleNonce(nonce: string) {
  const bytes = new TextEncoder().encode(nonce);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
