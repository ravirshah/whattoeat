import { ProfileForm } from '@/components/feature/profile/ProfileForm';
import { getMyProfile } from '@/server/profile/actions';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Edit Profile — WhatToEat' };

/**
 * Profile edit page — Server Component.
 * Fetches the current profile server-side; redirects to /onboarding if none
 * exists so the user completes the full onboarding flow instead of partial edit.
 */
export default async function ProfileEditPage() {
  const profile = await getMyProfile();
  if (!profile) redirect('/onboarding');

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-text">Edit Profile</h1>
        <p className="mt-1 text-sm text-text-muted">
          Update your body stats and preferences to refine your macro targets.
        </p>
      </div>
      <ProfileForm profile={profile} />
    </main>
  );
}
