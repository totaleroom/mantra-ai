import { useState } from "react";
import InboxSidebar from "@/components/admin/InboxSidebar";
import InboxChat from "@/components/admin/InboxChat";
import { MessageSquare } from "lucide-react";

interface SelectedConvo {
  id: string;
  customer_name: string | null;
  customer_phone: string;
  handled_by: string;
}

export default function Inbox() {
  const [selected, setSelected] = useState<SelectedConvo | null>(null);

  return (
    <div className="-m-6 flex h-[calc(100vh-3.5rem)]">
      {/* Sidebar: conversation list */}
      <div className="w-80 flex-shrink-0">
        <InboxSidebar
          selectedConvoId={selected?.id || null}
          onSelectConvo={(convo) =>
            setSelected({
              id: convo.id,
              customer_name: convo.customer_name,
              customer_phone: convo.customer_phone,
              handled_by: convo.handled_by,
            })
          }
        />
      </div>

      {/* Chat panel */}
      <div className="flex-1 flex flex-col">
        {selected ? (
          <InboxChat
            conversationId={selected.id}
            customerName={selected.customer_name}
            customerPhone={selected.customer_phone}
            handledBy={selected.handled_by}
            onHandledByChange={(newValue) =>
              setSelected((prev) => prev ? { ...prev, handled_by: newValue } : null)
            }
          />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="mx-auto h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">Pilih percakapan untuk memulai</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
