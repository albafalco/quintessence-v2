import { notFound } from 'next/navigation';

// Unknown URLs inside a locale render the localized not-found page instead of
// Next.js' default unstyled English 404.
export default function CatchAllPage() {
  notFound();
}
