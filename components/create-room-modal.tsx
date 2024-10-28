"use client";

import { redirect } from "next/navigation";
import { SubmitButton } from "./submit-button";
import { createRoom } from "./create-room.action";

export default function CreateRoomModal() {
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
