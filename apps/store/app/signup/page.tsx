import type { Metadata } from "next";
import { AuthPage } from "@/components/auth-page";
import { getLocale } from "@/lib/i18n";
import { metaMsgs } from "@/messages/meta";

export async function generateMetadata(): Promise<Metadata> {
  return { title: metaMsgs[await getLocale()].signup };
}

export default async function SignUpPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { next } = await searchParams;
  return <AuthPage mode="signup" next={next} />;
}
