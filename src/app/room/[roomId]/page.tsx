'use client'
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import type { CollabEditorProps } from '@/components/CollabEditor';


// Dynamic import, typed properly
const CollabEditor = dynamic<CollabEditorProps>(
  () => import('@/components/CollabEditor'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen text-gray-400">
        Loading editor...
      </div>
    ),
  }
);

export default function RoomPage() {
  const params = useParams();
  const roomId = Array.isArray(params?.roomId) ? params.roomId[0] : params?.roomId ?? '';

  if (!roomId) {
    return <div className="text-gray-400">Loading room...</div>;
  }

  return <CollabEditor roomId={roomId} />;
}
