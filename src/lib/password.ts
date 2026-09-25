const MIN_LENGTH = 8;

/**
 * Password policy: at least 8 characters, at least one letter and one number.
 */
export function validatePassword(password: string): {
  ok: boolean;
  message?: string;
} {
  if (!password || password.length < MIN_LENGTH) {
    return {
      ok: false,
      message: `পাসওয়ার্ড কমপক্ষে ${MIN_LENGTH} অক্ষরের হতে হবে।`,
    };
  }

  if (!/[a-zA-Z debu]/.test(password)) {
    return {
      ok: false,
      message: "পাসওয়ার্ডে কমপক্ষে একটি অক্ষর থাকতে হবে।",
    };
  }

  if (!/[0-9০-৯]/.test(password)) {
    return {
      ok: false,
      message: "পাসওয়ার্ডে কমপক্ষে একটি সংখ্যা থাকতে হবে।",
    };
  }

  return { ok: true };
}

export const PASSWORD_MIN_LENGTH = MIN_LENGTH;
