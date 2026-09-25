const MIN_LENGTH = 8;

/**
 * Password policy: at least 8 characters, at least one letter and one number.
 * Accepts Latin and Bengali letters/digits.
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

  // Latin a-z/A-Z or Bengali letters
  if (!/[a-zA-Z\u0980-\u09FF]/.test(password)) {
    return {
      ok: false,
      message: "পাসওয়ার্ডে কমপক্ষে একটি অক্ষর থাকতে হবে।",
    };
  }

  // Western or Bengali digits
  if (!/[0-9\u09E6-\u09EF]/.test(password)) {
    return {
      ok: false,
      message: "পাসওয়ার্ডে কমপক্ষে একটি সংখ্যা থাকতে হবে।",
    };
  }

  return { ok: true };
}

export const PASSWORD_MIN_LENGTH = MIN_LENGTH;
