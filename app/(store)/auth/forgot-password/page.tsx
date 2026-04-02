/**
 * resetPasswordForEmail redirectTo (in ForgotPasswordForm) must hit /auth/callback?next=/auth/reset-password
 * so PKCE code exchange runs before the reset-password page loads.
 */
import { Suspense } from "react";
import ForgotPasswordForm from "./ForgotPasswordForm";

function Fallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAF8F5]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-walnut border-t-transparent" />
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
