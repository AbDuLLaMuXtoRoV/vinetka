import type { Metadata } from "next";
import { AuthPage } from "@shop/components/auth-page";
import { getLocale } from "@shop/lib/i18n";
import { metaMsgs } from "@shop/messages/meta";

export async function generateMetadata(): Promise<Metadata> {
  return { title: metaMsgs[await getLocale()].signup };
}

export default async function SignUpPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { next } = await searchParams;
  return <AuthPage mode="signup" next={next} />;
}
