import { Suspense } from "react";
import SignupForm from "./SignupForm";

function SignupFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#1C1C1C]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-walnut border-t-transparent" />
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-[#1C1C1C]">
      <Suspense fallback={<SignupFallback />}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
