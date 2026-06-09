import Link from 'next/link';
import { Lock, BookOpen, ArrowRight } from 'lucide-react';
import { notFound } from 'next/navigation';
import { LESSONS } from '@/lib/angol-unlocks';

interface AngolPageProps {
  params: { locale: string };
}

export default function AngolPage({ params }: AngolPageProps) {
  const { locale } = params;

  if (locale !== 'hu') {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <header className="premium-card angol-surface p-4 sm:p-6 md:p-8">
        <Link
          href={`/${locale}`}
          className="mb-4 inline-flex text-sm text-muted-foreground transition-colors hover:text-slate-300"
        >
          ← Vissza
        </Link>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Focused Learning</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-cream">Kreatív Angol</h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          Kezdő angol nyelvtanulás — szólap, nyelvtan, gyakorlás és vizsga
        </p>
      </header>

      <div className="grid gap-4">
        {LESSONS.map((lesson) => {
          const isActive = lesson.id === 1;
          const isLocked = lesson.id > 1;

          if (isActive) {
            return (
              <Link
                key={lesson.id}
                href={`/${locale}/modules/angol/lecke/${lesson.id}`}
                className="group premium-card-hover angol-surface flex items-center gap-5 p-6"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-700/40 text-slate-200 shadow-card">
                  <BookOpen size={26} />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-cream group-hover:text-slate-200">
                    {lesson.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">{lesson.subtitle}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-slate-200" />
              </Link>
            );
          }

          return (
            <div
              key={lesson.id}
              className="flex items-center gap-5 rounded-2xl border border-border/30 bg-card/30 p-6 opacity-40"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/40 text-muted-foreground">
                <Lock size={22} />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-muted-foreground">{lesson.title}</h2>
                <p className="text-sm text-muted-foreground/70">{lesson.subtitle}</p>
              </div>
              <span className="rounded-full border border-border/50 px-3 py-1 text-xs text-muted-foreground">
                Zárolt
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}