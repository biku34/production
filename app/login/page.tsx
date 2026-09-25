import { Suspense } from "react";
import LoginClient from "./LoginClient";

export const metadata = { title: "Sign in — Fabric Plant Production" };

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginClient />
    </Suspense>
  );
}
