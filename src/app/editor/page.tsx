import { Toaster } from 'sonner';

import { PlateEditor } from '@/components/plate-editor';

export default function Page() {
  return (
    <div className="h-screen">
      <PlateEditor />

      <Toaster />
    </div>
  );
}
