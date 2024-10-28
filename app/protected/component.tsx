"use client";
import type { Room } from "@/database/schema";
import { createClient } from "@/utils/supabase/client";
import { RealtimeChannel, User } from "@supabase/supabase-js";
import { redirect, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { addUserToChannel, createRoom } from "./actions";
import { SubmitButton } from "@/components/submit-button";

export default function Chat({ rooms }: { rooms: Room[] }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [users, setUsers] = useState<Set<string>>(new Set());
  const [selectedRoom, setSelectedRoom] = useState<Room["topic"] | undefined>();
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const addMessage = async (
    mine: boolean,
    system: boolean,
    message: string
  ) => {
    const bubble = document.createElement("div");
    const is_self_classes = mine
      ? ["bg-green-600", "self-end"]
      : ["bg-blue-600", "self-start"];
    const is_system_classes = system
      ? ["bg-stone-500", "self-center", "italic", "text-center"]
      : [];
    const style = [
      "flex",
      "gap-2",
      "items-center",
      "rounded-xl",
      "text-white",
      "text-bold",
      "w-2/3",
      "p-2",
    ]
      .concat(is_self_classes)
      .concat(is_system_classes);
    bubble.classList.add(...style);
    bubble.innerHTML = message;
    document.getElementById("chat")!.appendChild(bubble);
  };

  useEffect(() => {
    supabase.auth
      .getUser()
      .then((user) => setUser(user.data.user))
      .then(async () => {
        await supabase.auth.getUser();
        const token = (await supabase.auth.getSession()).data.session
          ?.access_token!;
        supabase.realtime.setAuth(token);
        supabase
          .channel("supaslack")
          .on("broadcast", { event: "new_room" }, () => router.refresh())
          .on("broadcast", { event: "new_room" }, () => router.refresh())
          .subscribe();
      })
      .then(() => {
        setLoading(false);
      });
  }, [supabase]);

  useEffect(() => {
    if (document.getElementById("chat")) {
      document.getElementById("chat")!.innerHTML = "";
    }

    if (selectedRoom) {
      channel?.unsubscribe();
      setUsers(new Set());

      let newChannel = supabase.channel(selectedRoom, {
        config: {
          broadcast: { self: true },
          private: true, // This line will tell the server that you want to use a private channel for this connection
        },
      });

      newChannel
        .on("broadcast", { event: "message" }, ({ payload: payload }) =>
          addMessage(payload.user_id == user?.id, false, payload.message)
        )
        .on("presence", { event: "join" }, ({ newPresences }) => {
          newPresences.map(({ email }) => users.add(email));
          setUsers(new Set(users));
        })
        .on("presence", { event: "leave" }, ({ leftPresences }) => {
          leftPresences.map(({ email }) => users.delete(email));
          setUsers(new Set(users));
        })
        .subscribe((status, err) => {
          console.log(status, err);
          setLoading(false);

          if (status == "SUBSCRIBED") {
            setChannel(newChannel);
            newChannel.track({ email: user?.email });
            setError(null);
          }
          if (status == "CLOSED") {
            setChannel(null);
          }
          if (status == "CHANNEL_ERROR") {
            setError(err?.message || null);
          }
        });
    }
  }, [selectedRoom]);

  return (
    <div className="flex w-full h-full p-10">
      {loading && (
        <div className="fixed top-0 left-0 right-0 flex flex-col h-full w-full justify-center items-center align-middle gap-2 z-10 bg-[#000000CC]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-foreground"></div>
        </div>
      )}
      {showModal ? <CreateRoomModal /> : ""}
      <div className="flex w-full h-full gap-4">
        <div className="grow-0 flex flex-col gap-2 w-[20rem] overflow-hidden">
          <div className="bg-white h-full rounded-sm text-slate-900">
            <div className="flex flex-col">
              <div className="p-2 font-semibold bg-stone-100 w-full text-center">
                Rooms
              </div>
              {rooms?.map((room: Room) => {
                return (
                  <button
                    key={room.id}
                    onClick={() => {
                      setSelectedRoom(room.topic);
                    }}
                    className={
                      selectedRoom == room.topic
                        ? "bg-green-600 rounded-sm pointer p-2 text-white text-left"
                        : "rounded-sm cursor-pointer hover:bg-green-100 p-2 text-black text-left"
                    }
                  >
                    #{room.topic}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="bg-white h-full rounded-sm text-slate-900">
            <div className="p-2 font-semibold bg-stone-100 w-full text-center">
              Users in Room
            </div>
            <div className="flex flex-col gap-2 p-2">
              {Array.from(users)?.map((email: string) => {
                return <div key={email}>{email}</div>;
              })}
            </div>
          </div>
          <button
            className="border border-foreground/20 rounded-md px-4 py-2 text-foreground"
            onClick={() => setShowModal(!showModal)}
          >
            Create Room
          </button>
        </div>
        <div className="grow flex flex-col gap-2">
          {error ? (
            <div className="bg-white h-full rounded-md text-slate-900 p-1 flex justify-center items-center">
              <h1 className="text-xl font-bold">
                You do not have access to this room
              </h1>
            </div>
          ) : (
            <div
              className="bg-white h-full rounded-md text-slate-900 p-1 flex flex-col gap-2"
              id="chat"
            />
          )}

          <form
            className="flex text-foreground w-full gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const target = form.elements[0] as HTMLInputElement;
              const message = target.value;

              if (message.startsWith("/invite") && selectedRoom) {
                const email = message.replace("/invite ", "");
                const result = await addUserToChannel(selectedRoom, email);
                addMessage(true, true, result);
              } else {
                channel?.send({
                  type: "broadcast",
                  event: "message",
                  payload: { message, user_id: user?.id },
                });
              }

              target.value = "";
            }}
          >
            <label className="hidden" htmlFor="message" />
            <input
              name="message"
              className="grow rounded-md text-black p-2"
              placeholder="Insert your message"
              disabled={!channel}
            ></input>
            <button
              type="submit"
              className="border border-foreground/20 rounded-md px-4 py-2 text-foreground"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function CreateRoomModal() {
  const close = () => {
    redirect(`/protected`);
  };

  return (
    <div className="fixed top-0 left-0 right-0 flex flex-col h-full w-full justify-center items-center align-middle gap-2 z-10 bg-[#000000EE]">
      <form className="flex flex-col sm:max-w-md gap-2 text-foreground bg-background rounded-md p-4">
        <label className="text-lg font-semibold" htmlFor="email">
          Create a Room
        </label>
        <input
          className="rounded-md px-4 py-2 bg-inherit border mb-6"
          name="topic"
          placeholder="room_1"
        />
        <div className="flex justify-between gap-4">
          <SubmitButton
            formAction={async (formData) => {
              await createRoom(formData);
              close();
            }}
            className="border border-foreground/20 rounded-md px-4 py-2 text-foreground mb-2 w-[10rem]"
            pendingText="Creating"
          >
            Create Room
          </SubmitButton>
          <SubmitButton
            formAction={close}
            className="border border-foreground/20 rounded-md px-4 py-2 text-foreground mb-2 w-[10rem]"
            pendingText="Closing"
          >
            Close
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
