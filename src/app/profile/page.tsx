import { ProfileView } from '@/components/feature/profile/ProfileView';
import { getMyProfile } from '@/server/profile/actions';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Profile — WhatToEat' };

/**
 * Profile view page — Server Component.
 * Redirects to /onboarding when no profile exists yet.
 */
export default async function ProfilePage() {
  const profile = await getMyProfile();
  if (!profile) redirect('/onboarding');

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <ProfileView profile={profile} />
    </main>
  );
}
