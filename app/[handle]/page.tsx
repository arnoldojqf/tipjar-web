import { notFound } from 'next/navigation';
import { TipPage } from '../components/TipPage';
import { HANDLE_MAP } from '../config/handles';

interface HandlePageProps {
  params: Promise<{ handle: string }>;
}

export default async function HandlePage({ params }: HandlePageProps) {
  // 👇 aqui resolvemos o Promise
  const { handle } = await params;

  const key = handle.toLowerCase();
  const to = HANDLE_MAP[key];

  if (!to) {
    return notFound();
  }

  return <TipPage initialTo={to} initialHandle={key} />;
}