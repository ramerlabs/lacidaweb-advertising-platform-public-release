import { isPlatformLicensed } from "@/lib/license";
import { LicenseLockedPage } from "@/components/license-locked";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  if (!(await isPlatformLicensed())) {
    return (
      <main className="min-h-screen bg-background">
        <LicenseLockedPage description="Onboarding is locked until a platform license is activated." />
      </main>
    );
  }
  return children;
}
