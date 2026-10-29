import Image from "next/image";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

// Placeholder home (TASK-010). Real home page comes in TASK-012.
export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = await getDictionary(locale);
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-6 px-4 text-center">
      <h1>
        <Image src="/logo.svg" alt="The Crush Guy" width={320} height={42} priority />
      </h1>
      <p className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t.home.tagline}</p>
      <p className="text-base text-muted">{t.home.status}</p>
    </main>
  );
}
