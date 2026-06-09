import Link from 'next/link';
import { Lock, BookOpen } from 'lucide-react';
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
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <header className="space-y-2">
        <Link
          href={`/${locale}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Vissza
        </Link>
        <h1 className="font-display text-3xl font-bold text-primary">
          Kreatív Angol
        </h1>
        <p className="text-muted-foreground">
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
                className="group flex items-center gap-4 rounded-xl border border-primary/40 bg-card p-5 transition-colors hover:border-primary hover:bg-primary/5"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <BookOpen size={24} />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold group-hover:text-primary">
                    {lesson.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">{lesson.subtitle}</p>
                </div>
                <span className="text-primary">→</span>
              </Link>
            );
          }

          return (
            <div
              key={lesson.id}
              className="flex items-center gap-4 rounded-xl border border-border bg-card/50 p-5 opacity-50"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Lock size={20} />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-muted-foreground">
                  {lesson.title}
                </h2>
                <p className="text-sm text-muted-foreground">{lesson.subtitle}</p>
              </div>
              <span className="text-xs text-muted-foreground">Zárolt</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}