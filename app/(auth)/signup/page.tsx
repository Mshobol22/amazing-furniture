import { Suspense } from "react";
import SignupForm from "./SignupForm";

function SignupFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-walnut border-t-transparent" />
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupFallback />}>
      <SignupForm />
    </Suspense>
  );
}
