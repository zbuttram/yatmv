import { Dispatch, SetStateAction } from "react";
import { Modal, ModalProps } from "./Modal";
import { Settings } from "./useSettings";

export function SettingsModal({
  isOpen,
  close,
  settings,
  setSettings,
}: ModalProps & {
  settings: Settings;
  setSettings: Dispatch<SetStateAction<Settings>>;
}) {
  function updateSettingFunc(name: keyof Settings) {
    return (value) => setSettings((state) => ({ ...state, [name]: value }));
  }

  return (
    <Modal isOpen={isOpen} close={close} className="p-8 w-fit h-fit">
      <h3 className="text-2xl font-semibold mb-5 underline">Settings</h3>
      <table className="table-auto">
        <Setting
          name="Boost Mode"
          description="When enabled, forces primary streams into highest quality."
          control={
            <RadioToggle
              id="boost-mode-toggle"
              state={settings.boostMode}
              update={updateSettingFunc("boostMode")}
            />
          }
        />
        <Setting
          name="Pause Hidden Players"
          description="Automatically pauses players that are below the viewport after a time. They will unpause on scroll."
          control={
            <RadioToggle
              id="pause-hidden-players"
              state={settings.pauseHiddenPlayers}
              update={updateSettingFunc("pauseHiddenPlayers")}
            />
          }
        />
      </table>
    </Modal>
  );
}

function Setting({ name, description, control }) {
  return (
    <tr>
      <td className="pr-5">{control}</td>
      <td className="pb-3">
        <div className="">{name}</div>
        <div className="text-gray-400">{description}</div>
      </td>
    </tr>
  );
}

function RadioToggle({
  state,
  id,
  update,
}: {
  state: boolean;
  id: string;
  update: (newState: boolean) => void;
}) {
  return (
    <div className="flex">
      <div className="mr-4">
        <input
          className="mr-1 cursor-pointer"
          type="radio"
          id={id + "-on"}
          checked={state}
          onChange={() => update(true)}
        />
        <label className="cursor-pointer" htmlFor={id + "-on"}>
          On
        </label>
      </div>
      <div>
        <input
          className="mr-1 cursor-pointer"
          type="radio"
          id={id + "-off"}
          checked={!state}
          onChange={() => update(false)}
        />
        <label className="cursor-pointer" htmlFor={id + "-off"}>
          Off
        </label>
      </div>
    </div>
  );
}
