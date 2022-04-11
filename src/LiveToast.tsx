export default function LiveToast({
  channel,
  addStream,
  dismiss,
}: {
  channel: string;
  addStream: () => void;
  dismiss: () => void;
}) {
  return (
    <div className="bg-slate-900 font-white border border-slate-500 rounded-md flex">
      <div className="w-4/5 p-2 my-auto">{channel} just went live!</div>
      <div className="flex-col border-l border-slate-500">
        <div className="">
          <button
            onClick={addStream}
            className="p-1 w-full h-full flex justify-center items-center"
          >
            Add
          </button>
        </div>
        <div className="border-t border-slate-500">
          <button
            onClick={dismiss}
            className="p-1 w-full h-full flex justify-center items-center"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
