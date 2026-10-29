import { AppError } from "../middleware/errors.js";

export const USER_TYPES = ["Parent", "Student", "School"];
export const CATEGORIES = ["Scholarship", "Concert", "Admission", "General Query"];
export const STATUSES = ["New", "In Progress", "Resolved", "Rejected"];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[+()\d.\-\s]{7,25}$/;

export function validateInquiry(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new AppError(400, "Please provide valid inquiry details");
  }

  const inquiry = {
    name: typeof input.name === "string" ? input.name.trim() : "",
    email: typeof input.email === "string" ? input.email.trim().toLowerCase() : "",
    phone: typeof input.phone === "string" ? input.phone.trim() : "",
    userType: typeof input.userType === "string" ? input.userType : "",
    category: typeof input.category === "string" ? input.category : "",
    message: typeof input.message === "string" ? input.message.trim() : "",
  };

  const errors = {};
  if (inquiry.name.length < 2 || inquiry.name.length > 120) {
    errors.name = "Name must be between 2 and 120 characters";
  }
  if (inquiry.email.length > 255 || !emailPattern.test(inquiry.email)) {
    errors.email = "Enter a valid email address";
  }
  if (!phonePattern.test(inquiry.phone) || !/\d/.test(inquiry.phone)) {
    errors.phone = "Enter a valid phone number";
  }
  if (!USER_TYPES.includes(inquiry.userType)) {
    errors.userType = "Select a valid user type";
  }
  if (!CATEGORIES.includes(inquiry.category)) {
    errors.category = "Select a valid category";
  }
  if (inquiry.message.length < 10 || inquiry.message.length > 5000) {
    errors.message = "Message must be between 10 and 5,000 characters";
  }

  if (Object.keys(errors).length) {
    throw new AppError(400, "Please correct the highlighted fields", "VALIDATION_ERROR");
  }

  return inquiry;
}

export function validateStatus(value) {
  if (!STATUSES.includes(value)) {
    throw new AppError(400, "Select a valid inquiry status");
  }
  return value;
}
