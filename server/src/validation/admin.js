import { AppError } from "../middleware/errors.js";

export function validateLogin(input) {
  const email = typeof input?.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input?.password === "string" ? input.password : "";

  if (!email || email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError(400, "Enter a valid email and password");
  }
  if (password.length < 1 || password.length > 128) {
    throw new AppError(400, "Enter a valid email and password");
  }
  return { email, password };
}
