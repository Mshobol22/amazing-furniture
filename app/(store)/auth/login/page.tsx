import { Suspense } from "react";
import LoginForm from "./LoginForm";

function LoginFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAF8F5]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-walnut border-t-transparent" />
    </div>
  );
}

export default function AuthLoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
